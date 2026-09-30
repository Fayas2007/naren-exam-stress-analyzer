// mobile/app/index.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import storage from '../src/utils/storage';
import Colors from '../src/constants/Colors';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const routeUser = async () => {
      // Add slight delay for professional splash feel
      await new Promise((res) => setTimeout(res, 600));

      const onboarded = await storage.isOnboardingComplete();

      if (!onboarded) {
        router.replace('/(auth)/onboarding');
      } else if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    };

    routeUser();
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Feather name="activity" size={42} color={Colors.primary} />
      </View>
      <Text style={styles.title}>Exam Stress Analyzer</Text>
      <Text style={styles.subtitle}>Statistical Analytics & AI Insights</Text>
      <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  loader: {
    marginTop: 40,
  },
});
