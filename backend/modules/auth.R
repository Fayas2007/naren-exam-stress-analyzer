# backend/modules/auth.R
# Authentication, Password Hashing, and Session Token Management

source("modules/db.R", local = TRUE)
source("modules/config.R", local = TRUE)

# Hash a password securely with a secret salt
hash_password <- function(password) {
  salt <- get_secret_key()
  if (requireNamespace("openssl", quietly = TRUE)) {
    hashed <- as.character(openssl::sha256(paste0(password, ":", salt)))
  } else if (requireNamespace("digest", quietly = TRUE)) {
    hashed <- digest::digest(paste0(password, ":", salt), algo = "sha256")
  } else {
    stop("Neither 'openssl' nor 'digest' package is available for password hashing.")
  }
  return(hashed)
}

# Verify password against stored hash
verify_password <- function(password, stored_hash) {
  calculated_hash <- hash_password(password)
  # Constant time-like comparison
  return(identical(calculated_hash, stored_hash))
}

# Generate cryptographically secure session token
generate_session_token <- function() {
  if (requireNamespace("openssl", quietly = TRUE)) {
    raw_bytes <- openssl::rand_bytes(32)
    token <- paste0(as.character(raw_bytes), collapse = "")
  } else {
    token <- paste0(sample(c(0:9, letters, LETTERS), 64, replace = TRUE), collapse = "")
  }
  return(token)
}

# Hash session token for secure database storage
hash_session_token <- function(token) {
  if (requireNamespace("openssl", quietly = TRUE)) {
    return(as.character(openssl::sha256(token)))
  } else if (requireNamespace("digest", quietly = TRUE)) {
    return(digest::digest(token, algo = "sha256"))
  } else {
    stop("No crypto package available for token hashing")
  }
}

# Register a new user
register_user <- function(email, password, full_name, institution = NULL) {
  email <- tolower(trimws(email))
  full_name <- trimws(full_name)

  # Validate email format
  if (!grepl("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", email)) {
    stop("Invalid email address format.")
  }

  if (nchar(password) < 6) {
    stop("Password must be at least 6 characters long.")
  }

  if (!nzchar(full_name)) {
    stop("Full name is required.")
  }

  # Check if email already exists
  existing <- db_query("SELECT id FROM users WHERE email = $1", list(email))
  if (nrow(existing) > 0) {
    stop("An account with this email address already exists.")
  }

  pw_hash <- hash_password(password)
  res <- db_query(
    "INSERT INTO users (email, password_hash, full_name, institution) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, institution, created_at",
    list(email, pw_hash, full_name, if (is.null(institution)) "" else institution)
  )

  return(as.list(res[1, ]))
}

# Authenticate user and create session
login_user <- function(email, password) {
  email <- tolower(trimws(email))

  user_res <- db_query(
    "SELECT id, email, password_hash, full_name, institution, language_pref FROM users WHERE email = $1",
    list(email)
  )

  if (nrow(user_res) == 0) {
    stop("Invalid email or password.")
  }

  user <- user_res[1, ]
  if (!verify_password(password, user$password_hash)) {
    stop("Invalid email or password.")
  }

  # Generate token and save session (expires in 7 days)
  token <- generate_session_token()
  token_hash <- hash_session_token(token)
  expires_at <- Sys.time() + (7 * 24 * 60 * 60) # 7 days

  db_execute(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    list(user$id, token_hash, format(expires_at, "%Y-%m-%d %H:%M:%S%z"))
  )

  return(list(
    token = token,
    user = list(
      id = user$id,
      email = user$email,
      full_name = user$full_name,
      institution = user$institution,
      language_pref = user$language_pref
    ),
    expires_at = format(expires_at, "%Y-%m-%dT%H:%M:%SZ")
  ))
}

# Verify session token and return user
authenticate_token <- function(token) {
  if (is.null(token)) return(NULL)
  token_str <- tryCatch(as.character(token)[1], error = function(e) "")
  if (is.na(token_str) || !nzchar(trimws(token_str))) {
    return(NULL)
  }
  token <- trimws(token_str)

  token_hash <- hash_session_token(token)

  session_res <- db_query(
    "SELECT s.id as session_id, s.user_id, s.expires_at, u.email, u.full_name, u.institution, u.language_pref
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP",
    list(token_hash)
  )

  if (nrow(session_res) == 0) {
    return(NULL)
  }

  # Update last active timestamp
  tryCatch({
    db_execute(
      "UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token_hash = $1",
      list(token_hash)
    )
  }, error = function(e) {})

  row <- session_res[1, ]
  return(list(
    id = as.character(row$user_id),
    session_id = as.character(row$session_id),
    email = as.character(row$email),
    full_name = as.character(row$full_name),
    institution = if (is.na(row$institution)) "" else as.character(row$institution),
    language_pref = if (is.na(row$language_pref)) "en" else as.character(row$language_pref)
  ))
}

# Logout user (delete session)
logout_user <- function(token) {
  if (is.null(token)) return(TRUE)
  token_str <- tryCatch(as.character(token)[1], error = function(e) "")
  if (is.na(token_str) || !nzchar(trimws(token_str))) return(TRUE)
  token_hash <- hash_session_token(trimws(token_str))
  db_execute("DELETE FROM sessions WHERE token_hash = $1", list(token_hash))
  return(TRUE)
}

# Helper to reliably extract authenticated user from Plumber request object
get_current_user_from_req <- function(req) {
  if (!is.null(req$current_user)) return(req$current_user)

  auth_header <- NULL
  if (!is.null(req$HTTP_AUTHORIZATION) && length(req$HTTP_AUTHORIZATION) > 0) {
    auth_header <- as.character(req$HTTP_AUTHORIZATION)[1]
  } else if (!is.null(req$headers) && is.list(req$headers) && !is.null(req$headers$authorization)) {
    auth_header <- as.character(req$headers$authorization)[1]
  }

  if (!is.null(auth_header) && !is.na(auth_header) && nzchar(trimws(auth_header))) {
    auth_str <- trimws(auth_header)
    if (grepl("^Bearer\\s+", auth_str, ignore.case = TRUE)) {
      token <- sub("^Bearer\\s+", "", auth_str, ignore.case = TRUE)
      token <- trimws(token)
      if (nzchar(token)) {
        user <- authenticate_token(token)
        if (!is.null(user)) {
          req$current_user <- user
          req$auth_token <- token
          return(user)
        }
      }
    }
  }
  return(NULL)
}
