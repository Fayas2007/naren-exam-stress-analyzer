// mobile/src/types/index.ts
// TypeScript Interfaces for Exam Stress Analyzer

export interface User {
  id: string;
  email: string;
  full_name: string;
  institution?: string;
  language_pref?: string;
  created_at?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
  expires_at?: string;
  error?: string;
}

export interface ColumnPreviewInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'text';
  suggested_mapping?: string | null;
  missing_count: number;
  sample_values: (string | number)[];
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  file_size_bytes: number;
  columns: Record<string, ColumnPreviewInfo>;
  preview_rows: Record<string, any>[];
  error?: string;
}

export interface ColumnMappingState {
  stress_score: string;
  sleep_hours?: string;
  study_hours?: string;
  preparation_level?: string;
  exam_type?: string;
  anxiety_score?: string;
  caffeine_intake?: string;
  physical_activity_hours?: string;
}

export interface ValidationResponse {
  dataset_id: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  total_rows: number;
  valid_rows: number;
  excluded_rows: number;
  duplicate_rows: number;
  data_quality_score: number;
  column_quality: Record<string, {
    original_column: string;
    mapped_field: string;
    total_count: number;
    missing_count: number;
    missing_percentage: number;
  }>;
  stress_range?: { min: number; max: number };
  scoring_method?: string;
  missing_handling_method?: string;
  error?: string;
}

export interface DescriptiveStat {
  sample_size: number;
  missing_count: number;
  mean: number;
  median: number;
  standard_deviation: number;
  variance: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
}

export interface StressCategory {
  category: string;
  range: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StressDistribution {
  rules_description: string;
  categories: StressCategory[];
  dominant_category: string;
}

export interface CorrelationItem {
  variable_1: string;
  variable_2: string;
  correlation: number;
  p_value: number;
  is_statistically_significant: boolean;
  strength: string;
  sample_size: number;
}

export interface SubgroupStat {
  group: string;
  sample_size: number;
  mean_stress: number;
  median_stress: number;
  sd_stress: number;
}

export interface GroupComparison {
  group_variable: string;
  group_title: string;
  description: string;
  groups: SubgroupStat[];
  statistical_test?: {
    f_statistic: number;
    p_value: number;
    significant: boolean;
  };
}

export interface Analysis {
  id: string;
  dataset_id: string;
  original_filename?: string;
  title: string;
  summary: string;
  methodology: string;
  scoring_rules: {
    method: string;
    details: string;
  };
  data_quality_summary: {
    total_rows: number;
    valid_rows: number;
    excluded_rows: number;
    duplicate_rows: number;
    quality_score: number;
    column_quality?: Record<string, any>;
  };
  descriptive_stats: Record<string, DescriptiveStat>;
  stress_distribution: StressDistribution;
  correlations: CorrelationItem[];
  group_comparisons: GroupComparison[];
  chart_data?: any;
  statistical_findings: string[];
  limitations: string[];
  created_at: string;
}

export interface AnalysisSummaryItem {
  id: string;
  dataset_id: string;
  title: string;
  summary: string;
  original_filename: string;
  valid_rows: number;
  total_rows: number;
  mean_stress?: number;
  sd_stress?: number;
  dominant_category?: string;
  created_at: string;
}

export interface DocumentAttachment {
  filename: string;
  file_type: string;
  content_base64?: string;
  content_text?: string;
  size_bytes?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  document?: DocumentAttachment;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  analysis_id?: string;
  analysis_title?: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileStats {
  profile: User;
  stats: {
    total_datasets: number;
    total_analyses: number;
    total_chat_sessions: number;
  };
}
