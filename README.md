# Exam Stress Analyzer 📊🧠

**Exam Stress Analyzer** is a full-stack, production-oriented mobile application and analytical platform engineered for academic researchers, educators, and students. It provides CSV dataset ingestion, validation, R-powered statistical computation, interactive analytical visualization, publication-ready reporting, and AI-assisted interpretation grounded strictly in calculated statistics.

---

## 🏗 System Architecture

```
                                +-----------------------------------+
                                |      React Native / Expo App      |
                                |     (TypeScript + Expo Router)    |
                                +-----------------+-----------------+
                                                  |
                                    REST APIs (HTTP / JSON)
                                                  |
                                                  v
                                +-----------------------------------+
                                |          R Plumber Backend        |
                                |    (R 4.6.1 + plumber + dplyr)    |
                                +--------+-----------------+--------+
                                         |                 |
                    +--------------------+                 +--------------------+
                    |                                                           |
                    v                                                           v
  +-----------------------------------+                       +-----------------------------------+
  |          Neon PostgreSQL          |                       |       Google Gemini LLM API       |
  |  (DBI + RPostgres, SSL Encrypted) |                       |   (Grounded in R calculations)    |
  +-----------------------------------+                       +-----------------------------------+
```

---

## 🚀 Key Features

1. **Secure Authentication & Session Security**:
   - SHA-256 salted password hashing.
   - 32-byte cryptographically secure session tokens stored exclusively as hashes in Neon PostgreSQL.
   - Session tokens securely stored on device using `expo-secure-store`.
2. **Dynamic CSV Ingestion & Mapping**:
   - File picker via `expo-document-picker` with size enforcement.
   - Column auto-detection with intelligent heuristic mapping.
   - Support for arbitrary survey designs (not hardcoded to a single university or exam format).
3. **Data Quality Scorecard**:
   - Duplicate detection, missing-value profiling, data completeness score (0–100%).
   - Explicit missing-value handling (`exclude_incomplete_records` or `pairwise_complete`).
4. **Rigorous Statistical Engine (R)**:
   - Descriptive Statistics: Mean, SD, Median, IQR, Min/Max, Skewness.
   - Stress Distribution Classification with defensible classification schemes.
   - Pearson Correlation Matrix with exact two-tailed p-values.
   - Subgroup Comparisons & ANOVA (e.g. stress by sleep duration, preparation tier, exam type).
   - Automated statistical findings and methodological limitations disclosures.
5. **Interactive Mobile Dashboards**:
   - Built with pure bright, professional white/blue design system (`#2563EB`, `#FFFFFF`, `#F7F9FC`).
   - Custom SVG distribution charts, subgroup bar comparisons, correlation matrices, and metrics scorecards.
6. **Publication-Ready Reports & Export**:
   - Formatted Markdown and HTML report generation.
   - Device PDF generation and sharing via `expo-print` and `expo-sharing`.
   - CSV data summary export.
7. **Exam Stress Assistant (AI Chatbot)**:
   - Google Gemini API integration executed securely from the R backend.
   - Grounded context injection: answers are constrained strictly to deterministic R calculations to prevent hallucinations.
   - Professional mental health boundary disclosures and supportive resources.

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── api/                     # Plumber REST API routes
│   │   ├── routes_health.R
│   │   ├── routes_auth.R
│   │   ├── routes_datasets.R
│   │   ├── routes_analyses.R
│   │   ├── routes_chat.R
│   │   └── routes_profile.R
│   ├── modules/                 # Core backend modules
│   │   ├── config.R             # Environment & secrets configuration
│   │   ├── db.R                 # Neon PostgreSQL connection pool & migrations
│   │   ├── auth.R               # Password hashing & token authentication
│   │   ├── csv_parser.R         # CSV parsing & column inference
│   │   ├── validation.R         # Data quality & mapping validator
│   │   ├── statistics.R         # Complete statistical calculation engine
│   │   ├── reporting.R          # Markdown/HTML report generator
│   │   └── chatbot.R            # Gemini LLM client with statistical grounding
│   ├── tests/                   # Automated unit & E2E tests
│   │   ├── test_auth.R
│   │   ├── test_validation.R
│   │   ├── test_statistics.R
│   │   └── test_api_e2e.R
│   ├── .env.example
│   ├── server.R                 # Plumber router & middleware
│   └── run_server.R             # Server launcher script
├── mobile/
│   ├── app/                     # Expo Router file-based screens
│   │   ├── (auth)/              # Onboarding, Login, Register
│   │   ├── (tabs)/              # Home, Analyses, Assistant, Profile
│   │   ├── upload/              # CSV Upload & Validation screens
│   │   ├── analysis/            # Analytical Dashboard & Report screens
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── src/
│   │   ├── api/                 # Strongly-typed API client services
│   │   ├── components/          # Reusable UI component library
│   │   ├── constants/           # Design system tokens & colors
│   │   ├── context/             # AuthContext state management
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # SecureStore & helpers
│   ├── .env.example
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql  # Neon PostgreSQL schema migrations
├── sample_data/                 # Synthetic datasets for testing
│   ├── student_exam_stress_sample.csv
│   ├── high_school_finals_stress.csv
│   └── medical_board_exam_stress.csv
├── docs/
│   └── API.md                   # REST API documentation
└── README.md
```

---

## 🛠 Local Setup & Running Instructions

### Prerequisites
1. **R (v4.0+)**: Installed locally with binary packages (`plumber`, `DBI`, `RPostgres`, `readr`, `dplyr`, `tidyr`, `jsonlite`, `openssl`, `digest`, `httr`).
2. **Node.js (v18+)**: Installed with `npm` or `npx`.
3. **Neon PostgreSQL Database**: A free serverless PostgreSQL database from [Neon.tech](https://neon.tech).

---

### Step 1: Backend Configuration

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your Neon PostgreSQL connection string and Gemini API key:
   ```ini
   DATABASE_URL=postgresql://neondb_owner:<password>@<neon-host>/neondb?sslmode=require
   AI_API_KEY=your_gemini_api_key_here
   AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
   AI_MODEL=gemini-1.5-flash
   PORT=8000
   APP_ENV=development
   ```
4. Start the R Plumber server:
   ```bash
   Rscript run_server.R
   ```
   *The server will automatically apply database migrations and start listening on `http://127.0.0.1:8000`.*

---

### Step 2: Mobile App Configuration

1. Navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set the backend API URL:
   - **For Web / iOS Simulator**: `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000`
   - **For Android Emulator**: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000` *(Android emulators route host machine localhost via 10.0.2.2)*
   - **For Physical Devices on LAN**: `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LOCAL_IP>:8000`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the Expo development server:
   ```bash
   npx expo start
   ```
6. Press `w` for web preview, `a` for Android emulator, or scan the QR code with the Expo Go mobile app.

---

## 🧪 Running Automated Tests

### Backend Unit & Integration Tests
Run R unit tests for validation, statistical algorithms, and authentication:
```bash
# Run statistical engine tests
Rscript backend/tests/test_statistics.R

# Run validation engine tests
Rscript backend/tests/test_validation.R

# Run authentication and security tests
Rscript backend/tests/test_auth.R

# Run full End-to-End API lifecycle test
Rscript backend/tests/test_api_e2e.R
```

### Mobile TypeScript Verification
Verify complete type safety across all screens and components:
```bash
cd mobile
npx tsc --noEmit
```

---

## 🔒 Security Best Practices

- **Zero Container Isolation Dependency**: Operates natively in local R and Node.js runtimes.
- **No Secrets in Mobile Bundle**: The mobile client only knows the backend URL; database credentials and AI API keys are isolated strictly within the R backend `.env`.
- **Parameterized SQL Queries**: All database queries use `$1, $2` parameters via `RPostgres` to prevent SQL injection.
- **Session Token Hashing**: Session tokens are hashed via SHA-256 before storage in PostgreSQL, protecting user sessions even in the event of a database snapshot exposure.
- **Grounded AI Safeguards**: LLM prompts include explicit system constraints and pre-computed R metrics to prevent hallucination of non-existent correlations or diagnoses.
