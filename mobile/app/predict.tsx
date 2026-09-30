// mobile/app/predict.tsx
// Exam Stress Prediction Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import Colors from '../src/constants/Colors';
import Card from '../src/components/Card';
import Badge from '../src/components/Badge';
import {
  predictionApi,
  PredictionInput,
  PredictionResponse,
} from '../src/api/predictionApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EXAM_TYPES = [
  { id: 'Final Exam', label: 'Final Exam', desc: 'Comprehensive Semester Finals', icon: 'award' },
  { id: 'Midterm', label: 'Midterm Exam', desc: 'Mid-term Assessment', icon: 'file-text' },
  { id: 'Standardized Test', label: 'Standardized Test', desc: 'GRE, SAT, or Entrance Exam', icon: 'check-circle' },
  { id: 'Oral Exam', label: 'Oral Defense / Viva', desc: 'Interview or Thesis Defense', icon: 'user-check' },
  { id: 'Lab Practical', label: 'Lab Practical', desc: 'Hands-on Technical Assessment', icon: 'cpu' },
  { id: 'Weekly Quiz', label: 'Weekly Quiz', desc: 'Formative Quiz / Test', icon: 'clock' },
];

const PREPARATION_LEVELS: Array<{ id: 'Low' | 'Medium' | 'High'; label: string; desc: string; color: string }> = [
  { id: 'Low', label: 'Low', desc: 'Minimal revision', color: '#EF4444' },
  { id: 'Medium', label: 'Medium', desc: 'Core coverage', color: '#F59E0B' },
  { id: 'High', label: 'High', desc: 'Full mastery', color: '#10B981' },
];

export default function PredictScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 1. Form Inputs State
  const [examType, setExamType] = useState('Final Exam');
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [studyHours, setStudyHours] = useState(5.5);
  const [sleepHours, setSleepHours] = useState(6.5);
  const [prepLevel, setPrepLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [anxietyScore, setAnxietyScore] = useState(6.0);

  // 2. Prediction Processing State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  // Helper for step adjustments
  const adjustStudy = (delta: number) => {
    setStudyHours((prev) => Math.max(0, Math.min(16, Number((prev + delta).toFixed(1)))));
  };

  const adjustSleep = (delta: number) => {
    setSleepHours((prev) => Math.max(2, Math.min(12, Number((prev + delta).toFixed(1)))));
  };

  const handlePredict = async () => {
    setLoading(true);
    const input: PredictionInput = {
      examination_type: examType,
      study_hours: studyHours,
      sleep_hours: sleepHours,
      preparation_level: prepLevel,
      anxiety_score: anxietyScore,
    };

    try {
      const res = await predictionApi.predictStress(input);
      setResult(res);
    } catch (e: any) {
      console.log('Prediction failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
  };

  // Color mapping based on stress score
  const getScoreTheme = (score: number) => {
    if (score < 4.0) {
      return {
        tier: 'Low Stress',
        color: '#10B981',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    }
    if (score <= 7.0) {
      return {
        tier: 'Moderate Stress',
        color: '#F59E0B',
        bg: '#FEF3C7',
        border: '#FCD34D',
        text: '#B45309',
      };
    }
    return {
      tier: 'High Stress',
      color: '#DC2626',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#B91C1C',
    };
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Navigation Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Exam Stress Predictor</Text>
          <Text style={styles.headerSubtitle}>
            R Plumber Machine Learning & Psychometric Model
          </Text>
        </View>
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>R 4.3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* If result is ready, show Result View */}
        {result ? (
          <View style={styles.resultsContainer}>
            {/* Primary Score Radial Card */}
            {(() => {
              const theme = getScoreTheme(result.predicted_stress_score);
              const score = result.predicted_stress_score;
              const radius = 64;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (score / 10) * circumference;

              return (
                <Card style={[styles.resultCard, { borderColor: theme.border }]}>
                  <View style={styles.resultCardTop}>
                    <Text style={styles.resultCardHeading}>Predicted Stress Outcome</Text>
                    <Badge label={theme.tier} variant={score > 7 ? 'high' : score >= 4 ? 'moderate' : 'low'} />
                  </View>

                  {/* Circular Radial Gauge */}
                  <View style={styles.radialGaugeWrapper}>
                    <Svg width={160} height={160}>
                      {/* Background Track */}
                      <Circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#E2E8F0"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      {/* Filled Progress Arc */}
                      <Circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={theme.color}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        transform="rotate(-90 80 80)"
                      />
                    </Svg>
                    <View style={styles.gaugeCenterText}>
                      <Text style={[styles.gaugeScoreNumber, { color: theme.color }]}>
                        {score.toFixed(1)}
                      </Text>
                      <Text style={styles.gaugeScoreScale}>/ 10</Text>
                    </View>
                  </View>

                  {/* 95% Confidence Interval Chip */}
                  <View style={styles.ciChip}>
                    <Feather name="shield" size={13} color={theme.color} />
                    <Text style={styles.ciChipText}>
                      95% Predictive Interval: [{result.confidence_interval.lower} – {result.confidence_interval.upper}]
                    </Text>
                  </View>

                  {/* Probability Breakdown Distribution */}
                  <View style={styles.probSection}>
                    <View style={styles.probHeader}>
                      <Text style={styles.probSectionTitle}>Prediction Probabilities</Text>
                      <Text style={styles.confidenceText}>
                        Confidence: {(result.confidence * 100).toFixed(1)}%
                      </Text>
                    </View>

                    {/* Segmented Progress Track */}
                    <View style={styles.probBarContainer}>
                      <View
                        style={[
                          styles.probBarFill,
                          {
                            width: `${result.prediction_probability.low * 100}%`,
                            backgroundColor: '#10B981',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.probBarFill,
                          {
                            width: `${result.prediction_probability.moderate * 100}%`,
                            backgroundColor: '#F59E0B',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.probBarFill,
                          {
                            width: `${result.prediction_probability.high * 100}%`,
                            backgroundColor: '#DC2626',
                          },
                        ]}
                      />
                    </View>

                    {/* Probability Legend */}
                    <View style={styles.probLegendRow}>
                      <View style={styles.probLegendItem}>
                        <View style={[styles.probDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.probLabel}>
                          Low: {(result.prediction_probability.low * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.probLegendItem}>
                        <View style={[styles.probDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.probLabel}>
                          Mod: {(result.prediction_probability.moderate * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.probLegendItem}>
                        <View style={[styles.probDot, { backgroundColor: '#DC2626' }]} />
                        <Text style={styles.probLabel}>
                          High: {(result.prediction_probability.high * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })()}

            {/* Input Summary Review Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="clipboard" size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Input Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Exam Type</Text>
                  <Text style={styles.summaryItemValue}>{result.input_summary.examination_type}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Study Time</Text>
                  <Text style={styles.summaryItemValue}>
                    {result.input_summary.study_hours_per_day} hrs / day
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Sleep Duration</Text>
                  <Text style={styles.summaryItemValue}>
                    {result.input_summary.sleep_hours_per_night} hrs / night
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Preparation</Text>
                  <Text style={styles.summaryItemValue}>{result.input_summary.preparation_level}</Text>
                </View>
                <View style={styles.summaryItemFull}>
                  <Text style={styles.summaryItemLabel}>Anxiety Score</Text>
                  <Text style={styles.summaryItemValue}>
                    {result.input_summary.anxiety_score} / 10.0 (Self-Reported)
                  </Text>
                </View>
              </View>
            </Card>

            {/* Explainable Factor Contributions (XAI) */}
            <Card style={styles.contributionsCard}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="layers" size={16} color="#4F46E5" />
                <Text style={styles.sectionTitle}>Factor Contribution & Impact</Text>
              </View>
              <View style={styles.contributionsList}>
                {result.feature_contributions.map((item, idx) => {
                  const isRisk = item.effect === 'Risk Driver';
                  const isProtect = item.effect === 'Protective';
                  return (
                    <View key={idx} style={styles.contribItem}>
                      <View style={styles.contribTopRow}>
                        <Text style={styles.contribFeatureName}>{item.feature}</Text>
                        <View style={styles.contribBadge}>
                          <Text
                            style={[
                              styles.contribBadgeText,
                              {
                                color: isRisk
                                  ? '#DC2626'
                                  : isProtect
                                  ? '#10B981'
                                  : '#64748B',
                              },
                            ]}
                          >
                            {item.impact_score > 0 ? `+${item.impact_score}` : item.impact_score} pts ({item.effect})
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.contribDesc}>{item.description}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Tailored Recommendations */}
            <Card style={styles.recsCard}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={styles.sectionTitle}>Actionable Stress Mitigation</Text>
              </View>
              {result.recommendations.map((rec, i) => (
                <View key={i} style={styles.recItem}>
                  <Text style={styles.recDot}>•</Text>
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </Card>

            {/* Reset / Re-calculate Button */}
            <TouchableOpacity
              style={styles.recalculateBtn}
              onPress={resetForm}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <Text style={styles.recalculateBtnText}>Adjust Inputs & Re-predict</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Input Form View */
          <View style={styles.formContainer}>
            {/* Introductory Instruction Banner */}
            <View style={styles.infoBanner}>
              <Feather name="activity" size={18} color="#FF6B00" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBannerTitle}>Predictive Assessment</Text>
                <Text style={styles.infoBannerText}>
                  Enter the 5 exam parameters below to calculate your validated stress score and tier probability.
                </Text>
              </View>
            </View>

            {/* 1. Examination Type (Dropdown) */}
            <Card style={styles.inputCard}>
              <View style={styles.labelHeader}>
                <Feather name="award" size={15} color={Colors.primary} />
                <Text style={styles.inputLabel}>1. Examination Type</Text>
              </View>
              <Text style={styles.inputHint}>Select the evaluation stakes format</Text>

              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setExamDropdownOpen(!examDropdownOpen)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownSelectedText}>{examType}</Text>
                <Feather
                  name={examDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#475569"
                />
              </TouchableOpacity>

              {examDropdownOpen && (
                <View style={styles.dropdownOptionsContainer}>
                  {EXAM_TYPES.map((type) => {
                    const isSelected = type.id === examType;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.dropdownOptionItem,
                          isSelected && styles.dropdownOptionSelected,
                        ]}
                        onPress={() => {
                          setExamType(type.id);
                          setExamDropdownOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dropdownOptionTextCol}>
                          <Text
                            style={[
                              styles.dropdownOptionTitle,
                              isSelected && styles.dropdownOptionTitleSelected,
                            ]}
                          >
                            {type.label}
                          </Text>
                          <Text style={styles.dropdownOptionDesc}>{type.desc}</Text>
                        </View>
                        {isSelected && (
                          <Feather name="check" size={16} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>

            {/* 2. Study Hours per Day (Stepper & Slider Chips) */}
            <Card style={styles.inputCard}>
              <View style={styles.labelHeader}>
                <Feather name="clock" size={15} color="#0284C7" />
                <Text style={styles.inputLabel}>2. Study Hours per Day</Text>
              </View>
              <Text style={styles.inputHint}>Daily revision and assignment duration</Text>

              {/* Stepper Display */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustStudy(-0.5)}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={18} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.stepperValueBox}>
                  <Text style={styles.stepperValueText}>{studyHours.toFixed(1)}</Text>
                  <Text style={styles.stepperUnitText}>hours / day</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustStudy(0.5)}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[2, 4, 6, 8, 10].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.presetChip,
                      studyHours === h && styles.presetChipActive,
                    ]}
                    onPress={() => setStudyHours(h)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        studyHours === h && styles.presetChipTextActive,
                      ]}
                    >
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 3. Sleep Hours per Night (Stepper & Slider Chips) */}
            <Card style={styles.inputCard}>
              <View style={styles.labelHeader}>
                <Feather name="moon" size={15} color="#7C3AED" />
                <Text style={styles.inputLabel}>3. Sleep Hours per Night</Text>
              </View>
              <Text style={styles.inputHint}>Rest duration (Optimal: 7–8 hours)</Text>

              {/* Stepper Display */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustSleep(-0.5)}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={18} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.stepperValueBox}>
                  <Text style={styles.stepperValueText}>{sleepHours.toFixed(1)}</Text>
                  <Text style={styles.stepperUnitText}>hours / night</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustSleep(0.5)}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[4.5, 6, 7.5, 8.5, 10].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.presetChip,
                      sleepHours === h && styles.presetChipActive,
                    ]}
                    onPress={() => setSleepHours(h)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        sleepHours === h && styles.presetChipTextActive,
                      ]}
                    >
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 4. Preparation Level (Low / Medium / High Segmented Control) */}
            <Card style={styles.inputCard}>
              <View style={styles.labelHeader}>
                <Feather name="layers" size={15} color="#D97706" />
                <Text style={styles.inputLabel}>4. Preparation Level</Text>
              </View>
              <Text style={styles.inputHint}>Self-reported mastery and readiness</Text>

              <View style={styles.segmentedControl}>
                {PREPARATION_LEVELS.map((lvl) => {
                  const isSelected = prepLevel === lvl.id;
                  return (
                    <TouchableOpacity
                      key={lvl.id}
                      style={[
                        styles.segmentBtn,
                        isSelected && { backgroundColor: lvl.color },
                      ]}
                      onPress={() => setPrepLevel(lvl.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          isSelected && styles.segmentBtnTextActive,
                        ]}
                      >
                        {lvl.label}
                      </Text>
                      <Text
                        style={[
                          styles.segmentSubText,
                          isSelected && { color: '#FFFFFF' },
                        ]}
                      >
                        {lvl.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* 5. Anxiety Score (0 to 10 Stepper) */}
            <Card style={styles.inputCard}>
              <View style={styles.labelHeader}>
                <Feather name="trending-up" size={15} color="#DC2626" />
                <Text style={styles.inputLabel}>5. Anxiety Score (0 – 10)</Text>
              </View>
              <Text style={styles.inputHint}>Perceived psychological apprehension</Text>

              {/* Score Display and Tag */}
              <View style={styles.anxietyDisplayRow}>
                <Text style={styles.anxietyScoreBig}>{anxietyScore.toFixed(0)}</Text>
                <View style={styles.anxietyTagWrapper}>
                  <Text
                    style={[
                      styles.anxietyTagText,
                      {
                        color:
                          anxietyScore > 7
                            ? '#DC2626'
                            : anxietyScore >= 4
                            ? '#D97706'
                            : '#059669',
                      },
                    ]}
                  >
                    {anxietyScore > 7
                      ? 'Severe Anxiety'
                      : anxietyScore >= 5
                      ? 'Moderate Anxiety'
                      : anxietyScore >= 3
                      ? 'Mild Apprehension'
                      : 'Minimal / Calm'}
                  </Text>
                </View>
              </View>

              {/* Numbered Tap Track (0 to 10) */}
              <View style={styles.anxietyTrackRow}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isCurrent = Math.round(anxietyScore) === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.anxietyStepBtn,
                        isCurrent && styles.anxietyStepBtnActive,
                      ]}
                      onPress={() => setAnxietyScore(num)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.anxietyStepText,
                          isCurrent && styles.anxietyStepTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Process Flow Schematic */}
            <View style={styles.processFlowCard}>
              <Text style={styles.flowTitle}>Processing Pipeline:</Text>
              <View style={styles.flowRow}>
                <Text style={styles.flowStep}>User Input</Text>
                <Text style={styles.flowArrow}>→</Text>
                <Text style={styles.flowStep}>R Plumber API</Text>
                <Text style={styles.flowArrow}>→</Text>
                <Text style={styles.flowStep}>Prediction Model</Text>
                <Text style={styles.flowArrow}>→</Text>
                <Text style={styles.flowStep}>Stress Level</Text>
              </View>
            </View>

            {/* Submit Prediction Button */}
            <TouchableOpacity
              style={styles.predictBtn}
              onPress={handlePredict}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.predictBtnText}>Running Model Computation...</Text>
                </View>
              ) : (
                <View style={styles.btnLoadingRow}>
                  <Feather name="cpu" size={18} color="#FFFFFF" />
                  <Text style={styles.predictBtnText}>Calculate Stress Prediction</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modelBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    padding: 12,
    borderRadius: 10,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
  },
  infoBannerText: {
    fontSize: 11.5,
    color: '#C2410C',
    marginTop: 2,
    lineHeight: 16,
  },
  inputCard: {
    padding: 14,
  },
  labelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownSelectedText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownOptionsContainer: {
    marginTop: 6,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownOptionTextCol: {
    flex: 1,
  },
  dropdownOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownOptionTitleSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dropdownOptionDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperValueBox: {
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepperUnitText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  presetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  segmentSubText: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  anxietyDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 10,
  },
  anxietyScoreBig: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  anxietyTagWrapper: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anxietyTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  anxietyTrackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  anxietyStepBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  anxietyStepBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  anxietyStepText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  anxietyStepTextActive: {
    color: '#FFFFFF',
  },
  processFlowCard: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  flowTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowStep: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  flowArrow: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: 'bold',
  },
  predictBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsContainer: {
    gap: 14,
  },
  resultCard: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  resultCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  resultCardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  radialGaugeWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  gaugeCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScoreNumber: {
    fontSize: 34,
    fontWeight: '900',
  },
  gaugeScoreScale: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2,
  },
  ciChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  ciChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  probSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  probHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  probSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  probBarContainer: {
    flexDirection: 'row',
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  probBarFill: {
    height: '100%',
  },
  probLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  probDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  probLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  summaryCard: {
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    width: (SCREEN_WIDTH - 76) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItemFull: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItemLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryItemValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  contributionsCard: {
    padding: 14,
  },
  contributionsList: {
    gap: 10,
  },
  contribItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contribTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contribFeatureName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  contribBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  contribBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  contribDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  recsCard: {
    padding: 14,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  recDot: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  recText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },
  recalculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  recalculateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
