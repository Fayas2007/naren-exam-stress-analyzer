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
  stress_stats <- analysis$descriptive_stats$stress_score
  mean_val <- if (!is.null(stress_stats$mean)) stress_stats$mean else "--"
  med_val <- if (!is.null(stress_stats$median)) stress_stats$median else "--"
  sd_val <- if (!is.null(stress_stats$standard_deviation)) stress_stats$standard_deviation else "--"
  iqr_val <- if (!is.null(stress_stats$iqr)) stress_stats$iqr else "--"
  min_val <- if (!is.null(stress_stats$min)) stress_stats$min else "--"
  max_val <- if (!is.null(stress_stats$max)) stress_stats$max else "--"
  n_val <- if (!is.null(analysis$data_quality_summary$valid_rows)) analysis$data_quality_summary$valid_rows else "--"
  dom_cat <- if (!is.null(analysis$stress_distribution$dominant_category)) analysis$stress_distribution$dominant_category else "Moderate Stress"

  # Table rows for descriptive stats
  stats_rows <- ""
  if (!is.null(analysis$descriptive_stats)) {
    for (v_name in names(analysis$descriptive_stats)) {
      st <- analysis$descriptive_stats[[v_name]]
      stats_rows <- paste0(stats_rows, "<tr>",
        "<td><strong>", v_name, "</strong></td>",
        "<td style='text-align:right;'>", st$sample_size, "</td>",
        "<td style='text-align:right;color:#2563EB;font-weight:bold;'>", st$mean, "</td>",
        "<td style='text-align:right;'>±", st$standard_deviation, "</td>",
        "<td style='text-align:right;'>", st$median, "</td>",
        "<td style='text-align:right;'>", st$iqr, "</td>",
        "<td style='text-align:right;'>", st$min, " - ", st$max, "</td></tr>")
    }
  }

  # Categories
  dist_rows <- ""
  if (!is.null(analysis$stress_distribution$categories)) {
    for (cat in analysis$stress_distribution$categories) {
      color <- if (!is.null(cat$color)) cat$color else "#3B82F6"
      dist_rows <- paste0(dist_rows, "<tr>",
        "<td><span style='display:inline-block;width:10px;height:10px;border-radius:50%;background:", color, ";margin-right:8px;'></span><strong>", cat$category, "</strong></td>",
        "<td>", cat$range, "</td>",
        "<td style='text-align:right;'>", cat$count, "</td>",
        "<td style='text-align:right;color:", color, ";font-weight:bold;'>", cat$percentage, "%</td></tr>")
    }
  }

  # Correlations
  corr_rows <- ""
  if (!is.null(analysis$correlations) && length(analysis$correlations) > 0) {
    for (c in analysis$correlations) {
      is_sig <- isTRUE(c$is_statistically_significant)
      corr_rows <- paste0(corr_rows, "<tr>",
        "<td><code>", c$variable_1, "</code> ↔ <code>", c$variable_2, "</code></td>",
        "<td style='text-align:right;font-weight:bold;'>", if (c$correlation > 0) paste0("+", c$correlation) else c$correlation, "</td>",
        "<td style='text-align:right;'>", c$p_value, "</td>",
        "<td style='text-align:center;'>", if (is_sig) "<span style='color:#166534;font-weight:bold;'>p < 0.05</span>" else "<span style='color:#64748B;'>n.s.</span>", "</td>",
        "<td>", c$strength, "</td></tr>")
    }
  }

  # HTML Output
  html <- paste0(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>", analysis$title, "</title>",
    "<style>",
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1E293B; max-width: 850px; margin: 0 auto; padding: 28px 20px; background: #FFFFFF; }",
    "h1 { color: #0F172A; border-bottom: 3px solid #2563EB; padding-bottom: 12px; margin-top: 0; font-size: 24px; }",
    "h2 { color: #0F172A; margin-top: 28px; font-size: 17px; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 6px; }",
    "h3 { color: #334155; font-size: 14px; margin-top: 18px; margin-bottom: 6px; }",
    "table { width: 100%; border-collapse: collapse; margin: 12px 0 20px 0; font-size: 12.5px; }",
    "th { background-color: #F1F5F9; text-align: left; padding: 8px 10px; border: 1px solid #CBD5E1; font-weight: 700; color: #334155; }",
    "td { padding: 8px 10px; border: 1px solid #CBD5E1; color: #1E293B; }",
    "tr:nth-child(even) { background-color: #F8FAFC; }",
    ".kpi-grid { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px; }",
    ".kpi-box { flex:1 1 18%; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px; text-align:center; }",
    ".console-box { background:#0F172A; color:#F8FAFC; border-radius:8px; padding:12px; font-family:monospace; font-size:11px; margin:12px 0; border:1px solid #334155; }",
    ".console-box pre { margin:0; white-space:pre-wrap; }",
    "</style></head><body>",
    "<h1>", analysis$title, "</h1>",
    "<p style='color:#64748B;font-size:13px;'><strong>Dataset:</strong> ", analysis$original_filename, " &bull; <strong>Engine:</strong> R 4.3.2 (ggplot2 & stats) &bull; <strong>Classification:</strong> ", dom_cat, "</p>",

    "<div class='kpi-grid'>",
    "<div class='kpi-box'><div style='font-size:10px;color:#64748B;'>MEAN STRESS</div><div style='font-size:18px;font-weight:bold;color:#2563EB;'>", mean_val, "</div><div style='font-size:10px;color:#94A3B8;'>SD ±", sd_val, "</div></div>",
    "<div class='kpi-box'><div style='font-size:10px;color:#64748B;'>MEDIAN STRESS</div><div style='font-size:18px;font-weight:bold;'>", med_val, "</div><div style='font-size:10px;color:#94A3B8;'>IQR: ", iqr_val, "</div></div>",
    "<div class='kpi-box'><div style='font-size:10px;color:#64748B;'>OBSERVED RANGE</div><div style='font-size:18px;font-weight:bold;'>", min_val, " - ", max_val, "</div><div style='font-size:10px;color:#94A3B8;'>Min / Max</div></div>",
    "<div class='kpi-box'><div style='font-size:10px;color:#64748B;'>ANALYZED RECORDS</div><div style='font-size:18px;font-weight:bold;color:#059669;'>", n_val, "</div><div style='font-size:10px;color:#94A3B8;'>Valid sample</div></div>",
    "</div>",

    "<h2>1. Executive Summary & Methodology</h2>",
    "<p>", analysis$summary, "</p>",
    "<p style='font-size:12.5px;color:#475569;'><strong>Methodology:</strong> ", analysis$methodology, "</p>",

    "<h2>2. Stress Level Classification Distribution</h2>",
    "<table><thead><tr><th>Classification</th><th>Score Range</th><th style='text-align:right;'>Record Count</th><th style='text-align:right;'>Percentage</th></tr></thead><tbody>",
    dist_rows,
    "</tbody></table>",

    "<h2>3. R Statistical Analysis Console (8 Analytical Dimensions)</h2>",
    "<h3>R Console &mdash; Continuous Density & Regression Scripts</h3>",
    "<div class='console-box'><pre><code># R Script: Bivariate Regressions & Density Modeling
library(ggplot2)

# 1. Continuous Distribution
ggplot(exam_data, aes(x = stress_score)) +
  geom_histogram(aes(y = after_stat(density)), binwidth = 1.0, fill = '#3B82F6', alpha = 0.6) +
  geom_density(color = '#1D4ED8', linewidth = 1.2) +
  geom_vline(aes(xintercept = mean(stress_score)), color = '#DC2626', linetype = 'dashed')

# 2. Linear Regression (Stress vs Anxiety)
fit_anxiety <- lm(stress_score ~ anxiety_score, data = exam_data)
summary(fit_anxiety)</code></pre></div>",

    "<h2>4. Descriptive Statistics Matrix</h2>",
    "<table><thead><tr><th>Variable</th><th style='text-align:right;'>N</th><th style='text-align:right;'>Mean</th><th style='text-align:right;'>SD</th><th style='text-align:right;'>Median</th><th style='text-align:right;'>IQR</th><th style='text-align:right;'>Min - Max</th></tr></thead><tbody>",
    stats_rows,
    "</tbody></table>",

    "<h2>5. Correlation Matrix (Pearson r)</h2>",
    "<table><thead><tr><th>Variable Pair</th><th style='text-align:right;'>Pearson r</th><th style='text-align:right;'>p-value</th><th style='text-align:center;'>Significance</th><th>Strength</th></tr></thead><tbody>",
    corr_rows,
    "</tbody></table>",

    "<div style='margin-top:30px;border-top:1px solid #CBD5E1;padding-top:10px;font-size:11px;color:#94A3B8;text-align:center;'>",
    "Official Analytical Report &bull; Exam Stress Analyzer R Platform",
    "</div>",
    "</body></html>"
  )
  return(html)
}
