# backend/api/routes_datasets.R
# Dataset Upload and Validation Endpoints

#* Upload and inspect a CSV dataset
#* @post /upload
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized: Please log in first."))
  }

  body <- get_request_body(req)
  csv_content <- NULL
  original_filename <- "survey_dataset.csv"

  if (!is.null(body$file_base64) && nzchar(body$file_base64)) {
    csv_content <- body$file_base64
  } else if (!is.null(body$file_content) && nzchar(body$file_content)) {
    csv_content <- body$file_content
  } else if (!is.null(body$csv_text)) {
    csv_content <- body$csv_text
  } else if (!is.null(body$file)) {
    upload_file <- body$file
    if (is.list(upload_file) && !is.null(upload_file$value)) {
      csv_content <- upload_file$value
      if (!is.null(upload_file$filename)) original_filename <- upload_file$filename
    } else if (is.character(upload_file) && file.exists(upload_file)) {
      csv_content <- upload_file
    }
  } else if (!is.null(req$postBody) && nzchar(req$postBody)) {
    csv_content <- req$postBody
  }

  if (!is.null(body$filename)) {
    original_filename <- body$filename
  }

  if (is.null(csv_content) || !nzchar(as.character(csv_content))) {
    res$status <- 400
    return(list(error = "No document or dataset file provided."))
  }

  tryCatch({
    parsed <- parse_csv_content(csv_content, original_filename = original_filename)

    db_res <- db_query(
      "INSERT INTO datasets (user_id, filename, original_filename, file_size_bytes, total_rows, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'uploaded', $6)
       RETURNING id, original_filename, file_size_bytes, total_rows, created_at",
      list(
        user$id,
        original_filename,
        original_filename,
        parsed$file_size_bytes,
        parsed$total_rows,
        jsonlite::toJSON(list(columns_count = parsed$total_columns), auto_unbox = TRUE)
      )
    )

    dataset_id <- db_res$id[1]

    for (col_key in names(parsed$columns)) {
      col <- parsed$columns[[col_key]]
      db_execute(
        "INSERT INTO dataset_columns (dataset_id, column_name, mapped_field, data_type, missing_count, sample_values)
         VALUES ($1, $2, $3, $4, $5, $6)",
        list(
          as.character(dataset_id),
          as.character(col$name),
          if (is.null(col$suggested_mapping)) NA else as.character(col$suggested_mapping),
          as.character(col$type),
          as.integer(col$missing_count),
          jsonlite::toJSON(col$sample_values, auto_unbox = FALSE)
        )
      )
    }

    temp_dir <- file.path(tempdir(), "exam_stress_uploads")
    dir.create(temp_dir, showWarnings = FALSE, recursive = TRUE)
    cache_path <- file.path(temp_dir, paste0(dataset_id, ".csv"))
    if (is.data.frame(parsed$data)) {
      write.csv(parsed$data, cache_path, row.names = FALSE)
    }

    res$status <- 201
    return(list(
      dataset_id = dataset_id,
      filename = original_filename,
      total_rows = parsed$total_rows,
      total_columns = parsed$total_columns,
      file_size_bytes = parsed$file_size_bytes,
      columns = parsed$columns,
      preview_rows = parsed$preview_rows
    ))
  }, error = function(e) {
    res$status <- 400
    return(list(error = paste("Upload Error:", e$message)))
  })
}

#* Validate dataset mapping and preview quality scorecard
#* @post /validate
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  body <- get_request_body(req)
  dataset_id <- body$dataset_id
  column_mappings <- body$column_mappings
  missing_handling <- if (!is.null(body$missing_handling_method)) body$missing_handling_method else "exclude_incomplete_records"
  scoring_method <- if (!is.null(body$scoring_method)) body$scoring_method else "standard_numeric_scale"

  if (is.null(dataset_id) || is.null(column_mappings)) {
    res$status <- 400
    return(list(error = "dataset_id and column_mappings are required."))
  }

  d_res <- db_query("SELECT id, original_filename, total_rows FROM datasets WHERE id = $1 AND user_id = $2", list(dataset_id, user$id))
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
    return(list(error = "Dataset data session expired. Please re-upload the CSV file."))
  }

  tryCatch({
    val_res <- validate_dataset_mapping(df, column_mappings, missing_handling, scoring_method)

    safe_int <- function(v, default = 0L) {
      if (is.null(v) || length(v) == 0 || is.na(v[1])) return(as.integer(default))
      return(as.integer(v[1]))
    }

    db_execute(
      "UPDATE datasets SET
        valid_rows = $1,
        excluded_rows = $2,
        duplicate_rows_count = $3,
        scoring_method = $4,
        missing_handling_method = $5,
        status = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7",
      list(
        safe_int(val_res$valid_rows, 0L),
        safe_int(val_res$excluded_rows, as.integer(nrow(df))),
        safe_int(val_res$duplicate_rows, 0L),
        as.character(scoring_method),
        as.character(missing_handling),
        as.character(status_str),
        as.character(dataset_id)
      )
    )

    return(list(
      dataset_id = dataset_id,
      is_valid = val_res$is_valid,
      errors = val_res$errors,
      warnings = val_res$warnings,
      total_rows = val_res$total_rows,
      valid_rows = val_res$valid_rows,
      excluded_rows = val_res$excluded_rows,
      duplicate_rows = val_res$duplicate_rows,
      data_quality_score = val_res$data_quality_score,
      column_quality = val_res$column_quality,
      stress_range = val_res$stress_range,
      scoring_method = scoring_method,
      missing_handling_method = missing_handling
    ))
  }, error = function(e) {
    res$status <- 400
    return(list(error = paste("Validation Error:", e$message)))
  })
}
