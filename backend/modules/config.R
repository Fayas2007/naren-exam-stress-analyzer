# backend/modules/config.R
# Configuration loader and environment variable manager

load_env <- function(env_path = NULL) {
  if (is.null(env_path)) {
    candidates <- c(".env", "backend/.env", "../.env", "../../.env")
    for (cand in candidates) {
      if (file.exists(cand)) {
        env_path <- cand
        break
      }
    }
  }

  if (!is.null(env_path) && file.exists(env_path)) {
    lines <- readLines(env_path, warn = FALSE)
    for (line in lines) {
      line <- trimws(line)
      if (nzchar(line) && !startsWith(line, "#") && grepl("=", line)) {
        parts <- strsplit(line, "=", fixed = TRUE)[[1]]
        key <- trimws(parts[1])
        val <- trimws(paste(parts[-1], collapse = "="))
        val <- gsub('^"|"$|^\'|\'$', '', val)
        if (nzchar(key)) {
          args <- list()
          args[[key]] <- val
          do.call(Sys.setenv, args)
        }
      }
    }
  }
}

load_env()

get_config <- function(key, default = NULL) {
  val <- Sys.getenv(key, unset = "")
  if (!nzchar(val)) {
    return(default)
  }
  return(val)
}

get_database_url <- function() {
  get_config("DATABASE_URL", "postgresql://localhost:5432/examstress")
}

get_ai_api_key <- function() {
  get_config("AI_API_KEY", "")
}

get_ai_base_url <- function() {
  get_config("AI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
}

get_ai_model <- function() {
  get_config("AI_MODEL", "gemini-flash-latest")
}

get_port <- function() {
  as.integer(get_config("PORT", "8000"))
}

get_max_upload_mb <- function() {
  as.numeric(get_config("MAX_UPLOAD_MB", "10"))
}

get_secret_key <- function() {
  get_config("SECRET_KEY", "exam_stress_analyzer_default_secret_key_2025")
}

# Helper to safely extract JSON body across Plumber versions and clients
get_request_body <- function(req) {
  if (is.list(req$body) && length(req$body) > 0) {
    return(req$body)
  }
  if (!is.null(req$postBody) && nzchar(req$postBody)) {
    parsed <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
    if (is.list(parsed)) return(parsed)
  }
  return(list())
}
