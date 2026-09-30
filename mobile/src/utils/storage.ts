// mobile/src/utils/storage.ts
// Secure and Persistent Storage Manager

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'exam_stress_session_token';
const ONBOARDING_KEY = 'exam_stress_onboarding_done';
const USER_KEY = 'exam_stress_cached_user';

export const storage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
  },

  async deleteToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  async setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  },

  async isOnboardingComplete(): Promise<boolean> {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  },

  async saveCachedUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getCachedUser(): Promise<any | null> {
    const val = await AsyncStorage.getItem(USER_KEY);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    await this.deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
  }
};

export default storage;
