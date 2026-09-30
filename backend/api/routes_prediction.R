# backend/api/routes_prediction.R
# Endpoints for Exam Stress Prediction Module

if (!exists("predict_exam_stress")) {
  if (file.exists("modules/prediction.R")) {
    source("modules/prediction.R")
  } else if (file.exists("../modules/prediction.R")) {
    source("../modules/prediction.R")
  }
}

#* Predict exam stress score, level, probabilities, and factor impacts
#* @post /
#* @post /stress
#* @serializer unboxedJSON
function(req, res) {
  body <- get_request_body(req)

  result <- tryCatch({
    predict_exam_stress(body)
  }, error = function(e) {
    res$status <- 400
    list(
      error = "Prediction Error",
      message = as.character(e$message)
    )
  })

  return(result)
}

#* Get Prediction Model Metadata and Input Options
#* @get /options
#* @serializer unboxedJSON
function() {
  list(
    examination_types = list(
      list(id = "Final Exam", label = "Final Examination", category = "High Stakes", icon = "award"),
      list(id = "Midterm", label = "Midterm Examination", category = "Moderate Stakes", icon = "file-text"),
      list(id = "Standardized Test", label = "Standardized Entrance Test (e.g. GRE/SAT)", category = "High Stakes", icon = "check-circle"),
      list(id = "Oral Exam", label = "Oral Defense / Viva", category = "Evaluation", icon = "user-check"),
      list(id = "Lab Practical", label = "Laboratory Practical", category = "Practical", icon = "cpu"),
      list(id = "Weekly Quiz", label = "Weekly Formative Quiz", category = "Low Stakes", icon = "clock")
    ),
    preparation_levels = list(
      list(id = "Low", label = "Low Preparation", description = "Incomplete syllabus coverage, minimal revision"),
      list(id = "Medium", label = "Moderate Preparation", description = "Core concepts covered, standard practice completed"),
      list(id = "High", label = "Comprehensive Preparation", description = "All materials revised, mock exams passed")
    ),
    ranges = list(
      study_hours = list(min = 0, max = 16, default = 5.0, step = 0.5),
      sleep_hours = list(min = 2, max = 14, default = 7.0, step = 0.5),
      anxiety_score = list(min = 0, max = 10, default = 5.0, step = 1.0)
    )
  )
}
