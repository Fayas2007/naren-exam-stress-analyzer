# backend/modules/db.R
# Neon PostgreSQL Database Connection & Query Management using DBI & RPostgres

source("modules/config.R", local = TRUE)

parse_database_url <- function(url) {
  # Format: postgresql://username:password@host[:port]/database?params
  pattern <- "^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+)(?::([0-9]+))?/([^?]+)(?:\\?(.*))?$"
  matches <- regexec(pattern, url, perl = TRUE)
  parts <- regmatches(url, matches)[[1]]

  if (length(parts) < 6) {
    stop("Invalid PostgreSQL DATABASE_URL format")
  }

  user <- parts[2]
  password <- parts[3]
  host <- parts[4]
  # For Neon PostgreSQL, use direct connection (without -pooler) so prepared statements work seamlessly with DBI/RPostgres
  if (grepl("-pooler\\.", host)) {
    host <- sub("-pooler\\.", ".", host)
  }
  port <- if (nzchar(parts[5])) as.integer(parts[5]) else 5432L
  dbname <- parts[6]

  list(
    user = user,
    password = password,
    host = host,
    port = port,
    dbname = dbname,
    sslmode = "require"
  )
}

get_db_connection <- function() {
  db_url <- get_database_url()
  params <- parse_database_url(db_url)

  conn <- DBI::dbConnect(
    RPostgres::Postgres(),
    dbname = params$dbname,
    host = params$host,
    port = params$port,
    user = params$user,
    password = params$password,
    sslmode = params$sslmode
  )
  return(conn)
}

# Safe query execution helper with auto-disconnect
db_query <- function(sql, params = list()) {
  conn <- get_db_connection()
  on.exit(DBI::dbDisconnect(conn), add = TRUE)

  if (length(params) == 0) {
    res <- DBI::dbGetQuery(conn, sql)
  } else {
    res <- DBI::dbGetQuery(conn, sql, params = params)
  }
  return(res)
}

# Safe execute statement helper (INSERT / UPDATE / DELETE)
db_execute <- function(sql, params = list()) {
  conn <- get_db_connection()
  on.exit(DBI::dbDisconnect(conn), add = TRUE)

  if (length(params) == 0) {
    res <- DBI::dbExecute(conn, sql)
  } else {
    res <- DBI::dbExecute(conn, sql, params = params)
  }
  return(res)
}

# Run database migrations from SQL file
run_migrations <- function(sql_path = "../database/migrations/001_initial_schema.sql") {
  if (!file.exists(sql_path)) {
    # Try alternate path
    sql_path <- "database/migrations/001_initial_schema.sql"
  }
  if (!file.exists(sql_path)) {
    stop(paste("Migration file not found at", sql_path))
  }

  conn <- get_db_connection()
  on.exit(DBI::dbDisconnect(conn), add = TRUE)

  sql_content <- readChar(sql_path, file.info(sql_path)$size)
  statements <- strsplit(sql_content, ";")[[1]]

  message("[DB] Starting database migration...")
  for (stmt in statements) {
    stmt_clean <- trimws(stmt)
    if (nzchar(stmt_clean)) {
      tryCatch({
        DBI::dbExecute(conn, stmt_clean)
      }, error = function(e) {
        message("[DB] Migration warning: ", e$message)
      })
    }
  }
  message("[DB] Migrations completed successfully!")
}
