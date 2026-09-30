# backend/tests/test_statistics.R
# Tests for statistical calculations, distribution categorization, and correlations

source("modules/statistics.R")
source("modules/validation.R")

test_stats_calculation <- function() {
  # Sample dataframe
  df <- data.frame(
    stress_score = c(8.4, 6.2, 4.1, 9.0, 7.3, 3.5, 5.0, 8.8, 6.7, 4.5),
    sleep_hours = c(5.0, 6.5, 7.5, 4.5, 5.5, 8.0, 7.0, 4.0, 6.0, 7.5),
    study_hours = c(8.5, 6.0, 4.0, 9.0, 7.0, 3.5, 5.0, 10.0, 6.5, 4.5),
    exam_type = c("Finals", "Midterm", "Quiz", "Finals", "Finals", "Midterm", "Midterm", "Finals", "Midterm", "Quiz"),
    stringsAsFactors = FALSE
  )

  # 1. Descriptive stats
  d_stats <- calc_descriptive_stats(df$stress_score)
  stopifnot(d_stats$sample_size == 10)
  stopifnot(d_stats$mean > 6.0 && d_stats$mean < 7.0)
  stopifnot(d_stats$min == 3.5)
  stopifnot(d_stats$max == 9.0)

  # 2. Stress distribution
  dist_res <- classify_stress_distribution(df$stress_score, "standard_numeric_scale")
  stopifnot(length(dist_res$categories) == 3)
  stopifnot(dist_res$dominant_category %in% c("High Stress", "Moderate Stress", "Low Stress"))

  # 3. Correlations
  corrs <- calc_correlations(df)
  stopifnot(length(corrs) >= 1)
  # Sleep should be negatively correlated with stress
  sleep_stress_corr <- NULL
  for (c in corrs) {
    if ((c$variable_1 == "stress_score" && c$variable_2 == "sleep_hours") ||
        (c$variable_1 == "sleep_hours" && c$variable_2 == "stress_score")) {
      sleep_stress_corr <- c
      break
    }
  }
  stopifnot(!is.null(sleep_stress_corr))
  stopifnot(sleep_stress_corr$correlation < 0) # Negative correlation confirmed

  # 4. Group comparisons
  groups <- calc_group_comparisons(df)
  stopifnot(length(groups) >= 2)

  message("[PASS] Statistical Engine calculations verified successfully!")
}

test_stats_calculation()
message("[ALL PASS] test_statistics.R completed successfully.")
