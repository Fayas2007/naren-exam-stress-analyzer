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
import { getDatasetSession } from '../../src/utils/datasetSession';

// Helper function to parse CSV lines respecting quotes safely
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  if (!text || typeof text !== 'string' || !text.trim()) return { headers: [], rows: [] };
  const lines = text.trim().split(/\r\n|\n|\r/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    if (!line) return [];
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0] || '').map((h) => (h ? String(h).trim() : ''));
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]?.trim();
    if (!rawLine) continue;
    rows.push(parseLine(rawLine));
  }
  return { headers, rows };
}

function parseStressScore(val: any): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toLowerCase();
  if (!str || str === '' || str === 'na' || str === 'null') {
    return null;
  }
  const clean = str.replace(/['"]/g, '').trim();
  if (clean === 'low' || clean === 'mild' || clean === 'minimal') return 2.5;
  if (clean === 'moderate' || clean === 'medium' || clean === 'avg') return 5.5;
  if (clean === 'high' || clean === 'severe' || clean === 'extreme') return 8.5;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

const FIELD_LABELS: Record<string, string> = {
  stress_score: 'Stress Score / Index',
  sleep_hours: 'Sleep Hours',
  study_hours: 'Study / Prep Hours',
  physical_activity_hours: 'Physical Activity',
  anxiety_score: 'Anxiety Score',
  preparation_level: 'Preparation Level',
  caffeine_intake: 'Caffeine Intake',
  exam_type: 'Exam Type',
};

function computeClientValidation(
  csvText: string,
  mappings: ColumnMappingState,
  missingHandling: string,
  scoringMethod: string,
  datasetId: string
): ValidationResponse {
  const { headers, rows } = parseCsv(csvText);
  const totalRows = rows.length;

  if (totalRows === 0) {
    return {
      dataset_id: datasetId,
      is_valid: true,
      errors: [],
      warnings: [],
      total_rows: 0,
      valid_rows: 0,
      excluded_rows: 0,
      duplicate_rows: 0,
      data_quality_score: 100,
      column_quality: {},
      scoring_method: scoringMethod,
      missing_handling_method: missingHandling,
    };
  }

  // Map fields to header column indices safely
  const colIndices: Record<string, { index: number; colName: string }> = {};
  if (mappings && typeof mappings === 'object') {
    for (const [fieldKey, colName] of Object.entries(mappings)) {
      if (!colName || typeof colName !== 'string') continue;
      const targetName = colName.trim().toLowerCase();
      const idx = headers.findIndex(
        (h) => h && h.toLowerCase() === targetName
      );
      if (idx !== -1) {
        colIndices[fieldKey] = { index: idx, colName };
      }
    }
  }

  // Count duplicates
  const seenSignatures = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const sig = row.join('|||');
    if (seenSignatures.has(sig)) {
      duplicateRows++;
    } else {
      seenSignatures.add(sig);
    }
  }

  // Calculate missing counts per column
  const columnQuality: ValidationResponse['column_quality'] = {};
  let totalMissingAcrossMapped = 0;

  for (const [fieldKey, info] of Object.entries(colIndices)) {
    let missingCount = 0;
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const rawVal = row[info.index];
      const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
      if (!val || val === '' || val.toLowerCase() === 'na' || val.toLowerCase() === 'null') {
        missingCount++;
      }
    }
    totalMissingAcrossMapped += missingCount;
    columnQuality[fieldKey] = {
      original_column: info.colName,
      mapped_field: fieldKey,
      total_count: totalRows,
      missing_count: missingCount,
      missing_percentage: Math.round((missingCount / totalRows) * 1000) / 10,
    };
  }

  // Evaluate valid and excluded rows
  let validRows = 0;
  let excludedRows = 0;
  let minStress = 10;
  let maxStress = 0;
  let hasCategoricalStress = false;

  const stressInfo = colIndices.stress_score;

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    let isValid = true;

    if (stressInfo) {
      const rawStress = row[stressInfo.index];
      const parsedStress = parseStressScore(rawStress);
      if (parsedStress === null) {
        isValid = false;
      } else {
        const strStress = String(rawStress || '').toLowerCase();
        if (strStress.includes('low') || strStress.includes('high') || strStress.includes('med')) {
          hasCategoricalStress = true;
        }
        if (parsedStress < minStress) minStress = parsedStress;
        if (parsedStress > maxStress) maxStress = parsedStress;
      }
    }

    if (isValid && missingHandling === 'exclude_incomplete_records') {
      for (const [fieldKey, info] of Object.entries(colIndices)) {
        if (fieldKey === 'stress_score') continue;
        const rawVal = row[info.index];
        const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        if (!val || val === '' || val.toLowerCase() === 'na' || val.toLowerCase() === 'null') {
          isValid = false;
          break;
        }
      }
    }

    if (isValid) {
      validRows++;
    } else {
      excludedRows++;
    }
  }

  const mappedCount = Math.max(1, Object.keys(colIndices).length);
  const missingRatio = (totalMissingAcrossMapped / (totalRows * mappedCount));
  const duplicateRatio = (duplicateRows / totalRows);
  const dataQualityScore = Math.max(15, Math.min(100, Math.round(100 - (missingRatio * 45) - (duplicateRatio * 30))));

  const warnings: string[] = [];
  if (hasCategoricalStress) {
    warnings.push('Stress score was detected as categorical labels (Low/Medium/High) and converted to standardized numeric scale (2.5 / 5.5 / 8.5).');
  }
  if (duplicateRows > 0) {
    warnings.push(`${duplicateRows} duplicate record(s) detected and noted.`);
  }
  if (excludedRows > 0) {
    warnings.push(`${excludedRows} record(s) have missing or incomplete values and are handled via ${missingHandling === 'exclude_incomplete_records' ? 'complete case analysis' : 'pairwise complete strategy'}.`);
  }

  return {
    dataset_id: datasetId,
    is_valid: validRows > 0,
    errors: validRows === 0 ? ['No valid records found after mapping stress scores.'] : [],
    warnings,
    total_rows: totalRows,
    valid_rows: validRows,
    excluded_rows: excludedRows,
    duplicate_rows: duplicateRows,
    data_quality_score: dataQualityScore,
    column_quality: columnQuality,
    stress_range: { min: minStress === 10 ? 0 : minStress, max: maxStress },
    scoring_method: scoringMethod,
    missing_handling_method: missingHandling,
  };
}

export default function ValidateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    datasetId?: string;
    filename?: string;
    mappingsJson?: string;
    csvText?: string;
  }>();

  // Safely merge session with params to prevent navigation crashes
  const session = getDatasetSession();
  const datasetId = (params.datasetId || session.datasetId || '').toString();
  const filename = (params.filename || session.filename || 'Exam Survey Dataset').toString();
  const csvText = (session.rawCsvText || params.csvText || '').toString();

  // Safe mapping resolution
  let resolvedMappings: ColumnMappingState = { stress_score: '' };
  if (session.mappings && session.mappings.stress_score) {
    resolvedMappings = { ...session.mappings };
  } else if (params.mappingsJson) {
    try {
      resolvedMappings = typeof params.mappingsJson === 'string'
        ? JSON.parse(params.mappingsJson)
        : (params.mappingsJson as any);
    } catch {
      resolvedMappings = { stress_score: '' };
    }
  }

  const [mappings] = useState<ColumnMappingState>(resolvedMappings);
  const [loading, setLoading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [analysisTitle, setAnalysisTitle] = useState(
    `${filename.replace(/\.[^/.]+$/, '')} Analysis`
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
    setErrorMessage('');

    // 1. Immediately calculate locally in <5ms so UI renders instantly without any wait
    let localResult: ValidationResponse | null = null;
    if (csvText && csvText.trim().length > 0) {
      localResult = computeClientValidation(
        csvText,
        mappings,
        missingHandling,
        scoringMethod,
        datasetId
      );
      setValidationData(localResult);
      setLoading(false);
    } else if (!validationData) {
      setLoading(true);
    }

    // 2. Non-blocking background sync with backend
    try {
      const res = await datasetApi.validateDataset({
        dataset_id: datasetId,
        column_mappings: mappings,
        missing_handling_method: missingHandling,
        scoring_method: scoringMethod,
        csv_text: csvText,
      });
      if (res && res.is_valid !== undefined) {
        setValidationData(res);
      }
    } catch (err: any) {
      // If client validation is already active, keep local results intact smoothly
      if (!localResult && !validationData) {
        setErrorMessage(err.message || 'Validation request failed.');
      }
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
            <Text style={styles.scoreSub}>Completeness, validity & structure</Text>
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

      {/* Column Integrity & Missing Values Breakdown */}
      {validationData?.column_quality &&
       typeof validationData.column_quality === 'object' &&
       !Array.isArray(validationData.column_quality) &&
       Object.keys(validationData.column_quality).length > 0 && (
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="check-circle" size={18} color={Colors.primary} />
              <Text style={styles.breakdownTitle}>Missing Values & Column Integrity</Text>
            </View>
            <Text style={styles.breakdownCount}>
              {Object.keys(validationData.column_quality).length} Mapped
            </Text>
          </View>

          <View style={styles.columnList}>
            {Object.entries(validationData.column_quality).map(([fieldKey, colInfo]) => {
              if (!colInfo || typeof colInfo !== 'object') return null;
              const missingPct = typeof colInfo.missing_percentage === 'number'
                ? colInfo.missing_percentage
                : Number(colInfo.missing_percentage) || 0;
              const missingCount = typeof colInfo.missing_count === 'number'
                ? colInfo.missing_count
                : Number(colInfo.missing_count) || 0;
              const completeness = Math.max(0, Math.min(100, Math.round(100 - missingPct)));
              const isComplete = missingCount === 0;
              const barColor = completeness >= 95 ? Colors.success : completeness >= 80 ? Colors.warning : Colors.error;
              const label = FIELD_LABELS[fieldKey] || fieldKey;
              const origCol = colInfo.original_column || fieldKey;

              return (
                <View key={fieldKey} style={styles.columnItem}>
                  <View style={styles.columnMetaRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.columnFieldName}>{label}</Text>
                      <Text style={styles.columnOriginalHeader}>
                        CSV Column: <Text style={{ fontWeight: '700', color: Colors.text }}>{origCol}</Text>
                      </Text>
                    </View>
                    <View style={[styles.completenessBadge, { backgroundColor: isComplete ? '#DCFCE7' : '#FEF3C7' }]}>
                      <Feather
                        name={isComplete ? 'check' : 'alert-circle'}
                        size={12}
                        color={isComplete ? '#166534' : '#92400E'}
                      />
                      <Text style={[styles.completenessBadgeText, { color: isComplete ? '#166534' : '#92400E' }]}>
                        {isComplete ? '100% Complete (0 missing)' : `${completeness}% (${missingCount} missing)`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${completeness}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

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
      <Text style={styles.sectionHeading}>Missing Value Handling Strategy</Text>
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
            <Text style={styles.optionTitle}>Keep All Valid Stress Records (Pairwise)</Text>
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
  breakdownCard: {
    padding: 16,
    marginBottom: 20,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  breakdownCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  columnList: {
    gap: 12,
  },
  columnItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  columnMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  columnFieldName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  columnOriginalHeader: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  completenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completenessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
