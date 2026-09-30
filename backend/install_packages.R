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

message(">>> Checking and installing required R packages...")

# Try Posit Package Manager for pre-compiled Linux binaries first to prevent build timeouts,
# then fall back to cloud.r-project.org
repos_to_use <- c(
  "https://packagemanager.posit.co/cran/__linux__/focal/latest",
  "https://packagemanager.posit.co/cran/__linux__/jammy/latest",
  "https://packagemanager.posit.co/cran/latest",
  "https://cloud.r-project.org"
)

for (pkg in required_packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    message(paste(">>> Installing package:", pkg))
    installed <- FALSE
    for (repo in repos_to_use) {
      tryCatch({
        install.packages(pkg, repos = repo, quiet = TRUE)
        if (requireNamespace(pkg, quietly = TRUE)) {
          installed <- TRUE
          message(paste(">>> Successfully installed:", pkg, "from", repo))
          break
        }
      }, error = function(e) {
        # continue to next repo
      })
      if (installed) break
    }
  } else {
    message(paste(">>> Package already installed:", pkg))
  }
}

# Verify critical packages
critical <- c("plumber", "DBI", "RPostgres", "jsonlite")
for (pkg in critical) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    stop(paste("CRITICAL ERROR: Failed to install required package:", pkg))
  }
}

message(">>> All required R packages are ready!")
