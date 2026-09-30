# backend/modules/validation.R
# Dataset Validation, Column Mapping Verification, and Data Quality Analysis

validate_dataset_mapping <- function(df, column_mappings, missing_handling = "exclude_incomplete_records", scoring_method = "standard_numeric_scale") {
  # column_mappings is a named list e.g. list(stress_score = "perceived_stress", sleep_hours = "daily_sleep_hours")
  errors <- c()
  warnings <- c()

  # 1. Check required mapping: stress_score
  stress_col <- column_mappings$stress_score
  if (is.null(stress_col) || !nzchar(stress_col)) {
    errors <- c(errors, "A column must be mapped to the required 'stress_score' analysis field.")
  } else if (!(stress_col %in% colnames(df))) {
    errors <- c(errors, paste0("The selected stress column '", stress_col, "' was not found in the dataset."))
  }

  if (length(errors) > 0) {
    return(list(
      is_valid = FALSE,
      errors = errors,
      warnings = warnings,
      total_rows = nrow(df),
      valid_rows = 0,
      excluded_rows = nrow(df)
    ))
  }

  # 2. Extract and inspect stress_score column
  raw_stress <- df[[stress_col]]
  num_stress <- suppressWarnings(as.numeric(raw_stress))
  invalid_stress_count <- sum(is.na(num_stress) & !is.na(raw_stress) & raw_stress != "")

  if (invalid_stress_count > 0) {
    warnings <- c(warnings, paste0(invalid_stress_count, " non-numeric value(s) in stress column '", stress_col, "' will be treated as missing."))
  }

  missing_stress_count <- sum(is.na(num_stress))
  if (missing_stress_count == nrow(df)) {
    errors <- c(errors, paste0("The column '", stress_col, "' contains no valid numerical stress values."))
    return(list(
      is_valid = FALSE,
      errors = errors,
      warnings = warnings,
      total_rows = nrow(df),
      valid_rows = 0,
      excluded_rows = nrow(df)
    ))
  }

  # 3. Inspect mapped columns
  mapped_fields_present <- list()
  column_quality <- list()

  for (field_name in names(column_mappings)) {
    orig_col <- column_mappings[[field_name]]
    if (!is.null(orig_col) && nzchar(orig_col) && orig_col %in% colnames(df)) {
      mapped_fields_present[[field_name]] <- orig_col
      col_data <- df[[orig_col]]
      missing_count <- sum(is.na(col_data) | col_data == "" | col_data == "NA")

      column_quality[[field_name]] <- list(
        original_column = orig_col,
        mapped_field = field_name,
        total_count = length(col_data),
        missing_count = as.integer(missing_count),
        missing_percentage = round((missing_count / length(col_data)) * 100, 1)
      )
    }
  }

  # 4. Check Duplicate Rows
  duplicate_count <- sum(duplicated(df))
  if (duplicate_count > 0) {
    warnings <- c(warnings, paste0("Detected ", duplicate_count, " exact duplicate row(s) in the dataset."))
  }

  # 5. Row Filtering according to missing_handling
  # Create working subset of mapped columns
  mapped_df <- data.frame(row_id = seq_len(nrow(df)))

  for (f in names(mapped_fields_present)) {
    col_name <- mapped_fields_present[[f]]
    val <- df[[col_name]]
    if (f %in% c("stress_score", "sleep_hours", "study_hours", "anxiety_score", "caffeine_intake", "physical_activity_hours")) {
      mapped_df[[f]] <- suppressWarnings(as.numeric(val))
    } else {
      # Categorical fields (preparation_level, exam_type)
      mapped_df[[f]] <- as.character(val)
      mapped_df[[f]][mapped_df[[f]] == "" | mapped_df[[f]] == "NA"] <- NA
    }
  }
  mapped_df$row_id <- NULL

  # Filter valid rows
  if (missing_handling == "exclude_incomplete_records") {
    valid_mask <- complete.cases(mapped_df)
  } else {
    # pairwise / stress required
    valid_mask <- !is.na(mapped_df$stress_score)
  }

  valid_rows_count <- sum(valid_mask)
  excluded_rows_count <- nrow(df) - valid_rows_count

  if (valid_rows_count < 3) {
    errors <- c(errors, "Dataset has fewer than 3 valid rows after filtering missing values. Statistical analysis requires at least 3 records.")
  }

  # 6. Overall Data Quality Score (0 - 100)
  total_cells <- nrow(df) * length(mapped_fields_present)
  total_missing <- sum(sapply(mapped_df, function(x) sum(is.na(x))))
  completeness_ratio <- if (total_cells > 0) (1 - (total_missing / total_cells)) else 1
  valid_row_ratio <- valid_rows_count / nrow(df)

  quality_score <- max(0, min(100, round((completeness_ratio * 0.6 + valid_row_ratio * 0.4) * 100, 1)))

  # 7. Stress Range Check
  valid_stress_vals <- mapped_df$stress_score[valid_mask]
  stress_min <- min(valid_stress_vals, na.rm = TRUE)
  stress_max <- max(valid_stress_vals, na.rm = TRUE)

  if (stress_min < 0) {
    warnings <- c(warnings, "Stress score column contains negative values.")
  }

  return(list(
    is_valid = (length(errors) == 0),
    errors = errors,
    warnings = warnings,
    total_rows = nrow(df),
    valid_rows = valid_rows_count,
    excluded_rows = excluded_rows_count,
    duplicate_rows = duplicate_count,
    data_quality_score = quality_score,
    missing_handling_applied = missing_handling,
    scoring_method = scoring_method,
    stress_range = list(min = stress_min, max = stress_max),
    column_quality = column_quality,
    mapped_fields = mapped_fields_present,
    clean_data = mapped_df[valid_mask, , drop = FALSE]
  ))
}
