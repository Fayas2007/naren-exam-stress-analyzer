# backend/run_server.R
# Script to launch the Plumber REST API server

source("modules/config.R", local = TRUE)

port <- get_port()
message(paste0(">>> Launching Exam Stress Analyzer API on http://0.0.0.0:", port, " ..."))

pr <- plumber::plumb("server.R")
pr$run(host = "0.0.0.0", port = port, swagger = TRUE)
