import { apiClient } from './client';
import { ChatMessage, ChatSession, DocumentAttachment } from '../types';

export const chatApi = {
  async sendMessage(params: {
    message: string;
    session_id?: string;
    analysis_id?: string;
    document?: DocumentAttachment;
  }): Promise<{
    session_id: string;
    user_message: string;
    assistant_reply: string;
    message_id: string;
    created_at: string;
  }> {
    return apiClient('/chat', {
      method: 'POST',
      body: JSON.stringify(params),
      timeoutMs: 45000,
    });
  },

  async getSessionHistory(sessionId: string): Promise<{
    session_id: string;
    title: string;
    analysis_id?: string;
    messages: ChatMessage[];
  }> {
    return apiClient(`/chat/history?session_id=${sessionId}`, {
      method: 'GET',
    });
  },

  async listRecentSessions(analysisId?: string): Promise<{
    total_sessions: number;
    sessions: ChatSession[];
  }> {
    const qs = analysisId ? `?analysis_id=${analysisId}` : '';
    return apiClient(`/chat/history${qs}`, {
      method: 'GET',
    });
  },
};
