// mobile/app/upload/validate.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { datasetApi } from '../../src/api/datasetApi';
import { analysisApi } from '../../src/api/analysisApi';
import { ValidationResponse, ColumnMappingState } from '../../src/types';
import Colors from '../../src/constants/Colors';
import Card from '../../src/components/Card';
import StatCard from '../../src/components/StatCard';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import LoadingView from '../../src/components/LoadingView';
import ErrorView from '../../src/components/ErrorView';

export default function ValidateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    datasetId: string;
    filename: string;
    mappingsJson: string;
    csvText: string;
  }>();

  const datasetId = params.datasetId;
  const filename = params.filename || 'Exam Survey Dataset';
  const mappings: ColumnMappingState = params.mappingsJson
    ? JSON.parse(params.mappingsJson)
    : { stress_score: '' };
  const csvText = params.csvText || '';

  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [analysisTitle, setAnalysisTitle] = useState(
    `${filename.replace(/\.csv$/i, '')} Analysis`
  );
  const [missingHandling, setMissingHandling] = useState<string>(
    'exclude_incomplete_records'
  );
  const [scoringMethod, setScoringMethod] = useState<string>(
    'standard_numeric_scale'
  );

  useEffect(() => {
    runValidation();
  }, [missingHandling, scoringMethod]);

  const runValidation = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await datasetApi.validateDataset({
        dataset_id: datasetId,
        column_mappings: mappings,
        missing_handling_method: missingHandling,
        scoring_method: scoringMethod,
        csv_text: csvText,
      });
      setValidationData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!analysisTitle.trim()) {
      Alert.alert('Title Required', 'Please provide a title for this analysis.');
      return;
    }

    if (!validationData || !validationData.is_valid) {
      Alert.alert(
        'Validation Issues',
        'Please resolve the validation errors before launching the statistical engine.'
      );
      return;
    }

    setRunningAnalysis(true);
    try {
      const analysis = await analysisApi.runAnalysis({
        dataset_id: datasetId,
        title: analysisTitle.trim(),
        column_mappings: mappings,
        missing_handling_method: missingHandling,
        scoring_method: scoringMethod,
        csv_text: csvText,
      });

      // Navigate to full analysis dashboard
      router.replace({
        pathname: '/analysis/[id]',
        params: { id: analysis.id },
      });
    } catch (err: any) {
      Alert.alert('Analysis Execution Error', err.message || 'Failed to complete analysis.');
      setRunningAnalysis(false);
    }
  };

  if (loading && !validationData) {
    return <LoadingView message="Validating data integrity and missing values..." />;
  }

  if (errorMessage && !validationData) {
    return <ErrorView message={errorMessage} onRetry={runValidation} />;
  }

  const score = validationData?.data_quality_score ?? 0;
  const scoreColor =
    score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Title Config Card */}
      <Card style={styles.titleCard}>
        <Input
          label="Analysis Project Title"
          value={analysisTitle}
          onChangeText={setAnalysisTitle}
          placeholder="e.g. Fall 2025 Midterm Stress Study"
        />
      </Card>

      {/* Data Quality Scorecard */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <View>
            <Text style={styles.scoreHeading}>Data Quality Score</Text>
            <Text style={styles.scoreSub}>Based on completeness & validity</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.scoreOutOf, { color: scoreColor }]}>/100</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Rows"
            value={validationData?.total_rows ?? 0}
            accentColor={Colors.text}
          />
          <StatCard
            title="Valid Rows"
            value={validationData?.valid_rows ?? 0}
            subtext="Ready for R engine"
            accentColor={Colors.success}
          />
          <StatCard
            title="Excluded Rows"
            value={validationData?.excluded_rows ?? 0}
            subtext="Missing / invalid"
            accentColor={validationData?.excluded_rows ? Colors.warning : Colors.textSecondary}
          />
          <StatCard
            title="Duplicates"
            value={validationData?.duplicate_rows ?? 0}
            accentColor={validationData?.duplicate_rows ? Colors.warning : Colors.textSecondary}
          />
        </View>
      </Card>

      {/* Warnings / Notices */}
      {validationData?.warnings && validationData.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsHeading}>Validation Notices:</Text>
          {validationData.warnings.map((w, idx) => (
            <View key={idx} style={styles.warningItem}>
              <Feather name="alert-triangle" size={14} color={Colors.warning} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Missing Value Handling Strategy */}
      <Text style={styles.sectionHeading}>Missing Value Handling</Text>
      <View style={styles.optionsList}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            missingHandling === 'exclude_incomplete_records' && styles.optionCardSelected,
          ]}
          onPress={() => setMissingHandling('exclude_incomplete_records')}
        >
          <View style={styles.radioCircle}>
            {missingHandling === 'exclude_incomplete_records' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Complete Case Analysis (Recommended)</Text>
            <Text style={styles.optionDesc}>
              Excludes records with missing values across the mapped analysis variables for strict statistical consistency.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            missingHandling === 'pairwise_complete' && styles.optionCardSelected,
          ]}
          onPress={() => setMissingHandling('pairwise_complete')}
        >
          <View style={styles.radioCircle}>
            {missingHandling === 'pairwise_complete' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Keep All Valid Stress Records</Text>
            <Text style={styles.optionDesc}>
              Includes records with a valid stress score and handles missing covariates pairwise.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scoring Protocol Selection */}
      <Text style={styles.sectionHeading}>Scoring Classification Scheme</Text>
      <View style={styles.optionsList}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            scoringMethod === 'standard_numeric_scale' && styles.optionCardSelected,
          ]}
          onPress={() => setScoringMethod('standard_numeric_scale')}
        >
          <View style={styles.radioCircle}>
            {scoringMethod === 'standard_numeric_scale' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Standard Numeric Scale (0 - 10 / Auto)</Text>
            <Text style={styles.optionDesc}>
              Low (&lt;4.0), Moderate (4.0 - 7.0), High (&gt;7.0).
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            scoringMethod === 'pss_10' && styles.optionCardSelected,
          ]}
          onPress={() => setScoringMethod('pss_10')}
        >
          <View style={styles.radioCircle}>
            {scoringMethod === 'pss_10' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Perceived Stress Scale (PSS-10, 0 - 40)</Text>
            <Text style={styles.optionDesc}>
              Low (0 - 13), Moderate (14 - 26), High (27 - 40).
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Run Analysis CTA */}
      <Button
        title={runningAnalysis ? 'Calculating in R...' : 'Confirm & Run Statistical Analysis'}
        onPress={handleRunAnalysis}
        loading={runningAnalysis}
        disabled={!validationData?.is_valid}
        variant="primary"
        size="large"
        icon={<Feather name="play" size={18} color={Colors.white} />}
        fullWidth
        style={styles.runBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleCard: {
    padding: 16,
    marginBottom: 16,
  },
  scoreCard: {
    padding: 18,
    marginBottom: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  scoreSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreOutOf: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: -4,
  },
  warningsContainer: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  warningsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  runBtn: {
    marginTop: 10,
  },
});
