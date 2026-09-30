// mobile/app/(tabs)/index.tsx
// Exact UI Theme matching the Logistics / Modern Dark Navy & Orange Design System

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { analysisApi } from '../../src/api/analysisApi';
import { AnalysisSummaryItem } from '../../src/types';
import Colors from '../../src/constants/Colors';
import LoadingView from '../../src/components/LoadingView';

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Studies', icon: 'grid' },
  { id: 'high', label: 'High Stress', icon: 'alert-circle' },
  { id: 'moderate', label: 'Moderate', icon: 'activity' },
  { id: 'low', label: 'Low Stress', icon: 'check-circle' },
  { id: 'docs', label: 'PDF / Docs', icon: 'file-text' },
];

const FILTER_TABS = ['All', 'In Progress', 'Completed'];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisSummaryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilterTab, setSelectedFilterTab] = useState('All');

  const fetchDashboardData = async () => {
    try {
      const res = await analysisApi.listAnalyses({ sort_by: 'recent' });
      setAnalyses(res.analyses || []);
      setTotalCount(res.total_analyses || 0);
    } catch (e: any) {
      if (e?.message && !e.message.includes('canceled')) {
        console.log('[Dashboard] Notice:', e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;

  // Filter analyses
  const filteredAnalyses = analyses.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'high') return (item.mean_stress || 0) >= 7.0;
    if (selectedCategory === 'moderate') return (item.mean_stress || 0) >= 4.5 && (item.mean_stress || 0) < 7.0;
    if (selectedCategory === 'low') return (item.mean_stress || 0) > 0 && (item.mean_stress || 0) < 4.5;
    if (selectedCategory === 'docs') return !item.original_filename.endsWith('.csv');

    return true;
  });

  const getStressCategoryBadge = (scoreNum: number) => {
    if (isNaN(scoreNum) || scoreNum <= 0) return { label: 'Baseline', bg: '#F1F5F9', text: '#64748B' };
    if (scoreNum < 4.5) return { label: 'Low Stress', bg: '#DCFCE7', text: '#16A34A' };
    if (scoreNum <= 7.0) return { label: 'Moderate', bg: '#FEF3C7', text: '#D97706' };
    return { label: 'High Stress', bg: '#FFEDD5', text: '#EA580C' };
  };

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'M';
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B00"
          />
        }
      >
        {/* 1. Top Bar: Network Node & Actions */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <Text style={styles.topHeaderSubtitle}>Research Hub</Text>
            <TouchableOpacity style={styles.networkSelectorRow} activeOpacity={0.7}>
              <Text style={styles.topHeaderTitle} numberOfLines={1}>
                {user?.institution || 'Psychometrics Network'}
              </Text>
              <Feather name="chevron-down" size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.topHeaderRight}>
            <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
              <Feather name="bell" size={18} color="#0F172A" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Sleek Capsule Search Bar */}
        <View style={styles.searchBarContainer}>
          <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search analysis ID, student cohort, or subject..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3. Upper 2-Column Action Cards */}
        <View style={styles.actionCardsRow}>
          {/* Card 1: New Survey / Doc */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/upload')}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIconCircle}>
                <Feather name="file-text" size={20} color="#0F172A" />
              </View>
              <View style={styles.actionCardArrow}>
                <Feather name="arrow-up-right" size={16} color="#64748B" />
              </View>
            </View>
            <Text style={styles.actionCardTitle}>New Analysis</Text>
            <Text style={styles.actionCardDesc}>Upload CSV, PDF, Word, PPTX</Text>
          </TouchableOpacity>

          {/* Card 2: AI Stress Copilot */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/assistant')}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIconCircle}>
                <Feather name="cpu" size={20} color="#0F172A" />
              </View>
              <View style={styles.actionCardArrow}>
                <Feather name="arrow-up-right" size={16} color="#64748B" />
              </View>
            </View>
            <Text style={styles.actionCardTitle}>AI Copilot</Text>
            <Text style={styles.actionCardDesc}>Grounded psychometrics chat</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Stress Predictor Banner */}
        <TouchableOpacity
          style={styles.predictorBannerCard}
          onPress={() => router.push('/predict')}
          activeOpacity={0.88}
        >
          <View style={styles.predictorBannerIconCircle}>
            <Feather name="trending-up" size={20} color="#FF6B00" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.predictorBadgeRow}>
              <Text style={styles.predictorBannerTitle}>Exam Stress Predictor</Text>
              <View style={styles.newBadgePill}>
                <Text style={styles.newBadgePillText}>R ML Model</Text>
              </View>
            </View>
            <Text style={styles.predictorBannerDesc}>
              Simulate stress scores & tiers based on study hours, sleep, exam format & anxiety.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FF6B00" />
        </TouchableOpacity>

        {/* 4. Active Cohort Spotlight Card (Dark Navy Reference Style) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Active Cohort Analysis</Text>
          {latestAnalysis ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/analyses')}>
              <Text style={styles.seeAllLink}>See All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && !refreshing ? (
          <LoadingView message="Loading active cohort..." style={{ paddingVertical: 24 }} />
        ) : latestAnalysis ? (
          <View style={styles.spotlightDarkCard}>
            {/* Top row: Tracking ID & Status Pill */}
            <View style={styles.spotlightTopRow}>
              <View>
                <Text style={styles.spotlightIdLabel}>ANALYSIS ID</Text>
                <Text style={styles.spotlightIdValue}>
                  #STRESS-{latestAnalysis.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.processingBadge}>
                <View style={styles.processingDot} />
                <Text style={styles.processingText}>
                  {latestAnalysis.dominant_category || 'Analyzed'}
                </Text>
              </View>
            </View>

            {/* Center Visual Flow Route */}
            <View style={styles.routeFlowRow}>
              <View style={styles.routePoint}>
                <Text style={styles.routeCity}>Sleep Baseline</Text>
                <Text style={styles.routeSub}>Cohort Avg Hours</Text>
              </View>

              <View style={styles.routeLineContainer}>
                <View style={styles.routeLine} />
                <View style={styles.routeCenterIconCircle}>
                  <Feather name="activity" size={14} color="#FFFFFF" />
                </View>
              </View>

              <View style={[styles.routePoint, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeCity}>
                  Stress: {latestAnalysis.mean_stress?.toFixed(1) || '--'}/10
                </Text>
                <Text style={styles.routeSub}>Observed Index</Text>
              </View>
            </View>

            {/* Bottom Row: Metadata & Blue Pill Action Button */}
            <View style={styles.spotlightBottomRow}>
              <View style={styles.spotlightMetaLeft}>
                <Text style={styles.spotlightMetaText}>
                  {latestAnalysis.valid_rows} Records • ±{latestAnalysis.sd_stress?.toFixed(1) || '0.0'} SD
                </Text>
              </View>

              <TouchableOpacity
                style={styles.trackPillBtn}
                onPress={() => router.push(`/analysis/${latestAnalysis.id}`)}
                activeOpacity={0.88}
              >
                <Feather name="send" size={14} color="#FFFFFF" />
                <Text style={styles.trackPillText}>Explore</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptySpotlightCard}>
            <Feather name="folder" size={32} color="#94A3B8" />
            <Text style={styles.emptySpotlightTitle}>No Active Studies</Text>
            <Text style={styles.emptySpotlightDesc}>Upload your first document or CSV to begin.</Text>
            <TouchableOpacity
              style={styles.emptyUploadBtn}
              onPress={() => router.push('/upload')}
            >
              <Text style={styles.emptyUploadBtnText}>Upload First Survey</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Category Filter Chips Ribbon */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsScroll}
        >
          {CATEGORY_CHIPS.map((chip) => {
            const isSelected = selectedCategory === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.categoryChip,
                  isSelected ? styles.categoryChipSelected : styles.categoryChipUnselected,
                ]}
                onPress={() => setSelectedCategory(chip.id)}
                activeOpacity={0.75}
              >
                <Feather
                  name={chip.icon as any}
                  size={15}
                  color={isSelected ? '#FFFFFF' : '#0F172A'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 6. Recent Research Studies Section */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionHeading}>Recent Research Cohorts</Text>
          <View style={styles.filterTabsRow}>
            {FILTER_TABS.map((tab) => {
              const isSelected = selectedFilterTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterTab,
                    isSelected ? styles.filterTabSelected : styles.filterTabUnselected,
                  ]}
                  onPress={() => setSelectedFilterTab(tab)}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      isSelected ? styles.filterTabTextSelected : styles.filterTabTextUnselected,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7. Recent List Cards */}
        <View style={styles.recentList}>
          {filteredAnalyses.length === 0 ? (
            <View style={styles.emptyListCard}>
              <Text style={styles.emptyListText}>No studies match the selected filter.</Text>
            </View>
          ) : (
            filteredAnalyses.map((item) => {
              const badge = getStressCategoryBadge(item.mean_stress || 0);
              const isDoc = !item.original_filename.endsWith('.csv');

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentCard}
                  onPress={() => router.push(`/analysis/${item.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentCardLeft}>
                    <View style={styles.recentCardIconBox}>
                      <Feather
                        name={isDoc ? 'file-text' : 'activity'}
                        size={20}
                        color="#0F172A"
                      />
                    </View>
                  </View>

                  <View style={styles.recentCardCenter}>
                    <Text style={styles.recentCardId}>
                      #STRESS-{item.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.recentCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.recentCardRoute}>
                      {item.valid_rows} Subjects • Mean: {item.mean_stress?.toFixed(1) || '--'}/10
                    </Text>
                  </View>

                  <View style={styles.recentCardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <Text style={styles.recentCardFormat}>
                      {isDoc ? 'DOC' : 'CSV'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 110, // Generous padding so floating dark tab bar never obscures items
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  topHeaderLeft: {
    flex: 1,
  },
  topHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  networkSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: '85%',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  predictorBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: '#FED7AA',
    gap: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  predictorBannerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  predictorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  predictorBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  newBadgePill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  newBadgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  predictorBannerDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  spotlightDarkCard: {
    backgroundColor: '#0B132B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#0B132B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  spotlightIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  spotlightIdValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  processingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
  },
  processingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF8A3D',
  },
  routeFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  routePoint: {
    flex: 1,
  },
  routeCity: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  routeSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  routeLineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  routeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#334155',
  },
  routeCenterIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  spotlightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  spotlightMetaLeft: {
    flex: 1,
  },
  spotlightMetaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  trackPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  trackPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySpotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySpotlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySpotlightDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  emptyUploadBtn: {
    backgroundColor: '#0B132B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  emptyUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipsScroll: {
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  categoryChipSelected: {
    backgroundColor: '#0B132B',
  },
  categoryChipUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryChipTextUnselected: {
    color: '#0F172A',
  },
  recentSectionHeader: {
    marginBottom: 12,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterTabSelected: {
    backgroundColor: '#0B132B',
  },
  filterTabUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextSelected: {
    color: '#FFFFFF',
  },
  filterTabTextUnselected: {
    color: '#64748B',
  },
  recentList: {
    gap: 10,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentCardLeft: {
    marginRight: 12,
  },
  recentCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCardCenter: {
    flex: 1,
  },
  recentCardId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentCardTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  recentCardRoute: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  recentCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  recentCardFormat: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  emptyListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyListText: {
    fontSize: 13,
    color: '#64748B',
  },
});
