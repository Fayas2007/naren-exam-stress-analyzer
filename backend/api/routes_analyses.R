# backend/api/routes_analyses.R
# Statistical Analysis Endpoints (Create, List, Get, Delete, Report Export)

#* Run statistical analysis on a validated dataset
#* @post /
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  body <- get_request_body(req)
  dataset_id <- body$dataset_id
  title <- if (!is.null(body$title) && nzchar(body$title)) body$title else "Exam Stress Analysis"
  column_mappings <- body$column_mappings
  missing_handling <- if (!is.null(body$missing_handling_method)) body$missing_handling_method else "exclude_incomplete_records"
  scoring_method <- if (!is.null(body$scoring_method)) body$scoring_method else "standard_numeric_scale"

  if (is.null(dataset_id) || is.null(column_mappings)) {
    res$status <- 400
    return(list(error = "dataset_id and column_mappings are required."))
  }

  d_res <- db_query("SELECT id, original_filename FROM datasets WHERE id = $1 AND user_id = $2", list(dataset_id, user$id))
  if (nrow(d_res) == 0) {
    res$status <- 404
    return(list(error = "Dataset not found or unauthorized."))
  }

  cache_path <- file.path(tempdir(), "exam_stress_uploads", paste0(dataset_id, ".csv"))
  df <- NULL
  if (file.exists(cache_path)) {
    df <- read.csv(cache_path, stringsAsFactors = FALSE, check.names = FALSE)
  } else if (!is.null(body$csv_text)) {
    df <- read.csv(text = body$csv_text, stringsAsFactors = FALSE, check.names = FALSE)
  }

  if (is.null(df)) {
    res$status <- 400
    return(list(error = "Dataset session has expired. Please re-upload your file."))
  }

  tryCatch({
    val_res <- validate_dataset_mapping(df, column_mappings, missing_handling, scoring_method)
    if (!val_res$is_valid) {
      res$status <- 400
      return(list(error = paste(val_res$errors, collapse = "; ")))
    }

    analysis_res <- run_full_analysis(val_res, title = title)

    db_insert <- db_query(
      "INSERT INTO analyses (
        dataset_id, user_id, title, summary, methodology, scoring_rules,
        data_quality_summary, descriptive_stats, stress_distribution,
        correlations, group_comparisons, chart_data,
        statistical_findings, limitations
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, created_at",
      list(
        dataset_id,
        user$id,
        analysis_res$title,
        analysis_res$summary,
        analysis_res$methodology,
        jsonlite::toJSON(analysis_res$scoring_rules, auto_unbox = TRUE),
        jsonlite::toJSON(analysis_res$data_quality_summary, auto_unbox = TRUE),
        jsonlite::toJSON(analysis_res$descriptive_stats, auto_unbox = TRUE),
        jsonlite::toJSON(analysis_res$stress_distribution, auto_unbox = TRUE),
        jsonlite::toJSON(analysis_res$correlations, auto_unbox = FALSE),
        jsonlite::toJSON(analysis_res$group_comparisons, auto_unbox = FALSE),
        jsonlite::toJSON(analysis_res$chart_data, auto_unbox = TRUE),
        jsonlite::toJSON(analysis_res$statistical_findings, auto_unbox = FALSE),
        jsonlite::toJSON(analysis_res$limitations, auto_unbox = FALSE)
      )
    )

    analysis_id <- db_insert$id[1]
    created_at <- db_insert$created_at[1]

    mean_stress <- analysis_res$descriptive_stats$stress_score$mean
    safe_num <- if (is.null(mean_stress) || length(mean_stress) == 0 || is.na(mean_stress[1])) 0.0 else as.numeric(mean_stress[1])
    safe_rows <- if (is.null(val_res$valid_rows) || length(val_res$valid_rows) == 0 || is.na(val_res$valid_rows[1])) 0L else as.integer(val_res$valid_rows[1])

    db_execute(
      "INSERT INTO analysis_metrics (analysis_id, metric_key, metric_name, metric_value, metric_category, sample_size)
       VALUES ($1, 'mean_stress', 'Mean Stress Score', $2, 'descriptive', $3)",
      list(as.character(analysis_id), safe_num, safe_rows)
    )

    db_execute("UPDATE datasets SET status = 'analyzed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", list(as.character(dataset_id)))

    analysis_res$id <- analysis_id
    analysis_res$dataset_id <- dataset_id
    analysis_res$created_at <- created_at

    res$status <- 201
    return(analysis_res)
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("Analysis Calculation Error:", e$message)))
  })
}

#* List user analyses
#* @get /
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  q_search <- req$args$q
  sort_by <- if (!is.null(req$args$sort_by)) req$args$sort_by else "recent"

  order_sql <- if (sort_by == "oldest") "a.created_at ASC" else "a.created_at DESC"

  sql <- paste0(
    "SELECT a.id, a.dataset_id, a.title, a.summary, a.created_at,
            d.original_filename, d.valid_rows, d.total_rows,
            (a.descriptive_stats->'stress_score'->>'mean')::numeric as mean_stress,
            (a.descriptive_stats->'stress_score'->>'standard_deviation')::numeric as sd_stress,
            a.stress_distribution->>'dominant_category' as dominant_category
     FROM analyses a
     JOIN datasets d ON a.dataset_id = d.id
     WHERE a.user_id = $1"
  )

  params <- list(user$id)

  if (!is.null(q_search) && nzchar(trimws(q_search))) {
    sql <- paste0(sql, " AND (a.title ILIKE $2 OR d.original_filename ILIKE $2)")
    params[[2]] <- paste0("%", trimws(q_search), "%")
  }

  sql <- paste0(sql, " ORDER BY ", order_sql)

  results <- db_query(sql, params)

  analyses_list <- list()
  if (nrow(results) > 0) {
    for (i in seq_len(nrow(results))) {
      row <- results[i, ]
      analyses_list[[length(analyses_list) + 1]] <- list(
        id = row$id,
        dataset_id = row$dataset_id,
        title = row$title,
        summary = row$summary,
        original_filename = row$original_filename,
        valid_rows = as.integer(row$valid_rows),
        total_rows = as.integer(row$total_rows),
        mean_stress = if (!is.na(row$mean_stress)) round(as.numeric(row$mean_stress), 2) else NULL,
        sd_stress = if (!is.na(row$sd_stress)) round(as.numeric(row$sd_stress), 2) else NULL,
        dominant_category = row$dominant_category,
        created_at = row$created_at
      )
    }
  }

  return(list(
    total_analyses = length(analyses_list),
    analyses = analyses_list
  ))
}

#* Get detailed single analysis
#* @get /<id>
#* @serializer unboxedJSON
function(id, req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  sql <- "SELECT a.*, d.original_filename FROM analyses a JOIN datasets d ON a.dataset_id = d.id WHERE a.id = $1 AND a.user_id = $2"
  result <- db_query(sql, list(id, user$id))

  if (nrow(result) == 0) {
    res$status <- 404
    return(list(error = "Analysis not found or unauthorized access."))
  }

  row <- result[1, ]
  analysis_obj <- list(
    id = row$id,
    dataset_id = row$dataset_id,
    original_filename = row$original_filename,
    title = row$title,
    summary = row$summary,
    methodology = row$methodology,
    scoring_rules = if (is.character(row$scoring_rules)) jsonlite::fromJSON(row$scoring_rules) else row$scoring_rules,
    data_quality_summary = if (is.character(row$data_quality_summary)) jsonlite::fromJSON(row$data_quality_summary) else row$data_quality_summary,
    descriptive_stats = if (is.character(row$descriptive_stats)) jsonlite::fromJSON(row$descriptive_stats) else row$descriptive_stats,
    stress_distribution = if (is.character(row$stress_distribution)) jsonlite::fromJSON(row$stress_distribution) else row$stress_distribution,
    correlations = if (is.character(row$correlations)) jsonlite::fromJSON(row$correlations) else row$correlations,
    group_comparisons = if (is.character(row$group_comparisons)) jsonlite::fromJSON(row$group_comparisons) else row$group_comparisons,
    chart_data = if (is.character(row$chart_data)) jsonlite::fromJSON(row$chart_data) else row$chart_data,
    statistical_findings = if (is.character(row$statistical_findings)) jsonlite::fromJSON(row$statistical_findings) else row$statistical_findings,
    limitations = if (is.character(row$limitations)) jsonlite::fromJSON(row$limitations) else row$limitations,
    created_at = row$created_at
  )

  return(analysis_obj)
}

#* Delete an analysis
#* @delete /<id>
#* @serializer unboxedJSON
function(id, req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  check <- db_query("SELECT dataset_id FROM analyses WHERE id = $1 AND user_id = $2", list(id, user$id))
  if (nrow(check) == 0) {
    res$status <- 404
    return(list(error = "Analysis not found or unauthorized."))
  }

  db_execute("DELETE FROM analyses WHERE id = $1 AND user_id = $2", list(id, user$id))
  return(list(message = "Analysis deleted successfully."))
}

#* Get full generated analytical report
#* @get /<id>/report
#* @serializer unboxedJSON
function(id, req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  sql <- "SELECT a.*, d.original_filename FROM analyses a JOIN datasets d ON a.dataset_id = d.id WHERE a.id = $1 AND a.user_id = $2"
  result <- db_query(sql, list(id, user$id))

  if (nrow(result) == 0) {
    res$status <- 404
    return(list(error = "Analysis not found."))
  }

  row <- result[1, ]
  analysis_obj <- list(
    id = row$id,
    title = row$title,
    summary = row$summary,
    methodology = row$methodology,
    scoring_rules = if (is.character(row$scoring_rules)) jsonlite::fromJSON(row$scoring_rules) else row$scoring_rules,
    data_quality_summary = if (is.character(row$data_quality_summary)) jsonlite::fromJSON(row$data_quality_summary) else row$data_quality_summary,
    descriptive_stats = if (is.character(row$descriptive_stats)) jsonlite::fromJSON(row$descriptive_stats) else row$descriptive_stats,
    stress_distribution = if (is.character(row$stress_distribution)) jsonlite::fromJSON(row$stress_distribution) else row$stress_distribution,
    correlations = if (is.character(row$correlations)) jsonlite::fromJSON(row$correlations) else row$correlations,
    group_comparisons = if (is.character(row$group_comparisons)) jsonlite::fromJSON(row$group_comparisons) else row$group_comparisons,
    statistical_findings = if (is.character(row$statistical_findings)) jsonlite::fromJSON(row$statistical_findings) else row$statistical_findings,
    limitations = if (is.character(row$limitations)) jsonlite::fromJSON(row$limitations) else row$limitations,
    created_at = row$created_at
  )

  md_report <- generate_markdown_report(analysis_obj)
  html_report <- generate_html_report(analysis_obj)

  return(list(
    analysis_id = row$id,
    title = row$title,
    markdown = md_report,
    html = html_report,
    filename = paste0("Exam_Stress_Report_", gsub("[^a-zA-Z0-9]", "_", row$title), ".pdf")
  ))
}
