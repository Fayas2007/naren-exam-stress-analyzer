# backend/api/routes_profile.R
# Profile Management and Account Operations

#* Get user profile and account statistics
#* @get /
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  u_res <- db_query("SELECT id, email, full_name, institution, language_pref, created_at FROM users WHERE id = $1", list(user$id))
  if (nrow(u_res) == 0) {
    res$status <- 404
    return(list(error = "User not found"))
  }

  row <- u_res[1, ]

  stats_d <- db_query("SELECT COUNT(*) as cnt FROM datasets WHERE user_id = $1", list(user$id))
  stats_a <- db_query("SELECT COUNT(*) as cnt FROM analyses WHERE user_id = $1", list(user$id))
  stats_c <- db_query("SELECT COUNT(*) as cnt FROM chat_sessions WHERE user_id = $1", list(user$id))

  list(
    profile = list(
      id = row$id,
      email = row$email,
      full_name = row$full_name,
      institution = row$institution,
      language_pref = row$language_pref,
      created_at = row$created_at
    ),
    stats = list(
      total_datasets = as.integer(stats_d$cnt[1]),
      total_analyses = as.integer(stats_a$cnt[1]),
      total_chat_sessions = as.integer(stats_c$cnt[1])
    )
  )
}

#* Update profile fields
#* @patch /
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  body <- get_request_body(req)
  full_name <- body$full_name
  institution <- body$institution
  language_pref <- body$language_pref

  current <- db_query("SELECT full_name, institution, language_pref FROM users WHERE id = $1", list(user$id))
  if (nrow(current) == 0) {
    res$status <- 404
    return(list(error = "User not found"))
  }

  new_name <- if (!is.null(full_name) && nzchar(trimws(full_name))) trimws(full_name) else current$full_name[1]
  new_inst <- if (!is.null(institution)) trimws(institution) else current$institution[1]
  new_lang <- if (!is.null(language_pref) && nzchar(trimws(language_pref))) trimws(language_pref) else current$language_pref[1]

  db_execute(
    "UPDATE users SET full_name = $1, institution = $2, language_pref = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
    list(new_name, new_inst, new_lang, user$id)
  )

  list(
    message = "Profile updated successfully",
    profile = list(
      id = user$id,
      email = user$email,
      full_name = new_name,
      institution = new_inst,
      language_pref = new_lang
    )
  )
}

#* Delete user account and all related data
#* @delete /
#* @serializer unboxedJSON
function(req, res) {
  user <- get_current_user_from_req(req)
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  db_execute("DELETE FROM users WHERE id = $1", list(user$id))

  list(message = "Account and all associated records permanently deleted.")
}
