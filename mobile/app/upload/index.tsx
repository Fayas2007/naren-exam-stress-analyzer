// mobile/app/upload/index.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';

import { datasetApi } from '../../src/api/datasetApi';
import { UploadResponse, ColumnMappingState } from '../../src/types';
import Colors from '../../src/constants/Colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingView from '../../src/components/LoadingView';
import { readFileAsText, readFileAsBase64 } from '../../src/utils/fileHelper';
import { setDatasetSession } from '../../src/utils/datasetSession';

const MAPPABLE_FIELDS: { key: keyof ColumnMappingState; label: string; icon: string; required: boolean; hint: string }[] = [
  { key: 'stress_score', label: 'Stress Score / Level', icon: 'activity', required: true, hint: 'Validated stress rating or scale' },
  { key: 'sleep_hours', label: 'Sleep Hours', icon: 'moon', required: false, hint: 'Daily sleep duration' },
  { key: 'study_hours', label: 'Study Hours', icon: 'book-open', required: false, hint: 'Daily study or revision time' },
  { key: 'physical_activity_hours', label: 'Physical Activity', icon: 'zap', required: false, hint: 'Exercise or activity hours' },
  { key: 'preparation_level', label: 'Preparation Level', icon: 'award', required: false, hint: 'e.g. Low, Medium, High' },
  { key: 'anxiety_score', label: 'Anxiety Score', icon: 'alert-circle', required: false, hint: 'GAD-7 or anxiety rating' },
  { key: 'caffeine_intake', label: 'Caffeine Intake', icon: 'coffee', required: false, hint: 'Coffee cups or mg/day' },
  { key: 'exam_type', label: 'Exam Type / Subject', icon: 'file-text', required: false, hint: 'e.g. Finals, Midterm' },
];

// Sample dataset text for instant demo & testing
const SAMPLE_CSV_DATA = `student_id,stress_score,sleep_hours,study_hours,preparation_level,exam_type,anxiety_score,physical_activity_hours,caffeine_cups
S101,8.4,5.0,8.5,Low,Finals,8.1,0.5,4
S102,6.2,6.5,6.0,Medium,Midterm,5.8,1.5,2
S103,4.1,7.5,4.0,High,Quiz,3.9,2.0,1
S104,9.0,4.5,9.0,Low,Finals,9.2,0.0,5
S105,7.3,5.5,7.0,Medium,Finals,7.0,1.0,3
S106,3.5,8.0,3.5,High,Midterm,3.2,2.5,1
S107,5.0,7.0,5.0,Medium,Midterm,4.8,1.5,2
S108,8.8,4.0,10.0,Low,Finals,8.9,0.0,4
S109,6.7,6.0,6.5,Medium,Midterm,6.5,1.0,3
S110,4.5,7.5,4.5,High,Quiz,4.1,2.0,0
S111,7.9,5.0,8.0,Low,Finals,8.0,0.5,3
S112,5.5,6.5,5.5,Medium,Midterm,5.2,1.5,2
S113,3.0,8.5,3.0,High,Quiz,2.8,3.0,1
S114,8.6,4.5,9.5,Low,Finals,8.7,0.0,4
S115,6.9,5.5,7.0,Medium,Finals,6.8,1.0,3
S116,4.0,7.8,4.0,High,Midterm,3.7,2.0,1
S117,5.8,6.2,6.0,Medium,Midterm,5.5,1.2,2
S118,9.2,4.0,11.0,Low,Finals,9.5,0.0,5
S119,6.4,6.2,6.0,Medium,Midterm,6.1,1.5,2
S120,3.8,8.0,3.8,High,Quiz,3.5,2.5,0`;

// Robust CSV parser to extract all rows
function parseCsvRows(csvText: string, maxRows = 2000): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || !csvText.trim()) return { headers: [], rows: [] };
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
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

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];
  const limit = Math.min(lines.length, maxRows + 1);

  for (let i = 1; i < limit; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

// Intelligent auto-detection of survey columns
function autoDetectMappings(columns: string[]): ColumnMappingState {
  const result: ColumnMappingState = { stress_score: '' };
  const lowerCols = columns.map((c) => ({
    original: c,
    clean: c.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  }));

  const findMatch = (patterns: RegExp[]): string => {
    for (const pat of patterns) {
      const found = lowerCols.find((c) => pat.test(c.clean));
      if (found) return found.original;
    }
    return '';
  };

  // 1. Stress Score / Index (Required)
  result.stress_score = findMatch([
    /^stress_score$/,
    /^stress_level$/,
    /stress.*score/,
    /stress.*level/,
    /perceived_stress/,
    /^stress$/,
    /stress/,
    /pss/,
    /burnout/,
    /tension/,
  ]);

  // Fallback if not found: search for rating or score column
  if (!result.stress_score) {
    result.stress_score = findMatch([/score/, /rating/, /metric/]);
  }

  // 2. Sleep Hours
  result.sleep_hours = findMatch([
    /^sleep_hours/,
    /sleep.*hour/,
    /sleep.*duration/,
    /^sleep$/,
    /bedtime/,
    /rest.*hour/,
  ]);

  // 3. Study Hours
  result.study_hours = findMatch([
    /^study_hours/,
    /study.*hour/,
    /study.*per.*day/,
    /revision.*hour/,
    /^study$/,
    /prep.*hour/,
    /homework/,
  ]);

  // 4. Physical Activity
  result.physical_activity_hours = findMatch([
    /physical.*activity/,
    /exercise.*hour/,
    /sport.*hour/,
    /workout/,
    /fitness/,
    /physical/,
  ]);

  // 5. Preparation Level
  result.preparation_level = findMatch([
    /prep.*level/,
    /preparation/,
    /readiness/,
    /exam.*prep/,
  ]);

  // 6. Anxiety Score
  result.anxiety_score = findMatch([
    /^anxiety_score/,
    /anxiety/,
    /gad_?7/,
    /nervousness/,
  ]);

  // 7. Caffeine Intake
  result.caffeine_intake = findMatch([
    /caffeine/,
    /coffee/,
    /energy.*drink/,
    /tea/,
  ]);

  // 8. Exam Type
  result.exam_type = findMatch([
    /exam.*type/,
    /exam/,
    /test_type/,
    /subject/,
    /semester/,
    /course/,
  ]);

  return result;
}

export default function UploadScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingState>({
    stress_score: '',
  });
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [fileType, setFileType] = useState<string>('csv');
  const [showManualMapping, setShowManualMapping] = useState<boolean>(false);

  // Extract full preview rows from client-side text or backend preview
  const parsedTable = useMemo(() => {
    if (rawCsvText) {
      const parsed = parseCsvRows(rawCsvText, 2000);
      if (parsed.rows.length > 0) {
        return parsed;
      }
    }
    if (uploadResult) {
      return {
        headers: Object.keys(uploadResult.columns),
        rows: uploadResult.preview_rows as Record<string, string>[],
      };
    }
    return { headers: [], rows: [] };
  }, [rawCsvText, uploadResult]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const fileSizeMb = (file.size || 0) / (1024 * 1024);

      if (fileSizeMb > 15) {
        Alert.alert('File Too Large', 'Please select a document smaller than 15 MB.');
        return;
      }

      setLoading(true);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'csv';
      setFileType(ext);

      let b64Content = '';
      let textContent = '';

      if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        textContent = await readFileAsText(file.uri);
      } else {
        b64Content = await readFileAsBase64(file.uri);
      }

      setRawCsvText(textContent);

      // Upload and parse document
      const res = await datasetApi.uploadDocument({
        file_base64: b64Content || undefined,
        csv_text: textContent || undefined,
        filename: file.name,
      });

      setUploadResult(res);
      applySmartMappings(res);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to parse document.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleDataset = async () => {
    setLoading(true);
    try {
      setRawCsvText(SAMPLE_CSV_DATA);
      setFileType('csv');
      const res = await datasetApi.uploadCsvText(SAMPLE_CSV_DATA, 'student_exam_stress_sample.csv');
      setUploadResult(res);
      applySmartMappings(res);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load sample dataset.');
    } finally {
      setLoading(false);
    }
  };

  // Automated smart detection of all columns
  const applySmartMappings = (data: UploadResponse) => {
    const colNames = Object.keys(data.columns);
    const autoMapped = autoDetectMappings(colNames);

    // Merge backend suggestions if any
    for (const [colName, colInfo] of Object.entries(data.columns)) {
      if (colInfo.suggested_mapping && !(autoMapped as any)[colInfo.suggested_mapping]) {
        (autoMapped as any)[colInfo.suggested_mapping] = colName;
      }
    }

    setColumnMappings(autoMapped);
  };

  const handleSelectColumnForField = (fieldKey: keyof ColumnMappingState, colName: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [fieldKey]: prev[fieldKey] === colName ? '' : colName,
    }));
  };

  const handleProceedToValidation = () => {
    if (!columnMappings.stress_score) {
      Alert.alert(
        'Stress Metric Required',
        'Could not auto-detect the Stress Score/Level column. Please select a column to represent Stress before validating.'
      );
      setShowManualMapping(true);
      return;
    }

    if (!uploadResult) return;

    // Save session in memory to prevent huge CSV strings from breaking React Navigation
    setDatasetSession({
      datasetId: uploadResult.dataset_id,
      filename: uploadResult.filename,
      mappings: columnMappings,
      rawCsvText: rawCsvText,
      uploadResult: uploadResult,
    });

    // Navigate to validation screen cleanly
    router.push({
      pathname: '/upload/validate',
      params: {
        datasetId: uploadResult.dataset_id,
        filename: uploadResult.filename,
      },
    });
  };

  if (loading) {
    return <LoadingView message="Parsing and analyzing dataset..." />;
  }

  const columnNames = uploadResult ? Object.keys(uploadResult.columns) : [];
  const mappedCount = Object.values(columnMappings).filter(Boolean).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {!uploadResult ? (
        // File Selection View
        <View style={styles.pickSection}>
          <Card variant="outline" style={styles.pickerCard}>
            <View style={styles.pickerIconCircle}>
              <Feather name="upload-cloud" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.pickerTitle}>Upload Survey or Research File</Text>
            <Text style={styles.pickerSub}>
              Supports all standard formats: PDF, Word (DOCX/DOC), PowerPoint (PPTX), Excel (XLSX), and CSV datasets up to 15 MB.
            </Text>

            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
              {['PDF', 'DOCX', 'PPTX', 'CSV', 'XLSX'].map((fmt) => (
                <View key={fmt} style={styles.badgeFormat}>
                  <Text style={styles.badgeFormatText}>{fmt}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Select Document from Device"
              onPress={handlePickDocument}
              variant="primary"
              size="large"
              icon={<Feather name="folder" size={18} color={Colors.white} />}
              style={styles.pickBtn}
              fullWidth
            />

            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Try Built-in Sample Survey Data"
              onPress={handleLoadSampleDataset}
              variant="secondary"
              size="medium"
              icon={<Feather name="database" size={16} color={Colors.text} />}
              fullWidth
            />
          </Card>

          <Card style={styles.guidelineCard}>
            <Text style={styles.guideTitle}>Automated Processing Features:</Text>
            <Text style={styles.guideItem}>• Intelligent auto-detection of all psychological and lifestyle metrics.</Text>
            <Text style={styles.guideItem}>• Instant full dataset preview with smooth vertical and horizontal inspection.</Text>
            <Text style={styles.guideItem}>• Multi-format ingestion with high-speed statistical validation.</Text>
          </Card>
        </View>
      ) : (
        // Mapping & Full Preview View
        <View style={styles.mappingSection}>
          {/* File Info Card */}
          <Card style={styles.fileInfoCard}>
            <View style={styles.fileHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>{uploadResult.filename}</Text>
                <Text style={styles.fileStats}>
                  {parsedTable.rows.length || uploadResult.total_rows} rows • {uploadResult.total_columns} columns •{' '}
                  {(uploadResult.file_size_bytes / 1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeFileBtn}
                onPress={() => setUploadResult(null)}
              >
                <Text style={styles.changeFileText}>Change File</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* 1. AUTOMATED SMART MAPPING CARD */}
          <Card style={styles.smartMappingCard}>
            <View style={styles.smartMappingHeader}>
              <View style={styles.smartTitleRow}>
                <View style={styles.sparkleIconCircle}>
                  <Feather name="cpu" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.smartTitle}>Automated Column Mapping</Text>
                  <Text style={styles.smartSub}>
                    {mappedCount} dimensions automatically recognized
                  </Text>
                </View>
              </View>

              <View style={styles.autoMappedBadge}>
                <Feather name="check" size={12} color="#059669" />
                <Text style={styles.autoMappedBadgeText}>Auto-Mapped</Text>
              </View>
            </View>

            {/* Compact summary of auto-mapped fields */}
            <View style={styles.autoMappedGrid}>
              {MAPPABLE_FIELDS.filter((f) => columnMappings[f.key]).map((f) => (
                <View key={f.key} style={styles.autoMappedItem}>
                  <View style={styles.autoMappedIconCircle}>
                    <Feather name={f.icon as any} size={14} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoMappedLabel}>
                      {f.label}{' '}
                      {f.required && <Text style={{ color: Colors.error, fontSize: 10 }}>*</Text>}
                    </Text>
                    <Text style={styles.autoMappedColumnName} numberOfLines={1}>
                      {columnMappings[f.key]}
                    </Text>
                  </View>
                  <Feather name="check-circle" size={14} color="#10B981" />
                </View>
              ))}
            </View>

            {/* Toggle to optionally customize/adjust */}
            <TouchableOpacity
              style={styles.adjustToggleBtn}
              onPress={() => setShowManualMapping(!showManualMapping)}
            >
              <Feather
                name={showManualMapping ? 'chevron-up' : 'sliders'}
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.adjustToggleText}>
                {showManualMapping ? 'Hide Custom Column Mapping' : 'Adjust Mappings Manually (Optional)'}
              </Text>
            </TouchableOpacity>

            {/* Expanded manual selector if user wants to change anything */}
            {showManualMapping && (
              <View style={styles.manualFieldsContainer}>
                {MAPPABLE_FIELDS.map((f) => {
                  const currentMapped = columnMappings[f.key];

                  return (
                    <View key={f.key} style={styles.manualFieldRow}>
                      <View style={styles.manualFieldLabelCol}>
                        <Text style={styles.manualFieldLabel}>{f.label}</Text>
                        <Text style={styles.manualFieldHint}>{f.hint}</Text>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.columnChipsScroll}
                      >
                        {columnNames.map((colName) => {
                          const isSelected = currentMapped === colName;
                          return (
                            <TouchableOpacity
                              key={colName}
                              style={[
                                styles.columnChip,
                                isSelected && styles.columnChipSelected,
                              ]}
                              onPress={() => handleSelectColumnForField(f.key, colName)}
                            >
                              {isSelected && (
                                <Feather
                                  name="check"
                                  size={11}
                                  color={Colors.white}
                                  style={{ marginRight: 3 }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.chipColName,
                                  isSelected && styles.chipColNameSelected,
                                ]}
                              >
                                {colName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* 2. FULL SCROLLABLE CSV DATA PREVIEW */}
          <View style={styles.previewSectionHeader}>
            <View>
              <Text style={styles.sectionHeading}>
                2. CSV Data Preview ({parsedTable.rows.length} Records)
              </Text>
              <Text style={styles.sectionSubtitle}>
                Scroll down through records and across columns to inspect the full data.
              </Text>
            </View>
            <View style={styles.rowCountBadge}>
              <Text style={styles.rowCountText}>{parsedTable.rows.length} Rows</Text>
            </View>
          </View>

          <Card style={styles.previewTableCard}>
            {/* Double ScrollView: Vertical Scroll + Horizontal Scroll */}
            <ScrollView
              style={styles.verticalTableScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={true}
              >
                <View>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.tableIndexHeaderCell}>
                      <Text style={styles.tableHeaderText}>#</Text>
                    </View>
                    {parsedTable.headers.map((col) => (
                      <View key={col} style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText} numberOfLines={1}>
                          {col}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Scrollable Data Rows */}
                  {parsedTable.rows.map((row, rIdx) => (
                    <View
                      key={rIdx}
                      style={[
                        styles.tableDataRow,
                        rIdx % 2 === 1 && styles.tableDataRowAlt,
                      ]}
                    >
                      <View style={styles.tableIndexCell}>
                        <Text style={styles.tableIndexText}>{rIdx + 1}</Text>
                      </View>
                      {parsedTable.headers.map((col) => (
                        <View key={col} style={styles.tableDataCell}>
                          <Text style={styles.tableCellText} numberOfLines={1}>
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) : '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>

            <View style={styles.tableFooterBar}>
              <Feather name="info" size={13} color={Colors.textMuted} />
              <Text style={styles.tableFooterText}>
                Showing all {parsedTable.rows.length} records. Scroll up/down to explore.
              </Text>
            </View>
          </Card>

          {/* Action Button */}
          <Button
            title="Next: Validate Dataset"
            onPress={handleProceedToValidation}
            variant="primary"
            size="large"
            icon={<Feather name="arrow-right" size={18} color={Colors.white} />}
            fullWidth
            style={styles.proceedBtn}
          />
        </View>
      )}
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
  pickSection: {
    paddingVertical: 10,
  },
  pickerCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  pickerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  pickerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 18,
  },
  badgeFormat: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeFormatText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  pickBtn: {
    marginVertical: 6,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  guidelineCard: {
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  guideItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 5,
    lineHeight: 18,
  },
  mappingSection: {
    paddingVertical: 4,
  },
  fileInfoCard: {
    padding: 14,
    marginBottom: 16,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  fileStats: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changeFileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changeFileText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  /* Smart Auto-Mapping Styles */
  smartMappingCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  smartMappingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  smartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sparkleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  smartSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  autoMappedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoMappedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  autoMappedGrid: {
    gap: 8,
    marginBottom: 12,
  },
  autoMappedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  autoMappedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoMappedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  autoMappedColumnName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 1,
  },
  adjustToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adjustToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  manualFieldsContainer: {
    marginTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  manualFieldRow: {
    gap: 6,
  },
  manualFieldLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  manualFieldHint: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  /* Chips */
  columnChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  columnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  columnChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipColName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  chipColNameSelected: {
    color: Colors.white,
  },

  /* Preview Section */
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rowCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  previewTableCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
    borderColor: '#CBD5E1',
  },
  verticalTableScroll: {
    maxHeight: 380,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
  },
  tableIndexHeaderCell: {
    width: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  tableHeaderCell: {
    width: 140,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tableDataRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableIndexCell: {
    width: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  tableIndexText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tableDataCell: {
    width: 140,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: Colors.text,
  },
  tableFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tableFooterText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  proceedBtn: {
    marginTop: 6,
  },
});
