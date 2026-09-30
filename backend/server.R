# backend/server.R
# Main Plumber REST API Server for Exam Stress Analyzer

library(plumber)

source("modules/config.R")
source("modules/db.R")
source("modules/auth.R")
source("modules/csv_parser.R")
source("modules/validation.R")
source("modules/statistics.R")
source("modules/reporting.R")
source("modules/chatbot.R")

# Auto-run DB migrations on startup
tryCatch({
  run_migrations()
}, error = function(e) {
  message("[Startup Migration Warning]: ", e$message)
})

#* @apiTitle Exam Stress Analyzer REST API
#* @apiDescription R Plumber backend powering dataset processing, statistical computation, Neon PostgreSQL storage, and Gemini AI chatbot.
#* @apiVersion 1.0.0

#* Handle CORS Preflight and set standard response headers
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS, PUT")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
  res$setHeader("Access-Control-Max-Age", "86400")

  if (identical(req$REQUEST_METHOD, "OPTIONS")) {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}


# Mount all endpoint routers
#* @plumber
function(pr) {
  pr %>%
    pr_hook("preroute", function(req, res) {
      # Normalize mounted router paths without trailing slash so Plumber matches both /analyses and /analyses/
      if (!is.null(req$PATH_INFO) && req$PATH_INFO %in% c("/analyses", "/auth", "/datasets", "/chat", "/profile", "/health")) {
        req$PATH_INFO <- paste0(req$PATH_INFO, "/")
      }
    }) %>%
    pr_mount("/health", pr("api/routes_health.R")) %>%
    pr_mount("/auth", pr("api/routes_auth.R")) %>%
    pr_mount("/datasets", pr("api/routes_datasets.R")) %>%
    pr_mount("/analyses", pr("api/routes_analyses.R")) %>%
    pr_mount("/chat", pr("api/routes_chat.R")) %>%
    pr_mount("/profile", pr("api/routes_profile.R")) %>%
    pr_set_error(function(req, res, err) {
      res$status <- 500
      list(
        error = "Internal Server Error",
        message = as.character(err),
        timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ")
      )
    })
}
