# backend/tests/test_auth.R
# Tests for authentication, password hashing, and token generation

source("modules/config.R")
source("modules/auth.R")

test_auth_functions <- function() {
  # Test password hashing
  pw <- "SecretPassword123"
  hash1 <- hash_password(pw)
  hash2 <- hash_password(pw)

  stopifnot(identical(hash1, hash2))
  stopifnot(isTRUE(verify_password(pw, hash1)))
  stopifnot(isFALSE(verify_password("WrongPassword", hash1)))

  # Test token generation & hashing
  token <- generate_session_token()
  stopifnot(nchar(token) >= 32)
  token_hash <- hash_session_token(token)
  stopifnot(nchar(token_hash) == 64)

  message("[PASS] Auth crypto & password hashing tests passed!")
}

test_auth_functions()
message("[ALL PASS] test_auth.R completed successfully.")
