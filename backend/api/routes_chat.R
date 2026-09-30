# backend/api/routes_chat.R
# AI Chatbot Endpoints (Exam Stress Assistant)

#* Send message to Exam Stress Assistant
#* @post /
#* @post ""
#* @serializer unboxedJSON
function(req, res) {
  message("[Chat API] Incoming POST /chat request...")
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    message("[Chat API] Unauthorized request")
    res$status <- 401
    return(list(error = "Unauthorized: Please log in to chat with the assistant."))
  }

  body <- get_request_body(req)
  message_text <- body$message
  session_id <- body$session_id
  analysis_id <- body$analysis_id
  document <- body$document

  message(sprintf("[Chat API] User: %s, Message: '%s', Analysis ID: %s", user$id, substr(as.character(message_text), 1, 30), as.character(analysis_id)))

  if (is.null(message_text) || !nzchar(trimws(message_text))) {
    res$status <- 400
    return(list(error = "Message cannot be empty."))
  }

  tryCatch({
    chat_result <- process_chat_message(
      user_id = user$id,
      session_id = session_id,
      analysis_id = analysis_id,
      message_text = message_text,
      document = document
    )

    message("[Chat API] Successfully processed chat message.")
    return(chat_result)
  }, error = function(e) {
    message("[Chat API Error]: ", e$message)
    res$status <- 500
    return(list(error = paste("Chatbot processing error:", e$message)))
  })
}

#* Get chat history for a session or latest user sessions
#* @get /history
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  session_id <- req$args$session_id
  analysis_id <- req$args$analysis_id

  if (!is.null(session_id) && nzchar(session_id)) {
    sess_check <- db_query("SELECT id, title, analysis_id, created_at FROM chat_sessions WHERE id = $1 AND user_id = $2", list(session_id, user$id))
    if (nrow(sess_check) == 0) {
      res$status <- 404
      return(list(error = "Chat session not found."))
    }

    msgs <- db_query(
      "SELECT id, sender, content, created_at FROM chat_messages WHERE chat_session_id = $1 ORDER BY created_at ASC",
      list(session_id)
    )

    msg_list <- list()
    if (nrow(msgs) > 0) {
      for (i in seq_len(nrow(msgs))) {
        row <- msgs[i, ]
        msg_list[[length(msg_list) + 1]] <- list(
          id = row$id,
          sender = row$sender,
          content = row$content,
          created_at = row$created_at
        )
      }
    }

    return(list(
      session_id = session_id,
      title = sess_check$title[1],
      analysis_id = sess_check$analysis_id[1],
      messages = msg_list
    ))
  } else {
    sql <- "SELECT cs.id, cs.title, cs.analysis_id, cs.created_at, cs.updated_at,
                   a.title as analysis_title,
                   (SELECT content FROM chat_messages cm WHERE cm.chat_session_id = cs.id ORDER BY cm.created_at DESC LIMIT 1) as last_message
            FROM chat_sessions cs
            LEFT JOIN analyses a ON cs.analysis_id = a.id
            WHERE cs.user_id = $1"
    params <- list(user$id)

    if (!is.null(analysis_id) && nzchar(analysis_id)) {
      sql <- paste0(sql, " AND cs.analysis_id = $2")
      params[[2]] <- analysis_id
    }

    sql <- paste0(sql, " ORDER BY cs.updated_at DESC LIMIT 20")
    sessions_res <- db_query(sql, params)

    sessions_list <- list()
    if (nrow(sessions_res) > 0) {
      for (i in seq_len(nrow(sessions_res))) {
        r <- sessions_res[i, ]
        sessions_list[[length(sessions_list) + 1]] <- list(
          id = r$id,
          title = r$title,
          analysis_id = r$analysis_id,
          analysis_title = r$analysis_title,
          last_message = r$last_message,
          created_at = r$created_at,
          updated_at = r$updated_at
        )
      }
    }

    return(list(
      total_sessions = length(sessions_list),
      sessions = sessions_list
    ))
  }
}
