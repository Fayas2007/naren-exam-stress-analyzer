// mobile/app/(auth)/onboarding.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import storage from '../../src/utils/storage';
import Colors from '../../src/constants/Colors';
import Button from '../../src/components/Button';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'file-text',
    title: 'Upload Survey Datasets',
    description:
      'Import exam-related survey CSVs from your device. Custom map any columns for stress scores, sleep duration, study hours, and exam types.',
  },
  {
    icon: 'bar-chart-2',
    title: 'Statistical Precision with R',
    description:
      'Compute real descriptive metrics, stress distribution classifications, Pearson correlations, and ANOVA group comparisons powered by an R backend.',
  },
  {
    icon: 'message-square',
    title: 'AI Grounded Explanations',
    description:
      'Interact with Exam Stress Assistant to explore statistical findings and evidence-based study strategies grounded strictly in your real data.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleFinish = async () => {
    await storage.setOnboardingComplete();
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 ? (
          <Button
            title="Skip"
            onPress={handleFinish}
            variant="secondary"
            size="small"
            style={styles.skipButton}
          />
        ) : (
          <View style={{ height: 36 }} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.iconCircle}>
          <Feather name={currentSlide.icon as any} size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>

        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: Colors.border,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
