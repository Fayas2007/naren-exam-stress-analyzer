# backend/api/routes_auth.R
# User Authentication Routes

#* Register a new user
#* @post /register
#* @serializer unboxedJSON
function(req, res) {
  body <- get_request_body(req)
  email <- body$email
  password <- body$password
  full_name <- body$full_name
  institution <- body$institution

  if (is.null(email) || is.null(password) || is.null(full_name)) {
    res$status <- 400
    return(list(error = "Missing required fields: email, password, full_name."))
  }

  tryCatch({
    user <- register_user(email, password, full_name, institution)
    login_info <- login_user(email, password)
    res$status <- 201
    return(list(
      message = "User registered successfully",
      token = login_info$token,
      user = login_info$user,
      expires_at = login_info$expires_at
    ))
  }, error = function(e) {
    res$status <- 400
    return(list(error = e$message))
  })
}

#* Login with email and password
#* @post /login
#* @serializer unboxedJSON
function(req, res) {
  body <- get_request_body(req)
  email <- body$email
  password <- body$password

  if (is.null(email) || is.null(password)) {
    res$status <- 400
    return(list(error = "Both email and password are required."))
  }

  tryCatch({
    login_info <- login_user(email, password)
    return(list(
      message = "Login successful",
      token = login_info$token,
      user = login_info$user,
      expires_at = login_info$expires_at
    ))
  }, error = function(e) {
    res$status <- 401
    return(list(error = e$message))
  })
}

#* Logout current session
#* @post /logout
#* @serializer unboxedJSON
function(req, res) {
  token <- req$auth_token
  if (is.null(token)) {
    res$status <- 401
    return(list(error = "Unauthorized"))
  }

  logout_user(token)
  return(list(message = "Logged out successfully"))
}

#* Get currently authenticated user details
#* @get /me
#* @serializer unboxedJSON
function(req, res) {
  user <- req$current_user
  if (is.null(user)) {
    res$status <- 401
    return(list(error = "Unauthorized: Please log in."))
  }

  return(list(
    user = user
  ))
}
