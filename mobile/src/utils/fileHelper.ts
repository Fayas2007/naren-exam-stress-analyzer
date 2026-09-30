// mobile/src/utils/fileHelper.ts
// Robust cross-platform file reader compatible with Expo SDK 57+ (supporting both new File API and legacy FileSystem)

import { Platform } from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';

export async function readFileAsText(fileUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(fileUri);
    return await res.text();
  }

  try {
    return await LegacyFileSystem.readAsStringAsync(fileUri, {
      encoding: LegacyFileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    // Fallback using native fetch for local file URIs on Android/iOS
    const res = await fetch(fileUri);
    return await res.text();
  }
}

export async function readFileAsBase64(fileUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:...;base64, prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  try {
    return await LegacyFileSystem.readAsStringAsync(fileUri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
  } catch (err) {
    // Fallback: fetch blob and convert to base64
    const res = await fetch(fileUri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
