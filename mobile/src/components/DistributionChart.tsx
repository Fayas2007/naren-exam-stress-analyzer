// mobile/src/components/DistributionChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { StressCategory } from '../types';
import Card from './Card';

interface DistributionChartProps {
  categories: StressCategory[];
  dominantCategory?: string;
  rulesDescription?: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  categories,
  dominantCategory,
  rulesDescription,
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stress Level Distribution</Text>
        {rulesDescription && (
          <Text style={styles.subtitle}>{rulesDescription}</Text>
        )}
      </View>

      <View style={styles.barsContainer}>
        {categories.map((cat, idx) => {
          const pct = Math.max(0, Math.min(100, cat.percentage || 0));
          const isDominant = cat.category === dominantCategory;

          return (
            <View key={idx} style={styles.categoryRow}>
              <View style={styles.labelRow}>
                <View style={styles.nameWithDot}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color || Colors.primary }]} />
                  <Text style={[styles.categoryName, isDominant && styles.boldText]}>
                    {cat.category}
                  </Text>
                  <Text style={styles.rangeText}>({cat.range})</Text>
                </View>
                <View style={styles.countWrapper}>
                  <Text style={styles.countText}>{cat.count} records</Text>
                  <Text style={[styles.percentageText, { color: cat.color || Colors.primary }]}>
                    {cat.percentage}%
                  </Text>
                </View>
              </View>

              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: cat.color || Colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {dominantCategory && (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Dominant Tier: </Text>
          <Text style={styles.footerValue}>{dominantCategory}</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  barsContainer: {
    gap: 14,
  },
  categoryRow: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
  },
  rangeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  countWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
  barBackground: {
    height: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default DistributionChart;
