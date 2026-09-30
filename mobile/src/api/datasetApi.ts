// mobile/src/api/datasetApi.ts
import { apiClient } from './client';
import { UploadResponse, ValidationResponse, ColumnMappingState } from '../types';

export const datasetApi = {
  async uploadCsvFile(formData: FormData): Promise<UploadResponse> {
    return apiClient<UploadResponse>('/datasets/upload', {
      method: 'POST',
      body: formData,
      timeoutMs: 45000,
    });
  },

  async uploadDocument(params: {
    file_base64?: string;
    file_content?: string;
    csv_text?: string;
    filename: string;
  }): Promise<UploadResponse> {
    return apiClient<UploadResponse>('/datasets/upload', {
      method: 'POST',
      body: JSON.stringify(params),
      timeoutMs: 60000,
    });
  },

  async uploadCsvText(csvText: string, filename: string): Promise<UploadResponse> {
    return apiClient<UploadResponse>('/datasets/upload', {
      method: 'POST',
      body: JSON.stringify({
        csv_text: csvText,
        filename,
      }),
      timeoutMs: 45000,
    });
  },

  async validateDataset(params: {
    dataset_id: string;
    column_mappings: ColumnMappingState;
    missing_handling_method?: string;
    scoring_method?: string;
    csv_text?: string;
  }): Promise<ValidationResponse> {
    return apiClient<ValidationResponse>('/datasets/validate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
