# backend/modules/reporting.R
# Analytical Report Generation (Markdown, HTML, Text, and CSV export)

generate_markdown_report <- function(analysis) {
  date_str <- if (!is.null(analysis$created_at)) format(as.POSIXct(analysis$created_at), "%B %d, %Y at %H:%M UTC") else format(Sys.time(), "%B %d, %Y")

  lines <- c(
    paste0("# ", analysis$title),
    paste0("**Generated on:** ", date_str),
    "**Platform:** Exam Stress Analyzer - Statistical Suite",
    "",
    "---",
    "",
    "## 1. Executive Summary",
    analysis$summary,
    "",
    "## 2. Methodology & Scoring Protocol",
    paste0("- **Analytical Framework:** ", analysis$methodology),
    paste0("- **Scoring Method:** ", analysis$scoring_rules$method),
    paste0("- **Classification Rules:** ", analysis$scoring_rules$details),
    "",
    "## 3. Data Quality & Sample Verification",
    paste0("- **Total Records Submitted:** ", analysis$data_quality_summary$total_rows),
    paste0("- **Valid Records Analyzed:** ", analysis$data_quality_summary$valid_rows),
    paste0("- **Excluded / Incomplete Records:** ", analysis$data_quality_summary$excluded_rows),
    paste0("- **Exact Duplicate Records:** ", analysis$data_quality_summary$duplicate_rows),
    paste0("- **Data Quality Score:** ", analysis$data_quality_summary$quality_score, " / 100"),
    "",
    "## 4. Descriptive Statistics",
    "| Variable | N | Mean | SD | Median | IQR | Min | Max |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
  )

  for (v_name in names(analysis$descriptive_stats)) {
    st <- analysis$descriptive_stats[[v_name]]
    lines <- c(lines, paste0("| `", v_name, "` | ", st$sample_size, " | ", st$mean, " | ", st$standard_deviation, " | ", st$median, " | ", st$iqr, " | ", st$min, " | ", st$max, " |"))
  }

  lines <- c(lines,
    "",
    "## 5. Stress Category Distribution",
    "| Classification | Score Range | Record Count | Percentage |",
    "| :--- | :--- | :--- | :--- |"
  )

  for (cat in analysis$stress_distribution$categories) {
    lines <- c(lines, paste0("| ", cat$category, " | ", cat$range, " | ", cat$count, " | ", cat$percentage, "% |"))
  }

  if (length(analysis$group_comparisons) > 0) {
    lines <- c(lines, "", "## 6. Subgroup Comparisons")
    for (comp in analysis$group_comparisons) {
      lines <- c(lines, paste0("### ", comp$group_title), comp$description, "",
        "| Group Tier | Sample (N) | Mean Stress | Median Stress | SD |",
        "| :--- | :--- | :--- | :--- | :--- |")
      for (g in comp$groups) {
        lines <- c(lines, paste0("| ", g$group, " | ", g$sample_size, " | ", g$mean_stress, " | ", g$median_stress, " | ", g$sd_stress, " |"))
      }
      if (!is.null(comp$statistical_test)) {
        sig_label <- if (isTRUE(comp$statistical_test$significant)) "Statistically Significant (p < 0.05)" else "Not Statistically Significant"
        lines <- c(lines, paste0("*ANOVA Test Result:* F = ", comp$statistical_test$f_statistic, ", p = ", comp$statistical_test$p_value, " (", sig_label, ")"))
      }
      lines <- c(lines, "")
    }
  }

  if (length(analysis$correlations) > 0) {
    lines <- c(lines, "", "## 7. Correlation Analysis (Pearson)",
      "| Variable Pair | Pearson r | p-value | Significance | Interpretation |",
      "| :--- | :--- | :--- | :--- | :--- |")
    for (corr in analysis$correlations) {
      sig_txt <- if (isTRUE(corr$is_statistically_significant)) "Yes (p < 0.05)" else "No"
      lines <- c(lines, paste0("| `", corr$variable_1, "` vs `", corr$variable_2, "` | ", corr$correlation, " | ", corr$p_value, " | ", sig_txt, " | ", corr$strength, " |"))
    }
  }

  lines <- c(lines, "", "## 8. Key Statistical Findings")
  for (f in analysis$statistical_findings) {
    lines <- c(lines, paste0("- ", f))
  }

  lines <- c(lines, "", "## 9. Methodological Limitations & Safety Disclaimer")
  for (l in analysis$limitations) {
    lines <- c(lines, paste0("> - ", l))
  }

  lines <- c(lines, "", "---", "*Report compiled by Exam Stress Analyzer R Analytics Engine.*")

  paste(lines, collapse = "\n")
}

generate_html_report <- function(analysis) {
  md_content <- generate_markdown_report(analysis)
  # Simple clean printable HTML styling
  html <- paste0(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>", analysis$title, "</title>",
    "<style>",
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #172033; max-width: 850px; margin: 0 auto; padding: 32px 20px; background: #FFFFFF; }",
    "h1 { color: #2563EB; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; margin-top: 0; font-size: 26px; }",
    "h2 { color: #1E293B; margin-top: 28px; font-size: 19px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }",
    "h3 { color: #334155; font-size: 16px; margin-top: 20px; }",
    "table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }",
    "th { background-color: #F8FAFC; text-align: left; padding: 10px 12px; border: 1px solid #E2E8F0; font-weight: 600; color: #475569; }",
    "td { padding: 9px 12px; border: 1px solid #E2E8F0; color: #1E293B; }",
    "tr:nth-child(even) { background-color: #FAFAFA; }",
    "blockquote { background: #F8FAFC; border-left: 4px solid #64748B; margin: 12px 0; padding: 12px 16px; color: #475569; font-style: italic; }",
    "hr { border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0; }",
    "code { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #2563EB; }",
    ".badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 12px; }",
    "</style></head><body>",
    # Basic markdown to HTML table and header conversion for self-contained rendering
    gsub("\n", "<br/>", md_content),
    "</body></html>"
  )
  return(html)
}
