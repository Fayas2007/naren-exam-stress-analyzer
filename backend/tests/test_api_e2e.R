# backend/tests/test_api_e2e.R
# End-to-End API lifecycle integration test

library(httr)
library(jsonlite)

base_url <- "http://127.0.0.1:8000"

message("\n=== STARTING E2E API INTEGRATION TESTS ===")

# 1. Test Health
message("1. Testing /health/ ...")
h_res <- GET(paste0(base_url, "/health/"))
stopifnot(status_code(h_res) == 200)
h_body <- fromJSON(content(h_res, as = "text", encoding = "UTF-8"))
stopifnot(h_body$status == "healthy")
stopifnot(h_body$database$status == "connected")
message("[PASS] Health endpoint OK: Neon PostgreSQL connected.")

# 2. Test User Registration
test_email <- paste0("researcher_", as.integer(Sys.time()), "@university.edu")
message(paste("2. Testing /auth/register with email:", test_email))

reg_payload <- list(
  email = test_email,
  password = "SecurePassword123!",
  full_name = "Dr. Elena Rostova",
  institution = "Department of Cognitive Psychology"
)

reg_res <- POST(
  paste0(base_url, "/auth/register"),
  body = reg_payload,
  encode = "json"
)
stopifnot(status_code(reg_res) == 201)
reg_body <- fromJSON(content(reg_res, as = "text", encoding = "UTF-8"))
auth_token <- reg_body$token
stopifnot(!is.null(auth_token) && nchar(auth_token) > 0)
message("[PASS] Registration OK. Token acquired.")

# 3. Test /auth/me
message("3. Testing /auth/me ...")
me_res <- GET(paste0(base_url, "/auth/me"), add_headers("Authorization" = paste("Bearer", auth_token)))
stopifnot(status_code(me_res) == 200)
me_body <- fromJSON(content(me_res, as = "text", encoding = "UTF-8"))
stopifnot(me_body$user$email == test_email)
message("[PASS] Auth verification OK.")

# 4. Test Dataset Upload
message("4. Testing /datasets/upload ...")
sample_csv <- readLines("../sample_data/student_exam_stress_sample.csv")
csv_text <- paste(sample_csv, collapse = "\n")

upload_payload <- list(
  csv_text = csv_text,
  filename = "student_exam_stress_sample.csv"
)

up_res <- POST(
  paste0(base_url, "/datasets/upload"),
  body = upload_payload,
  encode = "json",
  add_headers("Authorization" = paste("Bearer", auth_token))
)
stopifnot(status_code(up_res) == 201)
up_body <- fromJSON(content(up_res, as = "text", encoding = "UTF-8"))
dataset_id <- up_body$dataset_id
stopifnot(!is.null(dataset_id))
stopifnot(up_body$total_rows == 30)
message(paste("[PASS] Dataset uploaded successfully. Dataset ID:", dataset_id))

# 5. Test Dataset Validation
message("5. Testing /datasets/validate ...")
val_payload <- list(
  dataset_id = dataset_id,
  column_mappings = list(
    stress_score = "stress_score",
    sleep_hours = "sleep_hours",
    study_hours = "study_hours",
    preparation_level = "preparation_level",
    exam_type = "exam_type",
    anxiety_score = "anxiety_score"
  ),
  missing_handling_method = "exclude_incomplete_records",
  scoring_method = "standard_numeric_scale",
  csv_text = csv_text
)

val_res <- POST(
  paste0(base_url, "/datasets/validate"),
  body = val_payload,
  encode = "json",
  add_headers("Authorization" = paste("Bearer", auth_token))
)
stopifnot(status_code(val_res) == 200)
val_body <- fromJSON(content(val_res, as = "text", encoding = "UTF-8"))
stopifnot(isTRUE(val_body$is_valid))
stopifnot(val_body$valid_rows == 30)
stopifnot(val_body$data_quality_score == 100)
message("[PASS] Dataset validated. Quality Score: 100/100.")

# 6. Test Run Statistical Analysis
message("6. Testing POST /analyses/ ...")
analysis_payload <- list(
  dataset_id = dataset_id,
  title = "Midterm Student Exam Stress Study 2025",
  column_mappings = list(
    stress_score = "stress_score",
    sleep_hours = "sleep_hours",
    study_hours = "study_hours",
    preparation_level = "preparation_level",
    exam_type = "exam_type",
    anxiety_score = "anxiety_score"
  ),
  missing_handling_method = "exclude_incomplete_records",
  scoring_method = "standard_numeric_scale",
  csv_text = csv_text
)

an_res <- POST(
  paste0(base_url, "/analyses/"),
  body = analysis_payload,
  encode = "json",
  add_headers("Authorization" = paste("Bearer", auth_token))
)
stopifnot(status_code(an_res) == 201)
an_body <- fromJSON(content(an_res, as = "text", encoding = "UTF-8"))
analysis_id <- an_body$id
stopifnot(!is.null(analysis_id))
stopifnot(!is.null(an_body$descriptive_stats$stress_score$mean))
stopifnot(length(an_body$stress_distribution$categories) == 3)
stopifnot(length(an_body$correlations) >= 1)
message(paste("[PASS] Statistical Analysis completed. Analysis ID:", analysis_id))
message(paste("       Mean Stress:", an_body$descriptive_stats$stress_score$mean, "(SD:", an_body$descriptive_stats$stress_score$standard_deviation, ")"))

# 7. Test List Analyses
message("7. Testing GET /analyses/ ...")
list_res <- GET(paste0(base_url, "/analyses/"), add_headers("Authorization" = paste("Bearer", auth_token)))
stopifnot(status_code(list_res) == 200)
list_body <- fromJSON(content(list_res, as = "text", encoding = "UTF-8"))
stopifnot(list_body$total_analyses >= 1)
message("[PASS] Analysis archive listing OK.")

# 8. Test Analytical Report Generation
message("8. Testing GET /analyses/{id}/report ...")
rep_res <- GET(paste0(base_url, "/analyses/", analysis_id, "/report"), add_headers("Authorization" = paste("Bearer", auth_token)))
stopifnot(status_code(rep_res) == 200)
rep_body <- fromJSON(content(rep_res, as = "text", encoding = "UTF-8"))
stopifnot(!is.null(rep_body$markdown) && nchar(rep_body$markdown) > 50)
stopifnot(!is.null(rep_body$html) && nchar(rep_body$html) > 50)
message("[PASS] Markdown & HTML analytical report generated.")

# 9. Test Exam Stress Assistant (Gemini AI Chatbot)
message("9. Testing POST /chat/ (Gemini LLM grounded in R statistical findings) ...")
chat_payload <- list(
  message = "What is the average stress score in this survey and what is the relationship between sleep duration and stress?",
  analysis_id = analysis_id
)

chat_res <- POST(
  paste0(base_url, "/chat/"),
  body = chat_payload,
  encode = "json",
  add_headers("Authorization" = paste("Bearer", auth_token))
)
stopifnot(status_code(chat_res) == 200)
chat_body <- fromJSON(content(chat_res, as = "text", encoding = "UTF-8"))
stopifnot(!is.null(chat_body$assistant_reply) && nchar(chat_body$assistant_reply) > 20)
message("[PASS] Exam Stress Assistant replied:")
message(paste(">>> Assistant Response:\n", substr(chat_body$assistant_reply, 1, 300), "...\n"))

# 10. Test Profile
message("10. Testing GET /profile/ ...")
prof_res <- GET(paste0(base_url, "/profile/"), add_headers("Authorization" = paste("Bearer", auth_token)))
stopifnot(status_code(prof_res) == 200)
prof_body <- fromJSON(content(prof_res, as = "text", encoding = "UTF-8"))
stopifnot(prof_body$stats$total_analyses >= 1)
message("[PASS] Profile statistics verified.")

message("\n==========================================")
message("🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY!")
message("==========================================\n")
