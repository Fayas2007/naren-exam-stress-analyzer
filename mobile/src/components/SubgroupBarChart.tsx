// mobile/src/components/SubgroupBarChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { GroupComparison } from '../types';
import Card from './Card';
import Badge from './Badge';

interface SubgroupBarChartProps {
  comparison: GroupComparison;
}

export const SubgroupBarChart: React.FC<SubgroupBarChartProps> = ({ comparison }) => {
  if (!comparison || !comparison.groups || comparison.groups.length === 0) {
    return null;
  }

  // Find max mean stress to scale bar widths
  const maxStress = Math.max(...comparison.groups.map((g) => g.mean_stress || 0), 10);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{comparison.group_title}</Text>
          {comparison.statistical_test && (
            <Badge
              label={
                comparison.statistical_test.significant
                  ? 'Significant (p < 0.05)'
                  : 'p = ' + comparison.statistical_test.p_value
              }
              variant={comparison.statistical_test.significant ? 'info' : 'neutral'}
            />
          )}
        </View>
        <Text style={styles.description}>{comparison.description}</Text>
      </View>

      <View style={styles.groupsContainer}>
        {comparison.groups.map((grp, idx) => {
          const ratio = Math.max(0, Math.min(100, ((grp.mean_stress || 0) / maxStress) * 100));

          // Color coded based on stress level
          const getStressColor = (val: number) => {
            if (val > 7) return Colors.error;
            if (val >= 4) return Colors.warning;
            return Colors.success;
          };

          const barColor = getStressColor(grp.mean_stress);

          return (
            <View key={idx} style={styles.groupItem}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{grp.group}</Text>
                <View style={styles.statPills}>
                  <Text style={styles.sampleSize}>N = {grp.sample_size}</Text>
                  <Text style={[styles.meanValue, { color: barColor }]}>
                    Mean: {grp.mean_stress} (SD ±{grp.sd_stress})
                  </Text>
                </View>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${ratio}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {comparison.statistical_test && (
        <View style={styles.testNote}>
          <Text style={styles.testText}>
            ANOVA Test Statistic: F = {comparison.statistical_test.f_statistic}, p ={' '}
            {comparison.statistical_test.p_value}
          </Text>
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
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  groupsContainer: {
    gap: 12,
  },
  groupItem: {
    width: '100%',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  groupName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  statPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleSize: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  meanValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  testNote: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  testText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default SubgroupBarChart;
