# backend/modules/statistics.R
# Comprehensive Statistical Analysis Engine using R (descriptive stats, distributions, ANOVA, correlations, and chart payloads)

calc_descriptive_stats <- function(vals) {
  clean_v <- vals[!is.na(vals) & !is.nan(vals) & !is.infinite(vals)]
  n <- length(clean_v)
  if (n == 0) return(NULL)

  q <- stats::quantile(clean_v, probs = c(0.25, 0.5, 0.75), na.rm = TRUE)
  mean_val <- mean(clean_v)
  sd_val <- if (n > 1) stats::sd(clean_v) else 0
  var_val <- if (n > 1) stats::var(clean_v) else 0

  # Sample skewness
  skewness_val <- if (n > 2 && sd_val > 0) {
    sum((clean_v - mean_val)^3) / ((n - 1) * (n - 2) * (sd_val^3) / n)
  } else {
    0
  }

  list(
    sample_size = as.integer(n),
    missing_count = as.integer(length(vals) - n),
    mean = round(as.numeric(mean_val), 2),
    median = round(as.numeric(q[2]), 2),
    standard_deviation = round(as.numeric(sd_val), 2),
    variance = round(as.numeric(var_val), 2),
    min = round(as.numeric(min(clean_v)), 2),
    max = round(as.numeric(max(clean_v)), 2),
    q1 = round(as.numeric(q[1]), 2),
    q3 = round(as.numeric(q[3]), 2),
    iqr = round(as.numeric(q[3] - q[1]), 2),
    skewness = round(as.numeric(skewness_val), 2)
  )
}

classify_stress_distribution <- function(stress_vals, scoring_method = "standard_numeric_scale") {
  clean_s <- stress_vals[!is.na(stress_vals)]
  n <- length(clean_s)
  if (n == 0) return(list())

  s_min <- min(clean_s)
  s_max <- max(clean_s)

  # Determine classification thresholds
  if (s_max <= 10) {
    # 0 - 10 scale
    low_mask <- clean_s < 4.0
    mod_mask <- clean_s >= 4.0 & clean_s <= 7.0
    high_mask <- clean_s > 7.0
    rules_desc <- "0-10 Scale (Low: <4.0, Moderate: 4.0-7.0, High: >7.0)"
    low_range <- "< 4.0"
    mod_range <- "4.0 - 7.0"
    high_range <- "> 7.0"
  } else if (s_max <= 40) {
    # PSS-10 scale (0-40)
    low_mask <- clean_s <= 13
    mod_mask <- clean_s >= 14 & clean_s <= 26
    high_mask <- clean_s >= 27
    rules_desc <- "Perceived Stress Scale PSS-10 (Low: 0-13, Moderate: 14-26, High: 27-40)"
    low_range <- "0 - 13"
    mod_range <- "14 - 26"
    high_range <- "27 - 40"
  } else if (s_max <= 100) {
    # 0 - 100 percentage scale
    low_mask <- clean_s < 40
    mod_mask <- clean_s >= 40 & clean_s <= 70
    high_mask <- clean_s > 70
    rules_desc <- "0-100 Percentage Scale (Low: <40, Moderate: 40-70, High: >70)"
    low_range <- "< 40"
    mod_range <- "40 - 70"
    high_range <- "> 70"
  } else {
    # Quantile tertiles fallback
    q <- stats::quantile(clean_s, probs = c(0.333, 0.667), na.rm = TRUE)
    low_mask <- clean_s <= q[1]
    mod_mask <- clean_s > q[1] & clean_s <= q[2]
    high_mask <- clean_s > q[2]
    rules_desc <- paste0("Quantile Tertiles (Low: <=", round(q[1], 1), ", Mod: ", round(q[1], 1), "-", round(q[2], 1), ", High: >", round(q[2], 1), ")")
    low_range <- paste0("<= ", round(q[1], 1))
    mod_range <- paste0(round(q[1], 1), " - ", round(q[2], 1))
    high_range <- paste0("> ", round(q[2], 1))
  }

  low_count <- sum(low_mask)
  mod_count <- sum(mod_mask)
  high_count <- sum(high_mask)

  categories <- list(
    list(
      category = "Low Stress",
      range = low_range,
      count = as.integer(low_count),
      percentage = round((low_count / n) * 100, 1),
      color = "#16A34A"
    ),
    list(
      category = "Moderate Stress",
      range = mod_range,
      count = as.integer(mod_count),
      percentage = round((mod_count / n) * 100, 1),
      color = "#F59E0B"
    ),
    list(
      category = "High Stress",
      range = high_range,
      count = as.integer(high_count),
      percentage = round((high_count / n) * 100, 1),
      color = "#DC2626"
    )
  )

  list(
    rules_description = rules_desc,
    categories = categories,
    dominant_category = if (high_count >= mod_count && high_count >= low_count) "High Stress" else if (mod_count >= low_count) "Moderate Stress" else "Low Stress"
  )
}

calc_correlations <- function(clean_df) {
  # Find numeric columns
  numeric_cols <- c("stress_score", "sleep_hours", "study_hours", "anxiety_score", "caffeine_intake", "physical_activity_hours")
  available_num <- intersect(numeric_cols, colnames(clean_df))

  correlations <- list()

  if (length(available_num) >= 2) {
    for (i in 1:(length(available_num) - 1)) {
      for (j in (i + 1):length(available_num)) {
        col1 <- available_num[i]
        col2 <- available_num[j]

        v1 <- clean_df[[col1]]
        v2 <- clean_df[[col2]]
        valid_idx <- !is.na(v1) & !is.na(v2)

        if (sum(valid_idx) >= 3 && stats::sd(v1[valid_idx]) > 0 && stats::sd(v2[valid_idx]) > 0) {
          test_res <- tryCatch({
            stats::cor.test(v1[valid_idx], v2[valid_idx], method = "pearson")
          }, error = function(e) NULL)

          if (!is.null(test_res)) {
            r_val <- as.numeric(test_res$estimate)
            p_val <- as.numeric(test_res$p.value)

            strength <- if (abs(r_val) >= 0.7) {
              if (r_val > 0) "Strong Positive" else "Strong Negative"
            } else if (abs(r_val) >= 0.4) {
              if (r_val > 0) "Moderate Positive" else "Moderate Negative"
            } else if (abs(r_val) >= 0.2) {
              if (r_val > 0) "Weak Positive" else "Weak Negative"
            } else {
              "No Significant Correlation"
            }

            correlations[[length(correlations) + 1]] <- list(
              variable_1 = col1,
              variable_2 = col2,
              correlation = round(r_val, 3),
              p_value = round(p_val, 4),
              is_statistically_significant = (p_val < 0.05),
              strength = strength,
              sample_size = as.integer(sum(valid_idx))
            )
          }
        }
      }
    }
  }

  return(correlations)
}

calc_group_comparisons <- function(clean_df) {
  comparisons <- list()

  # 1. Sleep Hours Grouping vs Stress
  if ("sleep_hours" %in% colnames(clean_df) && "stress_score" %in% colnames(clean_df)) {
    sleep_df <- clean_df[!is.na(clean_df$sleep_hours) & !is.na(clean_df$stress_score), ]
    if (nrow(sleep_df) >= 3) {
      sleep_df$sleep_group <- ifelse(sleep_df$sleep_hours < 6, "< 6 Hours (Short)",
                               ifelse(sleep_df$sleep_hours <= 8, "6 - 8 Hours (Optimal)", "> 8 Hours (Long)"))

      groups <- unique(sleep_df$sleep_group)
      group_stats <- list()
      for (g in groups) {
        g_vals <- sleep_df$stress_score[sleep_df$sleep_group == g]
        group_stats[[length(group_stats) + 1]] <- list(
          group = g,
          sample_size = length(g_vals),
          mean_stress = round(mean(g_vals), 2),
          median_stress = round(stats::median(g_vals), 2),
          sd_stress = round(if (length(g_vals) > 1) stats::sd(g_vals) else 0, 2)
        )
      }

      comparisons[[length(comparisons) + 1]] <- list(
        group_variable = "sleep_hours",
        group_title = "Stress by Sleep Duration",
        description = "Comparison of average perceived stress across sleep duration tiers.",
        groups = group_stats
      )
    }
  }

  # 2. Study Hours Grouping vs Stress
  if ("study_hours" %in% colnames(clean_df) && "stress_score" %in% colnames(clean_df)) {
    study_df <- clean_df[!is.na(clean_df$study_hours) & !is.na(clean_df$stress_score), ]
    if (nrow(study_df) >= 3) {
      study_df$study_group <- ifelse(study_df$study_hours < 5, "< 5 Hours",
                              ifelse(study_df$study_hours <= 8, "5 - 8 Hours", "> 8 Hours"))

      groups <- unique(study_df$study_group)
      group_stats <- list()
      for (g in groups) {
        g_vals <- study_df$stress_score[study_df$study_group == g]
        group_stats[[length(group_stats) + 1]] <- list(
          group = g,
          sample_size = length(g_vals),
          mean_stress = round(mean(g_vals), 2),
          median_stress = round(stats::median(g_vals), 2),
          sd_stress = round(if (length(g_vals) > 1) stats::sd(g_vals) else 0, 2)
        )
      }

      comparisons[[length(comparisons) + 1]] <- list(
        group_variable = "study_hours",
        group_title = "Stress by Study Time",
        description = "Average stress levels relative to daily exam study hours.",
        groups = group_stats
      )
    }
  }

  # 3. Exam Type vs Stress (ANOVA test)
  if ("exam_type" %in% colnames(clean_df) && "stress_score" %in% colnames(clean_df)) {
    exam_df <- clean_df[!is.na(clean_df$exam_type) & !is.na(clean_df$stress_score), ]
    types <- unique(exam_df$exam_type)
    if (length(types) >= 2 && nrow(exam_df) >= 4) {
      group_stats <- list()
      for (t in types) {
        t_vals <- exam_df$stress_score[exam_df$exam_type == t]
        group_stats[[length(group_stats) + 1]] <- list(
          group = as.character(t),
          sample_size = length(t_vals),
          mean_stress = round(mean(t_vals), 2),
          median_stress = round(stats::median(t_vals), 2),
          sd_stress = round(if (length(t_vals) > 1) stats::sd(t_vals) else 0, 2)
        )
      }

      # ANOVA test
      anova_res <- tryCatch({
        fit <- stats::aov(stress_score ~ as.factor(exam_type), data = exam_df)
        summary_fit <- summary(fit)[[1]]
        f_val <- as.numeric(summary_fit[["F value"]][1])
        p_val <- as.numeric(summary_fit[["Pr(>F)"]][1])
        list(f_statistic = round(f_val, 2), p_value = round(p_val, 4), significant = (p_val < 0.05))
      }, error = function(e) NULL)

      comparisons[[length(comparisons) + 1]] <- list(
        group_variable = "exam_type",
        group_title = "Stress Across Exam Formats",
        description = "Evaluation of stress variance across differing exam types/subjects.",
        groups = group_stats,
        statistical_test = anova_res
      )
    }
  }

  # 4. Preparation Level vs Stress
  if ("preparation_level" %in% colnames(clean_df) && "stress_score" %in% colnames(clean_df)) {
    prep_df <- clean_df[!is.na(clean_df$preparation_level) & !is.na(clean_df$stress_score), ]
    types <- unique(prep_df$preparation_level)
    if (length(types) >= 2 && nrow(prep_df) >= 3) {
      group_stats <- list()
      for (t in types) {
        t_vals <- prep_df$stress_score[prep_df$preparation_level == t]
        group_stats[[length(group_stats) + 1]] <- list(
          group = as.character(t),
          sample_size = length(t_vals),
          mean_stress = round(mean(t_vals), 2),
          median_stress = round(stats::median(t_vals), 2),
          sd_stress = round(if (length(t_vals) > 1) stats::sd(t_vals) else 0, 2)
        )
      }

      comparisons[[length(comparisons) + 1]] <- list(
        group_variable = "preparation_level",
        group_title = "Stress by Self-Reported Readiness",
        description = "Observed stress scores among perceived preparation levels.",
        groups = group_stats
      )
    }
  }

  return(comparisons)
}

generate_findings_and_limitations <- function(descriptive_stats, stress_dist, correlations, group_comps, n_total) {
  findings <- c()
  limitations <- c()

  # Findings
  stress_desc <- descriptive_stats$stress_score
  if (!is.null(stress_desc)) {
    findings <- c(findings, paste0("The overall mean exam stress score was ", stress_desc$mean, " (SD = ", stress_desc$standard_deviation, ", Median = ", stress_desc$median, ") across ", stress_desc$sample_size, " analyzed records."))
  }

  if (!is.null(stress_dist$dominant_category)) {
    findings <- c(findings, paste0("The prevailing stress tier is '", stress_dist$dominant_category, "', representing ",
      stress_dist$categories[[which(sapply(stress_dist$categories, function(c) c$category == stress_dist$dominant_category))]]$percentage,
      "% of the sample."))
  }

  # Significant correlations
  for (corr in correlations) {
    if (isTRUE(corr$is_statistically_significant)) {
      direction <- if (corr$correlation > 0) "positive association" else "inverse association"
      findings <- c(findings, paste0("A statistically significant ", direction, " was found between '", corr$variable_1, "' and '", corr$variable_2, "' (r = ", corr$correlation, ", p = ", corr$p_value, ")."))
    }
  }

  # Limitations
  limitations <- c(limitations, "Observational survey design: observed statistical correlations do not establish cause-and-effect relationships.")
  limitations <- c(limitations, "Non-clinical instrument: high scores reflect survey self-report and do not constitute a medical or psychiatric diagnosis.")
  if (n_total < 50) {
    limitations <- c(limitations, paste0("Sample size is modest (N = ", n_total, "). Statistical power for detecting subtle effects is limited; interpretations should be made with appropriate restraint."))
  }
  limitations <- c(limitations, "Potential self-selection or response bias inherent to survey questionnaire participation.")

  list(findings = findings, limitations = limitations)
}

run_full_analysis <- function(validated_result, title = "Exam Stress Analysis") {
  clean_df <- validated_result$clean_data
  n_valid <- nrow(clean_df)

  # 1. Descriptive stats for all numeric fields
  numeric_cols <- intersect(c("stress_score", "sleep_hours", "study_hours", "anxiety_score", "caffeine_intake", "physical_activity_hours"), colnames(clean_df))
  desc_stats <- list()
  for (col in numeric_cols) {
    desc_stats[[col]] <- calc_descriptive_stats(clean_df[[col]])
  }

  # 2. Stress Distribution
  stress_dist <- classify_stress_distribution(clean_df$stress_score, validated_result$scoring_method)

  # 3. Correlations
  correlations <- calc_correlations(clean_df)

  # 4. Group Comparisons
  group_comparisons <- calc_group_comparisons(clean_df)

  # 5. Findings & Limitations
  text_outcomes <- generate_findings_and_limitations(desc_stats, stress_dist, correlations, group_comparisons, n_valid)

  # 6. Build chart payload
  chart_data <- list(
    distribution_bar = list(
      labels = sapply(stress_dist$categories, function(x) x$category),
      counts = sapply(stress_dist$categories, function(x) x$count),
      percentages = sapply(stress_dist$categories, function(x) x$percentage),
      colors = sapply(stress_dist$categories, function(x) x$color)
    ),
    comparisons = group_comparisons,
    correlations = correlations,
    boxplots = list(
      stress = desc_stats$stress_score
    )
  )

  # Summary paragraph
  summary_text <- paste0(
    "Analysis of ", n_valid, " exam records revealed an average stress score of ",
    desc_stats$stress_score$mean, " (SD = ", desc_stats$stress_score$standard_deviation, "). ",
    "The dataset reflects a dominant classification of '", stress_dist$dominant_category, "'. ",
    if (length(correlations) > 0) paste0("Identified ", sum(sapply(correlations, function(c) isTRUE(c$is_statistically_significant))), " significant variable correlation(s).") else ""
  )

  return(list(
    title = title,
    summary = summary_text,
    methodology = "Descriptive statistics, parametric/non-parametric group variance comparisons, and Pearson correlation coefficients with complete-case validation.",
    scoring_rules = list(
      method = validated_result$scoring_method,
      details = stress_dist$rules_description
    ),
    data_quality_summary = list(
      total_rows = validated_result$total_rows,
      valid_rows = validated_result$valid_rows,
      excluded_rows = validated_result$excluded_rows,
      duplicate_rows = validated_result$duplicate_rows,
      quality_score = validated_result$data_quality_score,
      column_quality = validated_result$column_quality
    ),
    descriptive_stats = desc_stats,
    stress_distribution = stress_dist,
    correlations = correlations,
    group_comparisons = group_comparisons,
    chart_data = chart_data,
    statistical_findings = text_outcomes$findings,
    limitations = text_outcomes$limitations
  ))
}
