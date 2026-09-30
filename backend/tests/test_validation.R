# backend/tests/test_validation.R
# Tests for CSV parser and dataset validation

source("modules/csv_parser.R")
source("modules/validation.R")

test_csv_parsing <- function() {
  sample_csv <- "student_id,stress_score,sleep_hours\nS1,8.5,5.0\nS2,6.0,7.0\nS3,4.0,8.0\n"
  res <- parse_csv_content(sample_csv, "test.csv")

  stopifnot(res$total_rows == 3)
  stopifnot(res$total_columns == 3)
  stopifnot(!is.null(res$columns$stress_score))
  stopifnot(res$columns$stress_score$type == "numeric")
  message("[PASS] CSV Parsing test passed!")
}

test_validation_mapping <- function() {
  sample_csv <- "student_id,perceived_stress,daily_sleep\nS1,8.5,5.0\nS2,6.0,7.0\nS3,4.0,8.0\n"
  parsed <- parse_csv_content(sample_csv, "test.csv")

  # Valid mapping
  val_res <- validate_dataset_mapping(parsed$data, list(stress_score = "perceived_stress", sleep_hours = "daily_sleep"))
  stopifnot(isTRUE(val_res$is_valid))
  stopifnot(val_res$valid_rows == 3)
  stopifnot(val_res$data_quality_score == 100)

  # Invalid mapping (missing required stress score)
  invalid_val <- validate_dataset_mapping(parsed$data, list(sleep_hours = "daily_sleep"))
  stopifnot(isFALSE(invalid_val$is_valid))

  message("[PASS] Validation & Column Mapping tests passed!")
}

test_csv_parsing()
test_validation_mapping()
message("[ALL PASS] test_validation.R completed successfully.")
