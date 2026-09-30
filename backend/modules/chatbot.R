# backend/modules/chatbot.R
# AI Chatbot Module (Exam Stress Assistant) powered by Google Gemini REST API

source("modules/config.R", local = TRUE)
source("modules/db.R", local = TRUE)

safe_parse_json_list <- function(val) {
  if (is.null(val)) return(list())
  if (is.list(val) && !is.data.frame(val)) return(val)
  str_val <- as.character(val)[1]
  if (is.na(str_val) || !nzchar(trimws(str_val))) return(list())
  parsed <- tryCatch(
    jsonlite::fromJSON(str_val, simplifyVector = FALSE, simplifyDataFrame = FALSE),
    error = function(e) list()
  )
  if (is.list(parsed)) return(parsed)
  return(list())
}

# Build prompt context with optional dataset statistics and attached document text
build_context_prompt <- function(analysis_data = NULL, document = NULL, user_name = "User") {
  parts <- c()

  tryCatch({
    if (!is.null(analysis_data) && is.list(analysis_data)) {
      title_str <- if (!is.null(analysis_data$title)) as.character(analysis_data$title)[1] else "Active Study"
      
      # 1. Descriptive stats
      stats_str <- ""
      d_stats <- safe_parse_json_list(analysis_data$descriptive_stats)
      if (length(d_stats) > 0) {
        for (v in names(d_stats)) {
          st <- d_stats[[v]]
          if (is.list(st)) {
            mean_val <- if (!is.null(st$mean)) round(as.numeric(st$mean), 2) else NA
            sd_val <- if (!is.null(st$standard_deviation)) round(as.numeric(st$standard_deviation), 2) else NA
            n_val <- if (!is.null(st$sample_size)) as.character(st$sample_size) else "--"
            stats_str <- paste0(stats_str, sprintf("\n- Variable '%s': N=%s, Mean=%s, SD=%s", v, n_val, mean_val, sd_val))
          }
        }
      }

      # 2. Stress distribution
      dist_str <- ""
      dist_data <- safe_parse_json_list(analysis_data$stress_distribution)
      if (!is.null(dist_data$categories) && is.list(dist_data$categories)) {
        for (cat_item in dist_data$categories) {
          if (is.list(cat_item)) {
            c_name <- if (!is.null(cat_item$category)) cat_item$category else "Tier"
            c_range <- if (!is.null(cat_item$range)) cat_item$range else ""
            c_pct <- if (!is.null(cat_item$percentage)) cat_item$percentage else 0
            c_cnt <- if (!is.null(cat_item$count)) cat_item$count else 0
            dist_str <- paste0(dist_str, sprintf("\n- %s (%s): %s records (%.1f%%)", c_name, c_range, c_cnt, as.numeric(c_pct)))
          }
        }
      }

      # 3. Correlations
      corr_str <- ""
      corr_data <- safe_parse_json_list(analysis_data$correlations)
      if (is.list(corr_data) && length(corr_data) > 0) {
        for (corr_item in corr_data) {
          if (is.list(corr_item)) {
            v1 <- if (!is.null(corr_item$variable_1)) corr_item$variable_1 else "Var1"
            v2 <- if (!is.null(corr_item$variable_2)) corr_item$variable_2 else "Var2"
            r_val <- if (!is.null(corr_item$correlation)) round(as.numeric(corr_item$correlation), 3) else 0
            p_val <- if (!is.null(corr_item$p_value)) round(as.numeric(corr_item$p_value), 4) else 1
            corr_str <- paste0(corr_str, sprintf("\n- '%s' vs '%s': Pearson r = %.3f, p = %.4f", v1, v2, r_val, p_val))
          }
        }
      }

      # 4. Group comparisons
      group_str <- ""
      group_data <- safe_parse_json_list(analysis_data$group_comparisons)
      if (is.list(group_data) && length(group_data) > 0) {
        for (comp_item in group_data) {
          if (is.list(comp_item)) {
            g_title <- if (!is.null(comp_item$group_title)) comp_item$group_title else "Group"
            group_str <- paste0(group_str, sprintf("\n- Group Factor '%s':", g_title))
            if (!is.null(comp_item$groups) && is.list(comp_item$groups)) {
              for (g in comp_item$groups) {
                if (is.list(g)) {
                  g_tier <- if (!is.null(g$group)) g$group else "Tier"
                  g_mean <- if (!is.null(g$mean_stress)) round(as.numeric(g$mean_stress), 2) else 0
                  group_str <- paste0(group_str, sprintf(" [%s -> Mean: %.2f]", g_tier, g_mean))
                }
              }
            }
          }
        }
      }

      # 5. Quality
      q_data <- safe_parse_json_list(analysis_data$data_quality_summary)
      valid_n <- if (!is.null(q_data$valid_rows)) as.numeric(q_data$valid_rows) else 0
      q_score <- if (!is.null(q_data$quality_score)) as.numeric(q_data$quality_score) else 100

      parts <- c(parts, sprintf(
        "=== ACTIVE DATASET CONTEXT ===\nDataset: '%s'\nAnalyzed Sample: N=%d (Quality Score: %.1f/100)\nDescriptive Metrics:%s\nStress Distribution:%s\nCorrelations:%s\nGroup Comparisons:%s\n=============================",
        title_str,
        valid_n,
        q_score,
        if (nzchar(stats_str)) stats_str else " None",
        if (nzchar(dist_str)) dist_str else " None",
        if (nzchar(corr_str)) corr_str else " None",
        if (nzchar(group_str)) group_str else " None"
      ))
    }

    if (!is.null(document)) {
      doc_name <- "Attached Document"
      doc_text <- ""
      
      if (is.list(document)) {
        if (!is.null(document$filename)) doc_name <- as.character(document$filename)[1]
        if (!is.null(document$content_text) && nzchar(as.character(document$content_text)[1])) {
          doc_text <- as.character(document$content_text)[1]
        } else if (!is.null(document$content_base64) && nzchar(as.character(document$content_base64)[1])) {
          raw_bytes <- decode_base64_if_needed(as.character(document$content_base64)[1])
          ext <- if (!is.null(document$file_type)) tolower(as.character(document$file_type)[1]) else "pdf"
          doc_text <- extract_text_from_document(raw_bytes, ext = ext)
        }
      } else if (is.character(document)) {
        doc_text <- paste(document, collapse = "\n")
      }

      if (nzchar(trimws(doc_text))) {
        trimmed_doc <- substr(doc_text, 1, 4000)
        parts <- c(parts, sprintf(
          "=== ATTACHED DOCUMENT CONTEXT ('%s') ===\n%s\n========================================",
          doc_name, trimmed_doc
        ))
      }
    }
  }, error = function(e) {
    message("[build_context_prompt warning]: ", e$message)
  })

  if (length(parts) == 0) {
    return("No specific dataset or document is currently attached. Provide general evidence-based answers regarding exam stress, psychometrics, and study strategies.")
  }

  return(paste(parts, collapse = "\n\n"))
}

call_gemini_api <- function(user_message, context_str, conversation_history = list()) {
  api_key <- get_ai_api_key()
  if (!nzchar(api_key)) {
    return(list(
      success = FALSE,
      response = "Exam Stress Assistant is currently in offline mode because the AI API key is not configured. You can still explore all statistical charts and reports in the dashboard."
    ))
  }

  base_url <- get_ai_base_url()
  candidate_models <- c("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite")

  system_instruction <- paste(
    "You are 'Exam Stress Assistant', an expert AI psychometrics and student wellness research consultant.",
    "",
    "FORMATTING GUIDELINES:",
    "- Provide clear, concise, well-structured answers.",
    "- Use clean section headings, numbered steps (1., 2., 3.), or clean bullet points (- or *).",
    "- Do NOT use markdown symbols like $# or raw symbols.",
    "- Bold important terms using standard bolding.",
    "- Keep replies fast, focused, and directly actionable.",
    "",
    "STRUCTURE:",
    "1. Direct Summary: 1-2 clear sentences directly answering the inquiry.",
    "2. Key Findings & Statistics: Key metrics, correlation figures, or document takeaways.",
    "3. Actionable Strategies: 2-3 proven, practical revision and coping techniques.",
    "4. Note: Brief reminder that survey data reflects self-reported questionnaire metrics."
  )

  full_prompt <- paste0(
    system_instruction, "\n\n",
    context_str, "\n\n",
    "User Question: ", user_message
  )

  req_body <- jsonlite::toJSON(list(
    contents = list(
      list(
        parts = list(
          list(text = full_prompt)
        )
      )
    ),
    generationConfig = list(
      temperature = 0.2,
      maxOutputTokens = 600
    )
  ), auto_unbox = TRUE)

  response_text <- NULL

  for (cur_model in candidate_models) {
    endpoint_url <- paste0(base_url, "/models/", cur_model, ":generateContent?key=", api_key)

    tryCatch({
      h <- curl::new_handle()
      curl::handle_setopt(h, post = TRUE, postfields = req_body, timeout = 6, ssl_verifypeer = FALSE)
      curl::handle_setheaders(h, "Content-Type" = "application/json")
      req_resp <- curl::curl_fetch_memory(endpoint_url, handle = h)
      if (req_resp$status_code == 200) {
        resp_text <- rawToChar(req_resp$content)
        parsed <- jsonlite::fromJSON(resp_text)
        if (!is.null(parsed$candidates$content$parts[[1]]$text)) {
          response_text <- as.character(parsed$candidates$content$parts[[1]]$text)[1]
        }
      }
    }, error = function(e) {
      message(sprintf("[Chatbot Model Error (%s)]: %s", cur_model, e$message))
    })

    if (!is.null(response_text) && nzchar(trimws(response_text))) {
      break
    }
  }

  if (is.null(response_text) || is.na(response_text) || !nzchar(trimws(response_text))) {
    response_text <- "Summary: Processing your query against your research dataset.\n\nKey Suggestions:\n1. Check active correlation metrics in the Dashboard.\n2. Inquire about specific survey variables like sleep duration or revision hours."
  } else {
    response_text <- trimws(response_text)
  }

  return(list(
    success = TRUE,
    response = response_text
  ))
}

# Handle chat message flow and persist in Neon PostgreSQL
process_chat_message <- function(user_id, session_id = NULL, analysis_id = NULL, message_text, document = NULL) {
  message_text <- trimws(message_text)
  if (!nzchar(message_text)) {
    stop("Message cannot be empty.")
  }

  # 1. Fetch or create chat session
  if (is.null(session_id) || !nzchar(session_id)) {
    if (is.null(analysis_id) || !nzchar(analysis_id)) {
      sess_res <- db_query(
        "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at",
        list(as.character(user_id), substr(message_text, 1, 40))
      )
    } else {
      sess_res <- db_query(
        "INSERT INTO chat_sessions (user_id, analysis_id, title) VALUES ($1, $2, $3) RETURNING id, title, created_at",
        list(as.character(user_id), as.character(analysis_id), substr(message_text, 1, 40))
      )
    }
    session_id <- sess_res$id[1]
  } else {
    check_s <- db_query("SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2", list(as.character(session_id), as.character(user_id)))
    if (nrow(check_s) == 0) {
      stop("Chat session not found or unauthorized.")
    }
  }

  # 2. Retrieve analysis data for context if available
  analysis_data <- NULL
  if (!is.null(analysis_id) && nzchar(analysis_id)) {
    a_res <- db_query("SELECT id, title, summary, methodology, scoring_rules, data_quality_summary, descriptive_stats, stress_distribution, correlations, group_comparisons FROM analyses WHERE id = $1 AND user_id = $2", list(analysis_id, user_id))
    if (nrow(a_res) > 0) {
      analysis_data <- list(
        id = a_res[["id"]][1],
        title = a_res[["title"]][1],
        summary = a_res[["summary"]][1],
        methodology = a_res[["methodology"]][1],
        scoring_rules = a_res[["scoring_rules"]][1],
        data_quality_summary = a_res[["data_quality_summary"]][1],
        descriptive_stats = a_res[["descriptive_stats"]][1],
        stress_distribution = a_res[["stress_distribution"]][1],
        correlations = a_res[["correlations"]][1],
        group_comparisons = a_res[["group_comparisons"]][1]
      )
    }
  }

  # 3. Save User message to DB
  db_execute(
    "INSERT INTO chat_messages (chat_session_id, sender, content) VALUES ($1, 'user', $2)",
    list(session_id, message_text)
  )

  # 4. Generate AI reply
  context_str <- build_context_prompt(analysis_data, document = document)
  ai_result <- call_gemini_api(message_text, context_str)
  ai_reply <- ai_result$response

  # 5. Save Assistant reply to DB
  msg_res <- db_query(
    "INSERT INTO chat_messages (chat_session_id, sender, content) VALUES ($1, 'assistant', $2) RETURNING id, created_at",
    list(session_id, ai_reply)
  )

  return(list(
    session_id = session_id,
    user_message = message_text,
    assistant_reply = ai_reply,
    message_id = msg_res$id[1],
    created_at = msg_res$created_at[1]
  ))
}

