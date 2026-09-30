// mobile/src/api/authApi.ts
import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  async register(params: {
    email: string;
    password: string;
    full_name: string;
    institution?: string;
  }): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async login(params: { email: string; password: string }): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async logout(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ user: User }> {
    return apiClient<{ user: User }>('/auth/me', {
      method: 'GET',
    });
  },
};
