// mobile/src/api/client.ts
// Unified HTTP API Client for Exam Stress Analyzer Backend

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import storage from '../utils/storage';

export const getBaseUrl = (): string => {
  // 1. Prioritize explicit EXPO_PUBLIC_API_BASE_URL if configured
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl && envUrl.length > 0 && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('10.0.2.2')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Default production Render cloud backend (HTTPS live API on Render)
  return 'https://exam-stress-analyzer-api.onrender.com';
};

export const API_BASE_URL = getBaseUrl();

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = await storage.getToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth header if token is available
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Set Content-Type to application/json by default unless body is FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const timeout = options.timeoutMs || 30000;
  const maxRetries = options.retries !== undefined ? options.retries : 1;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg =
          (typeof data === 'object' && data !== null && (data.error || data.message)) ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const isCanceled =
        error.name === 'AbortError' ||
        (error.message &&
          (error.message.includes('canceled') ||
            error.message.includes('cancelled') ||
            error.message.includes('aborted')));

      if (isCanceled) {
        // Suppress noisy console errors for deliberate navigation aborts
        throw new Error('Request was canceled');
      }

      if (attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        continue;
      }

      console.log(`[API Info] ${options.method || 'GET'} ${url}: ${error.message}`);
      if (
        error.message &&
        (error.message.includes('Network request failed') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Load failed'))
      ) {
        throw new Error(
          `Unable to reach backend at ${url}. Please ensure the R Plumber server is running.`
        );
      }
      throw error;
    }
  }

  throw new Error('Request failed after retry attempts.');
}

export default apiClient;

