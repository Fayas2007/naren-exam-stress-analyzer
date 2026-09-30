// mobile/src/api/profileApi.ts
import { apiClient } from './client';
import { UserProfileStats } from '../types';

export const profileApi = {
  async getProfile(): Promise<UserProfileStats> {
    return apiClient<UserProfileStats>('/profile', {
      method: 'GET',
    });
  },

  async updateProfile(params: {
    full_name?: string;
    institution?: string;
    language_pref?: string;
  }): Promise<{ message: string; profile: any }> {
    return apiClient('/profile', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async deleteAccount(): Promise<{ message: string }> {
    return apiClient('/profile', {
      method: 'DELETE',
    });
  },
};
