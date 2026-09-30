// mobile/app/upload/index.tsx
import React, { useState } from 'react';
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

const MAPPABLE_FIELDS: { key: keyof ColumnMappingState; label: string; required: boolean; hint: string }[] = [
  { key: 'stress_score', label: 'Stress Score / Index', required: true, hint: 'Validated score, 0-10 scale or survey aggregate' },
  { key: 'sleep_hours', label: 'Sleep Hours', required: false, hint: 'Average daily sleep duration' },
  { key: 'study_hours', label: 'Study / Revision Hours', required: false, hint: 'Daily study or prep time' },
  { key: 'preparation_level', label: 'Preparation Level', required: false, hint: 'e.g. Low, Medium, High' },
  { key: 'exam_type', label: 'Exam Type / Subject', required: false, hint: 'e.g. Finals, Midterm, Quiz, Surgery' },
  { key: 'anxiety_score', label: 'Anxiety Score', required: false, hint: 'GAD-7 or numeric rating' },
  { key: 'caffeine_intake', label: 'Caffeine Intake', required: false, hint: 'Cups of coffee or mg/day' },
  { key: 'physical_activity_hours', label: 'Physical Activity', required: false, hint: 'Weekly/daily exercise hours' },
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
S120,3.8,8.0,3.8,High,Quiz,3.5,2.5,0
S121,8.1,5.2,8.2,Low,Finals,8.3,0.5,4
S122,5.9,6.8,5.8,Medium,Midterm,5.4,1.8,2
S123,4.3,7.2,4.2,High,Quiz,4.0,2.2,1
S124,8.9,4.2,9.8,Low,Finals,9.0,0.0,5
S125,7.1,5.8,6.8,Medium,Finals,6.9,0.8,3
S126,3.2,8.2,3.2,High,Midterm,3.0,2.8,0
S127,5.3,6.8,5.2,Medium,Midterm,5.0,1.5,2
S128,8.5,4.8,9.0,Low,Finals,8.6,0.5,4
S129,6.8,6.0,6.7,Medium,Midterm,6.4,1.0,3
S130,4.8,7.4,4.6,High,Quiz,4.4,2.0,1`;

import { readFileAsText, readFileAsBase64 } from '../../src/utils/fileHelper';

export default function UploadScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingState>({
    stress_score: '',
  });
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [fileType, setFileType] = useState<string>('csv');

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
      initSuggestedMappings(res);
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
      initSuggestedMappings(res);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load sample dataset.');
    } finally {
      setLoading(false);
    }
  };

  const initSuggestedMappings = (data: UploadResponse) => {
    const initial: ColumnMappingState = { stress_score: '' };
    for (const [colName, colInfo] of Object.entries(data.columns)) {
      if (colInfo.suggested_mapping) {
        (initial as any)[colInfo.suggested_mapping] = colName;
      }
    }
    setColumnMappings(initial);
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
        'Required Field Missing',
        'Please map a column to the required "Stress Score / Index" field before proceeding.'
      );
      return;
    }

    if (!uploadResult) return;

    // Navigate to validation screen
    router.push({
      pathname: '/upload/validate',
      params: {
        datasetId: uploadResult.dataset_id,
        filename: uploadResult.filename,
        mappingsJson: JSON.stringify(columnMappings),
        csvText: rawCsvText,
      },
    });
  };

  if (loading) {
    return <LoadingView message="Parsing and validating CSV headers..." />;
  }

  const columnNames = uploadResult ? Object.keys(uploadResult.columns) : [];

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
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>PDF</Text>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>DOCX</Text>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>PPTX</Text>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>CSV</Text>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>XLSX</Text>
              </View>
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
            <Text style={styles.guideTitle}>Document & Dataset Guidelines:</Text>
            <Text style={styles.guideItem}>• Multi-format: Upload CSV data, survey summaries in PDF, Word reports, or slides.</Text>
            <Text style={styles.guideItem}>• The statistical engine extracts stress indices, sleep, study time, and preparation factors.</Text>
            <Text style={styles.guideItem}>• All metrics are stored securely and analyzed using native R statistical modeling.</Text>
          </Card>
        </View>
      ) : (
        // Mapping & Preview View
        <View style={styles.mappingSection}>
          {/* File Info Card */}
          <Card style={styles.fileInfoCard}>
            <View style={styles.fileHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>{uploadResult.filename}</Text>
                <Text style={styles.fileStats}>
                  {uploadResult.total_rows} rows • {uploadResult.total_columns} columns •{' '}
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

          {/* Column Mapping Section */}
          <Text style={styles.sectionHeading}>1. Map Survey Columns</Text>
          <Text style={styles.sectionSubtitle}>
            Match your CSV headers to the supported analytical dimensions.
          </Text>

          <View style={styles.fieldsList}>
            {MAPPABLE_FIELDS.map((f) => {
              const currentMapped = columnMappings[f.key];

              return (
                <Card key={f.key} style={styles.fieldCard}>
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldNameRow}>
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                      {f.required ? (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>Required</Text>
                        </View>
                      ) : (
                        <Text style={styles.optionalText}>Optional</Text>
                      )}
                    </View>
                    <Text style={styles.fieldHint}>{f.hint}</Text>
                  </View>

                  {/* Column Chips Selector */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.columnChipsScroll}
                  >
                    {columnNames.map((colName) => {
                      const isSelected = currentMapped === colName;
                      const colType = uploadResult.columns[colName]?.type;

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
                              size={12}
                              color={Colors.white}
                              style={{ marginRight: 4 }}
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
                          <Text
                            style={[
                              styles.chipColType,
                              isSelected && styles.chipColTypeSelected,
                            ]}
                          >
                            ({colType})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Card>
              );
            })}
          </View>

          {/* Preview Table */}
          <Text style={styles.sectionHeading}>2. CSV Data Preview (First 5 Rows)</Text>
          <Card style={styles.previewTableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  {columnNames.map((col) => (
                    <View key={col} style={styles.tableHeaderCell}>
                      <Text style={styles.tableHeaderText}>{col}</Text>
                    </View>
                  ))}
                </View>

                {/* Table Rows */}
                {uploadResult.preview_rows.map((row, rIdx) => (
                  <View key={rIdx} style={styles.tableDataRow}>
                    {columnNames.map((col) => (
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
    marginBottom: 20,
    textAlign: 'center',
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
    marginBottom: 4,
    lineHeight: 18,
  },
  mappingSection: {
    paddingVertical: 4,
  },
  fileInfoCard: {
    padding: 14,
    marginBottom: 20,
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
    paddingHorizontal: 10,
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  fieldsList: {
    gap: 12,
    marginBottom: 20,
  },
  fieldCard: {
    padding: 14,
  },
  fieldHeader: {
    marginBottom: 10,
  },
  fieldNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  requiredBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.error,
  },
  optionalText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  columnChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  columnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  columnChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipColName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  chipColNameSelected: {
    color: Colors.white,
  },
  chipColType: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  chipColTypeSelected: {
    color: '#DBEAFE',
  },
  previewTableCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    width: 120,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableDataCell: {
    width: 120,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
  },
  tableCellText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  proceedBtn: {
    marginTop: 8,
  },
});
