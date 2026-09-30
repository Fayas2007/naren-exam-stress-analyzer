// mobile/app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import Colors from '../src/constants/Colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: Colors.background,
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="upload/index"
            options={{
              title: 'Upload Dataset',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="upload/validate"
            options={{
              title: 'Dataset Validation',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="analysis/[id]"
            options={{
              title: 'Analysis Dashboard',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
