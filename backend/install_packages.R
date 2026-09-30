# backend/install_packages.R
# Automates installation of required CRAN packages for Exam Stress Analyzer

required_packages <- c(
  "plumber",
  "DBI",
  "RPostgres",
  "readr",
  "dplyr",
  "tidyr",
  "jsonlite",
  "openssl",
  "digest",
  "httr2",
  "httr"
)

message("Checking and installing required R packages...")

for (pkg in required_packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    message(paste("Installing package:", pkg))
    install.packages(pkg, repos = "https://cloud.r-project.org", quiet = FALSE)
  } else {
    message(paste("Package already installed:", pkg))
  }
}

message("All required R packages are ready!")
