# backend/api/routes_health.R
# Health Check Endpoint

#* Check API and Database Health Status
#* @get /
#* @serializer unboxedJSON
function() {
  db_status <- "connected"
  db_err <- NULL

  tryCatch({
    res <- db_query("SELECT 1 as alive")
    if (nrow(res) == 0) {
      db_status <- "unreachable"
    }
  }, error = function(e) {
    db_status <<- "error"
    db_err <<- e$message
  })

  list(
    status = if (db_status == "connected") "healthy" else "degraded",
    service = "Exam Stress Analyzer API",
    version = "1.0.0",
    database = list(
      engine = "Neon PostgreSQL",
      status = db_status,
      error = db_err
    ),
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ")
  )
}
