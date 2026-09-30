// mobile/src/components/CorrelationChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { CorrelationItem } from '../types';
import Card from './Card';
import Badge from './Badge';

interface CorrelationChartProps {
  correlations: CorrelationItem[];
}

export const CorrelationChart: React.FC<CorrelationChartProps> = ({ correlations }) => {
  if (!correlations || correlations.length === 0) {
    return null;
  }

  const formatVarName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Variable Associations (Pearson r)</Text>
        <Text style={styles.subtitle}>
          Linear correlation coefficients and statistical significance tests
        </Text>
      </View>

      <View style={styles.list}>
        {correlations.map((item, idx) => {
          const isPositive = item.correlation > 0;
          const absR = Math.abs(item.correlation);
          const barWidth = Math.min(100, Math.round(absR * 100));

          return (
            <View key={idx} style={styles.corrItem}>
              <View style={styles.topRow}>
                <View style={styles.varPair}>
                  <Text style={styles.varName}>{formatVarName(item.variable_1)}</Text>
                  <Text style={styles.vsText}>↔</Text>
                  <Text style={styles.varName}>{formatVarName(item.variable_2)}</Text>
                </View>
                <Badge
                  label={item.is_statistically_significant ? 'p < 0.05' : 'p = ' + item.p_value}
                  variant={item.is_statistically_significant ? 'info' : 'neutral'}
                />
              </View>

              <View style={styles.visualRow}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.corrBar,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: isPositive ? Colors.primary : Colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.rValue,
                    { color: isPositive ? Colors.primary : Colors.warning },
                  ]}
                >
                  r = {item.correlation > 0 ? `+${item.correlation}` : item.correlation}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.strengthText}>{item.strength}</Text>
                <Text style={styles.sampleText}>N = {item.sample_size}</Text>
              </View>
            </View>
          );
        })}
      </View>
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
  list: {
    gap: 12,
  },
  corrItem: {
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  varPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  varName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  vsText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.white,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  corrBar: {
    height: '100%',
    borderRadius: 4,
  },
  rValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 55,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sampleText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

export default CorrelationChart;
