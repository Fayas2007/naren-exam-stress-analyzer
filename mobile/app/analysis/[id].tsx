// mobile/app/analysis/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { analysisApi } from '../../src/api/analysisApi';
import { Analysis } from '../../src/types';
import Colors from '../../src/constants/Colors';
import Card from '../../src/components/Card';
import StatCard from '../../src/components/StatCard';
import Badge from '../../src/components/Badge';
import Button from '../../src/components/Button';
import LoadingView from '../../src/components/LoadingView';
import ErrorView from '../../src/components/ErrorView';
import DistributionChart from '../../src/components/DistributionChart';
import SubgroupBarChart from '../../src/components/SubgroupBarChart';
import CorrelationChart from '../../src/components/CorrelationChart';
import FloatingChatButton from '../../src/components/FloatingChatButton';

type TabKey = 'overview' | 'distribution' | 'relationships' | 'quality' | 'findings';

export default function AnalysisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadAnalysis();
  }, [id]);

  const loadAnalysis = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await analysisApi.getAnalysis(id);
      setAnalysis(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load analysis details.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id || !analysis) return;
    setExporting(true);
    try {
      const reportRes = await analysisApi.getAnalysisReport(id);

      if (Platform.OS === 'web') {
        // On web, open printable HTML window
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(reportRes.html);
          win.document.close();
          win.print();
        }
      } else {
        // On iOS / Android, generate native PDF via expo-print
        const { uri } = await Print.printToFileAsync({
          html: reportRes.html,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Export ${analysis.title}`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF Generated', `Report PDF created at: ${uri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to generate PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const handleShareSummary = async () => {
    if (!analysis) return;
    try {
      await Share.share({
        title: analysis.title,
        message: `${analysis.title}\n\n${analysis.summary}\n\nAnalyzed with Exam Stress Analyzer R Analytics.`,
      });
    } catch (e) {
      // Ignored
    }
  };

  if (loading) {
    return <LoadingView message="Retrieving statistical computations..." />;
  }

  if (errorMessage || !analysis) {
    return <ErrorView message={errorMessage || 'Analysis not found'} onRetry={loadAnalysis} />;
  }

  const stressStats = analysis.descriptive_stats?.stress_score;
  const quality = analysis.data_quality_summary;
  const dominantCat = analysis.stress_distribution?.dominant_category;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Analysis Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{analysis.title}</Text>
              <Text style={styles.metaText}>
                <Feather name="file" size={12} color={Colors.textSecondary} />{' '}
                {analysis.original_filename || 'Dataset'} • {formatDate(analysis.created_at)}
              </Text>
            </View>
            {dominantCat && (
              <Badge
                label={dominantCat}
                variant={
                  dominantCat.includes('High')
                    ? 'high'
                    : dominantCat.includes('Moderate')
                    ? 'moderate'
                    : 'low'
                }
              />
            )}
          </View>

          {/* Export & Share Buttons */}
          <View style={styles.actionsRow}>
            <Button
              title="Export PDF Report"
              onPress={handleExportPdf}
              loading={exporting}
              variant="primary"
              size="small"
              icon={<Feather name="download" size={14} color={Colors.white} />}
              style={{ flex: 1 }}
            />
            <Button
              title="Share"
              onPress={handleShareSummary}
              variant="secondary"
              size="small"
              icon={<Feather name="share-2" size={14} color={Colors.text} />}
            />
          </View>
        </Card>

        {/* Tab Navigation Pill Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'distribution', label: 'Distribution' },
            { key: 'relationships', label: 'Relationships' },
            { key: 'quality', label: 'Data Quality' },
            { key: 'findings', label: 'Findings & Limits' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as TabKey)}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* TAB CONTENT: 1. OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            {/* Executive Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.cardHeading}>Executive Summary</Text>
              <Text style={styles.summaryText}>{analysis.summary}</Text>
            </Card>

            {/* Key KPI Stats Grid */}
            <Text style={styles.sectionHeading}>Descriptive Indicators</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Mean Stress"
                value={stressStats?.mean ?? '--'}
                subtext={`SD ±${stressStats?.standard_deviation ?? '--'}`}
                accentColor={
                  (stressStats?.mean || 0) > 7
                    ? Colors.error
                    : (stressStats?.mean || 0) >= 4
                    ? Colors.warning
                    : Colors.success
                }
              />
              <StatCard
                title="Median Stress"
                value={stressStats?.median ?? '--'}
                subtext={`IQR: ${stressStats?.iqr ?? '--'}`}
                accentColor={Colors.primary}
              />
              <StatCard
                title="Min / Max"
                value={`${stressStats?.min ?? '--'} - ${stressStats?.max ?? '--'}`}
                subtext="Observed range"
                accentColor={Colors.text}
              />
              <StatCard
                title="Analyzed Records"
                value={quality?.valid_rows ?? '--'}
                subtext={`Quality: ${quality?.quality_score ?? '--'}/100`}
                accentColor={Colors.success}
              />
            </View>

            {/* Methodology Note */}
            <Card style={styles.methodCard}>
              <Text style={styles.methodHeading}>Methodology & Framework</Text>
              <Text style={styles.methodText}>{analysis.methodology}</Text>
              <Text style={styles.scoringText}>
                <Text style={{ fontWeight: '700' }}>Protocol: </Text>
                {analysis.scoring_rules?.details}
              </Text>
            </Card>
          </View>
        )}

        {/* TAB CONTENT: 2. DISTRIBUTION */}
        {activeTab === 'distribution' && (
          <View style={styles.tabSection}>
            <DistributionChart
              categories={analysis.stress_distribution?.categories || []}
              dominantCategory={dominantCat}
              rulesDescription={analysis.scoring_rules?.details}
            />

            <Card style={styles.tableCard}>
              <Text style={styles.cardHeading}>Classification Breakdown</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Tier</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>Range</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Count</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Share</Text>
              </View>
              {analysis.stress_distribution?.categories?.map((cat, i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.catName}>{cat.category}</Text>
                  </View>
                  <Text style={[styles.tdCell, { flex: 1.5, color: Colors.textSecondary }]}>{cat.range}</Text>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{cat.count}</Text>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', color: cat.color, fontWeight: '700' }]}>
                    {cat.percentage}%
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* TAB CONTENT: 3. RELATIONSHIPS */}
        {activeTab === 'relationships' && (
          <View style={styles.tabSection}>
            {/* Correlation Matrix */}
            <CorrelationChart correlations={analysis.correlations || []} />

            {/* Subgroup Comparisons */}
            {analysis.group_comparisons?.map((comp, idx) => (
              <SubgroupBarChart key={idx} comparison={comp} />
            ))}
          </View>
        )}

        {/* TAB CONTENT: 4. DATA QUALITY */}
        {activeTab === 'quality' && (
          <View style={styles.tabSection}>
            <Card style={styles.qualityScoreCard}>
              <View style={styles.qualityHeader}>
                <View>
                  <Text style={styles.cardHeading}>Data Quality & Completeness</Text>
                  <Text style={styles.qualitySub}>Automated validation scorecard</Text>
                </View>
                <View style={styles.scoreBadgeCircle}>
                  <Text style={styles.scoreCircleVal}>{quality?.quality_score}</Text>
                  <Text style={styles.scoreCircleMax}>/100</Text>
                </View>
              </View>

              <View style={styles.qualityRowsList}>
                <View style={styles.qRow}>
                  <Text style={styles.qLabel}>Total Records Uploaded</Text>
                  <Text style={styles.qVal}>{quality?.total_rows}</Text>
                </View>
                <View style={styles.qRow}>
                  <Text style={styles.qLabel}>Complete Records Analyzed</Text>
                  <Text style={[styles.qVal, { color: Colors.success }]}>{quality?.valid_rows}</Text>
                </View>
                <View style={styles.qRow}>
                  <Text style={styles.qLabel}>Excluded Incomplete Rows</Text>
                  <Text style={[styles.qVal, { color: quality?.excluded_rows ? Colors.warning : Colors.text }]}>
                    {quality?.excluded_rows}
                  </Text>
                </View>
                <View style={styles.qRow}>
                  <Text style={styles.qLabel}>Exact Duplicate Records</Text>
                  <Text style={styles.qVal}>{quality?.duplicate_rows}</Text>
                </View>
              </View>
            </Card>

            {/* All Descriptive Statistics Table */}
            <Card style={styles.tableCard}>
              <Text style={styles.cardHeading}>Variable Descriptive Matrix</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { width: 140 }]}>Variable</Text>
                    <Text style={[styles.thCell, { width: 60, textAlign: 'right' }]}>N</Text>
                    <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>Mean</Text>
                    <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>SD</Text>
                    <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>Median</Text>
                    <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>IQR</Text>
                    <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>Min/Max</Text>
                  </View>
                  {analysis.descriptive_stats &&
                    Object.entries(analysis.descriptive_stats).map(([varName, st]) => (
                      <View key={varName} style={styles.tableRow}>
                        <Text style={[styles.tdCell, { width: 140, fontWeight: '600' }]}>{varName}</Text>
                        <Text style={[styles.tdCell, { width: 60, textAlign: 'right' }]}>{st.sample_size}</Text>
                        <Text style={[styles.tdCell, { width: 80, textAlign: 'right', color: Colors.primary, fontWeight: '700' }]}>
                          {st.mean}
                        </Text>
                        <Text style={[styles.tdCell, { width: 80, textAlign: 'right' }]}>±{st.standard_deviation}</Text>
                        <Text style={[styles.tdCell, { width: 80, textAlign: 'right' }]}>{st.median}</Text>
                        <Text style={[styles.tdCell, { width: 80, textAlign: 'right' }]}>{st.iqr}</Text>
                        <Text style={[styles.tdCell, { width: 80, textAlign: 'right' }]}>
                          {st.min} - {st.max}
                        </Text>
                      </View>
                    ))}
                </View>
              </ScrollView>
            </Card>
          </View>
        )}

        {/* TAB CONTENT: 5. FINDINGS & LIMITATIONS */}
        {activeTab === 'findings' && (
          <View style={styles.tabSection}>
            {/* Statistical Findings */}
            <Card style={styles.findingsCard}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="check-circle" size={18} color={Colors.success} />
                <Text style={styles.cardHeading}>Key Statistical Findings</Text>
              </View>
              {analysis.statistical_findings?.map((f, i) => (
                <View key={i} style={styles.findingItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.findingText}>{f}</Text>
                </View>
              ))}
            </Card>

            {/* Methodological Limitations */}
            <Card style={styles.limitsCard}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="alert-circle" size={18} color={Colors.warning} />
                <Text style={styles.cardHeading}>Methodological Limitations & Scope</Text>
              </View>
              {analysis.limitations?.map((lim, i) => (
                <View key={i} style={styles.limitItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.limitText}>{lim}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Floating Chat Action */}
        <Card
          variant="outline"
          style={styles.chatPromptCard}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/assistant',
              params: { analysisId: analysis.id },
            })
          }
        >
          <View style={styles.chatPromptContent}>
            <View style={styles.chatIconBox}>
              <Feather name="message-square" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatPromptTitle}>Ask Exam Stress Assistant</Text>
              <Text style={styles.chatPromptDesc}>
                Ask questions grounded strictly in this dataset's calculated statistics.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.primary} />
          </View>
        </Card>
      </ScrollView>

      <FloatingChatButton analysisId={analysis.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerCard: {
    padding: 16,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tabsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.white,
  },
  tabSection: {
    gap: 14,
  },
  summaryCard: {
    padding: 16,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13.5,
    color: Colors.text,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: -4,
  },
  methodCard: {
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  methodHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  methodText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  scoringText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tableCard: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 13,
    color: Colors.text,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  qualityScoreCard: {
    padding: 16,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qualitySub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scoreBadgeCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scoreCircleVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.success,
  },
  scoreCircleMax: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  qualityRowsList: {
    gap: 10,
  },
  qRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  qLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  qVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  findingsCard: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
  },
  limitsCard: {
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  findingText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    flex: 1,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  limitText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  bulletDot: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -1,
  },
  chatPromptCard: {
    padding: 14,
    marginTop: 8,
  },
  chatPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  chatPromptDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
