// mobile/src/api/client.ts
// Unified HTTP API Client for Exam Stress Analyzer Backend

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import storage from '../utils/storage';

export const getBaseUrl = (): string => {
  // 1. Web browser environment: connect to whatever host the browser is viewing
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host}:8000`;
  }

  // 2. Physical device / Expo Go: extract host computer IP from debugger/metro host
  const hostUri = Constants?.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost || (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000`;
    }
  }

  // 3. Use EXPO_PUBLIC_API_BASE_URL if set
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    let url = process.env.EXPO_PUBLIC_API_BASE_URL.trim();
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return url;
  }

  // 4. Emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
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

      console.warn(`[API Notice] ${options.method || 'GET'} ${url}: ${error.message}`);
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

