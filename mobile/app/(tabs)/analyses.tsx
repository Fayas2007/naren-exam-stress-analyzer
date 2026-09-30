// mobile/app/(tabs)/analyses.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { analysisApi } from '../../src/api/analysisApi';
import { AnalysisSummaryItem } from '../../src/types';
import Colors from '../../src/constants/Colors';
import EmptyState from '../../src/components/EmptyState';
import LoadingView from '../../src/components/LoadingView';

export default function AnalysesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisSummaryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');

  const fetchAnalyses = async (query = searchQuery, sort = sortBy) => {
    try {
      const res = await analysisApi.listAnalyses({ q: query, sort_by: sort });
      setAnalyses(res.analyses || []);
    } catch (e: any) {
      if (e?.message && !e.message.includes('canceled')) {
        console.log('[Analyses] Notice:', e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchAnalyses();
    }, [searchQuery, sortBy])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyses();
  };

  const handleDelete = (item: AnalysisSummaryItem) => {
    Alert.alert(
      'Delete Analysis',
      `Are you sure you want to delete "${item.title}"? This action will permanently remove this analysis and its associated metrics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await analysisApi.deleteAnalysis(item.id);
              setAnalyses((prev) => prev.filter((a) => a.id !== item.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete analysis');
            }
          },
        },
      ]
    );
  };

  const getStressCategoryBadge = (scoreNum: number, dominantCategory?: string) => {
    if (dominantCategory) {
      if (dominantCategory.includes('High')) return { label: 'High Stress', bg: '#FFEDD5', text: '#EA580C' };
      if (dominantCategory.includes('Moderate')) return { label: 'Moderate', bg: '#FEF3C7', text: '#D97706' };
      return { label: 'Low Stress', bg: '#DCFCE7', text: '#16A34A' };
    }
    if (isNaN(scoreNum) || scoreNum <= 0) return { label: 'Baseline', bg: '#F1F5F9', text: '#64748B' };
    if (scoreNum < 4.5) return { label: 'Low Stress', bg: '#DCFCE7', text: '#16A34A' };
    if (scoreNum <= 7.0) return { label: 'Moderate', bg: '#FEF3C7', text: '#D97706' };
    return { label: 'High Stress', bg: '#FFEDD5', text: '#EA580C' };
  };

  const renderItem = ({ item }: { item: AnalysisSummaryItem }) => {
    const badge = getStressCategoryBadge(item.mean_stress || 0, item.dominant_category);
    const isDoc = !item.original_filename.endsWith('.csv');

    return (
      <TouchableOpacity
        style={styles.analysisCard}
        onPress={() =>
          router.push({
            pathname: '/analysis/[id]',
            params: { id: item.id },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardIconBox}>
            <Feather name={isDoc ? 'file-text' : 'activity'} size={20} color="#0B132B" />
          </View>

          <View style={styles.cardCenter}>
            <Text style={styles.cardId}>#STRESS-{item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardRoute}>
              {item.original_filename} • {item.valid_rows} Records
            </Text>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="trash-2" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Mean Index: </Text>
            <Text style={styles.metricValue}>{item.mean_stress?.toFixed(1) ?? '--'}/10</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SD: </Text>
            <Text style={styles.metricValue}>±{item.sd_stress?.toFixed(1) ?? '--'}</Text>
          </View>
          <View style={styles.formatTag}>
            <Text style={styles.formatTagText}>{isDoc ? 'DOCUMENT' : 'DATASET'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Research Archive</Text>
        <Text style={styles.headerSub}>Saved datasets & statistical evaluations</Text>
      </View>

      {/* Search and Sort Capsule Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search archive..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              fetchAnalyses(t, sortBy);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchAnalyses('', sortBy); }}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'oldest' && styles.sortButtonActive]}
          onPress={() => {
            const nextSort = sortBy === 'recent' ? 'oldest' : 'recent';
            setSortBy(nextSort);
            fetchAnalyses(searchQuery, nextSort);
          }}
        >
          <Feather
            name={sortBy === 'recent' ? 'arrow-down' : 'arrow-up'}
            size={14}
            color={sortBy === 'oldest' ? '#FFFFFF' : '#0B132B'}
          />
          <Text style={[styles.sortButtonText, sortBy === 'oldest' && styles.sortButtonTextActive]}>
            {sortBy === 'recent' ? 'Recent' : 'Oldest'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Analyses List */}
      {loading && !refreshing ? (
        <LoadingView message="Loading analysis archive..." />
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B00"
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <EmptyState
                icon={<Feather name="search" size={32} color={Colors.textSecondary} />}
                title="No matching analyses"
                description={`No analyses found matching "${searchQuery}". Try a different keyword.`}
                actionTitle="Clear Search"
                onAction={() => {
                  setSearchQuery('');
                  fetchAnalyses('', sortBy);
                }}
              />
            ) : (
              <EmptyState
                icon={<Feather name="bar-chart-2" size={32} color="#0B132B" />}
                title="No saved analyses"
                description="Upload and analyze survey datasets to build your research archive."
                actionTitle="Upload New Dataset"
                onAction={() => router.push('/upload')}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B132B',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sortButtonActive: {
    backgroundColor: '#0B132B',
    borderColor: '#0B132B',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B132B',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110, // Avoid navigation bar overlap
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardCenter: {
    flex: 1,
  },
  cardId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B132B',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  cardRoute: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B132B',
  },
  formatTag: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formatTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});

