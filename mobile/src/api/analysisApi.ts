// mobile/src/api/analysisApi.ts
import { apiClient } from './client';
import { Analysis, AnalysisSummaryItem, ColumnMappingState } from '../types';

export const analysisApi = {
  async runAnalysis(params: {
    dataset_id: string;
    title: string;
    column_mappings: ColumnMappingState;
    missing_handling_method?: string;
    scoring_method?: string;
    csv_text?: string;
  }): Promise<Analysis> {
    return apiClient<Analysis>('/analyses', {
      method: 'POST',
      body: JSON.stringify(params),
      timeoutMs: 60000,
    });
  },

  async listAnalyses(params?: { q?: string; sort_by?: 'recent' | 'oldest' }): Promise<{
    total_analyses: number;
    analyses: AnalysisSummaryItem[];
  }> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    const qs = query.toString();

    return apiClient<{ total_analyses: number; analyses: AnalysisSummaryItem[] }>(
      `/analyses${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
  },

  async getAnalysis(id: string): Promise<Analysis> {
    return apiClient<Analysis>(`/analyses/${id}`, {
      method: 'GET',
    });
  },

  async deleteAnalysis(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/analyses/${id}`, {
      method: 'DELETE',
    });
  },

  async getAnalysisReport(id: string): Promise<{
    analysis_id: string;
    title: string;
    markdown: string;
    html: string;
    filename: string;
  }> {
    return apiClient<{
      analysis_id: string;
      title: string;
      markdown: string;
      html: string;
      filename: string;
    }>(`/analyses/${id}/report`, {
      method: 'GET',
    });
  },
};
