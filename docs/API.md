# Exam Stress Analyzer - REST API Specification

The Exam Stress Analyzer backend is built using R and the **Plumber** REST framework, interfacing with **Neon PostgreSQL** via `DBI` and `RPostgres`, and **Google Gemini LLM** for grounded conversational insights.

Base URL (Local Development): `http://127.0.0.1:8000` (or `http://10.0.2.2:8000` for Android Emulator)

---

## 1. System Health

### `GET /health`
Verifies server health and database connectivity.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "app": "Exam Stress Analyzer API",
  "version": "1.0.0",
  "engine": "R 4.6.1 + Plumber",
  "database": {
    "status": "connected",
    "engine": "Neon PostgreSQL",
    "tables_checked": 8
  },
  "timestamp": "2026-09-29T16:20:00Z"
}
```

---

## 2. Authentication & Sessions

### `POST /auth/register`
Creates a new researcher or student account with SHA-256 salted password hashing.

**Request Body**:
```json
{
  "email": "user@university.edu",
  "password": "StrongPassword123!",
  "full_name": "Dr. Elena Rostova",
  "institution": "Department of Cognitive Psychology"
}
```

**Response `201 Created`**:
```json
{
  "message": "User registered successfully",
  "token": "a1b2c3d4e5...",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@university.edu",
    "full_name": "Dr. Elena Rostova",
    "institution": "Department of Cognitive Psychology",
    "language_pref": "en"
  },
  "expires_at": "2026-10-29T16:20:00Z"
}
```

### `POST /auth/login`
Authenticates user credentials and generates a 32-byte cryptographic session token.

**Request Body**:
```json
{
  "email": "user@university.edu",
  "password": "StrongPassword123!"
}
```

**Response `200 OK`**:
```json
{
  "message": "Login successful",
  "token": "a1b2c3d4e5...",
  "user": { ... },
  "expires_at": "2026-10-29T16:20:00Z"
}
```

### `GET /auth/me`
Retrieves current authenticated profile from the session token.
- **Header**: `Authorization: Bearer <TOKEN>`

---

## 3. Dataset Upload & Validation

### `POST /datasets/upload`
Uploads a CSV file (multipart form or JSON payload) and extracts column types and sample rows.
- **Header**: `Authorization: Bearer <TOKEN>`

**Request Body (JSON option)**:
```json
{
  "csv_text": "student_id,stress_score,sleep_hours\n1,7.2,6.5\n...",
  "filename": "survey_midterm.csv"
}
```

**Response `201 Created`**:
```json
{
  "dataset_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "filename": "survey_midterm.csv",
  "total_rows": 120,
  "total_columns": 8,
  "file_size_bytes": 14500,
  "columns": {
    "stress_score": {
      "name": "stress_score",
      "type": "numeric",
      "missing_count": 0,
      "sample_values": [6.5, 8.2, 4.1],
      "suggested_mapping": "stress_score"
    }
  },
  "preview_rows": [ ... ]
}
```

### `POST /datasets/validate`
Validates column mappings against the data and computes a data quality scorecard.
- **Header**: `Authorization: Bearer <TOKEN>`

**Request Body**:
```json
{
  "dataset_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "column_mappings": {
    "stress_score": "stress_score",
    "sleep_hours": "sleep_hours",
    "study_hours": "study_hours",
    "preparation_level": "preparation_level",
    "exam_type": "exam_type",
    "anxiety_score": "anxiety_score"
  },
  "missing_handling_method": "exclude_incomplete_records",
  "scoring_method": "standard_numeric_scale"
}
```

**Response `200 OK`**:
```json
{
  "dataset_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "is_valid": true,
  "errors": [],
  "warnings": [],
  "total_rows": 120,
  "valid_rows": 118,
  "excluded_rows": 2,
  "duplicate_rows": 0,
  "data_quality_score": 98.3,
  "column_quality": { ... },
  "stress_range": { "min": 2.0, "max": 9.5 }
}
```

---

## 4. Statistical Analysis Engine

### `POST /analyses`
Runs the complete R statistical engine: descriptive stats, classification distributions, Pearson correlation matrix with p-values, subgroup ANOVA comparisons, and methodological findings.
- **Header**: `Authorization: Bearer <TOKEN>`

**Response `201 Created`**:
```json
{
  "id": "e8d9a102-...",
  "dataset_id": "9b1deb4d-...",
  "title": "Midterm Survey 2025",
  "descriptive_stats": {
    "stress_score": {
      "count": 118,
      "mean": 6.84,
      "standard_deviation": 1.42,
      "median": 7.0,
      "iqr": 2.1,
      "min": 2.0,
      "max": 9.5,
      "skewness": -0.31
    }
  },
  "stress_distribution": {
    "dominant_category": "High Stress",
    "categories": [
      { "category": "Low Stress", "count": 22, "percentage": 18.6, "color": "#16A34A" },
      { "category": "Moderate Stress", "count": 48, "percentage": 40.7, "color": "#F59E0B" },
      { "category": "High Stress", "count": 48, "percentage": 40.7, "color": "#DC2626" }
    ]
  },
  "correlations": [
    { "var1": "stress_score", "var2": "sleep_hours", "r": -0.682, "p_value": 0.0001, "significance": "p < 0.001" },
    { "var1": "stress_score", "var2": "anxiety_score", "r": 0.741, "p_value": 0.0001, "significance": "p < 0.001" }
  ],
  "statistical_findings": [ ... ],
  "limitations": [ ... ]
}
```

### `GET /analyses`
List all analyses belonging to the authenticated user. Supports `?q=` search and `?sort_by=recent|oldest`.

### `GET /analyses/{id}`
Retrieve full analysis JSON by ID.

### `GET /analyses/{id}/report`
Generates publication-ready Markdown and HTML analytical reports with methodological disclosures.

---

## 5. AI Chatbot (Exam Stress Assistant)

### `POST /chat`
Sends a question to the Google Gemini AI assistant grounded strictly in calculated R statistics.
- **Header**: `Authorization: Bearer <TOKEN>`

**Request Body**:
```json
{
  "message": "What is the relationship between sleep duration and exam stress?",
  "analysis_id": "e8d9a102-..."
}
```

**Response `200 OK`**:
```json
{
  "assistant_reply": "Based on the Pearson correlation analysis of your dataset (N = 118), sleep hours and exam stress exhibit a strong negative correlation (r = -0.68, p < 0.001)...",
  "session_id": "948e9102-...",
  "grounded_metrics": { ... }
}
```

### `GET /chat/history`
Retrieves chat sessions and message history.

---

## 6. Profile & Account Management

### `GET /profile`
Retrieves user profile and account statistics (total datasets, analyses, chat sessions).

### `PATCH /profile`
Updates user profile fields (`full_name`, `institution`, `language_pref`).

### `DELETE /profile`
Permanently deletes the user account and cascading data (datasets, analyses, chats).
