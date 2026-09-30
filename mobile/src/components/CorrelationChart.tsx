// mobile/src/components/CorrelationChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Rect,
  Line,
  Circle,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Colors from '../constants/Colors';
import { CorrelationItem } from '../types';
import Card from './Card';
import Badge from './Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 380);

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

  // SVG Chart Geometry
  const W = CHART_WIDTH;
  const numItems = correlations.length;
  const rowHeight = 36;
  const plotLeft = 88;
  const plotRight = W - 38;
  const plotTop = 22;
  const plotBottom = plotTop + numItems * rowHeight;
  const plotWidth = plotRight - plotLeft;
  const H = plotBottom + 30;

  // Center zero line for bipolar correlation (-1.0 to +1.0)
  const zeroX = plotLeft + plotWidth / 2;

  // Map Pearson r (-1.0 to +1.0) to SVG X
  const mapRToX = (r: number) => {
    const clamped = Math.max(-1, Math.min(1, r));
    return zeroX + (clamped * (plotWidth / 2));
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Variable Associations (Pearson r)</Text>
          <View style={styles.bipolarBadge}>
            <Text style={styles.bipolarBadgeText}>Bipolar [-1.0, +1.0]</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Linear correlation coefficients, directional effect sizes & significance
        </Text>
      </View>

      {/* Realistic Bipolar Statistical Correlation Plot */}
      <View style={styles.svgContainer}>
        <Svg width={W} height={H}>
          {/* Background Panel */}
          <Rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={plotBottom - plotTop}
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1"
            rx="4"
          />

          {/* Reference Gridlines: -1.0, -0.5, 0.0, +0.5, +1.0 */}
          {[-1.0, -0.5, 0.0, 0.5, 1.0].map((val) => {
            const x = mapRToX(val);
            const isZero = val === 0;
            return (
              <G key={`rgrid-${val}`}>
                <Line
                  x1={x}
                  y1={plotTop}
                  x2={x}
                  y2={plotBottom}
                  stroke={isZero ? '#475569' : '#E2E8F0'}
                  strokeWidth={isZero ? '1.5' : '1'}
                  strokeDasharray={isZero ? undefined : '2,2'}
                />
                <SvgText
                  x={x}
                  y={plotBottom + 14}
                  fontSize="8.5"
                  fill={isZero ? '#0F172A' : '#64748B'}
                  fontWeight={isZero ? '700' : '500'}
                  textAnchor="middle"
                >
                  {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {/* Axis Region Labels */}
          <SvgText x={plotLeft + 15} y={plotBottom + 25} fontSize="7.5" fill="#2563EB" textAnchor="start">
            &larr; Negative (Protective)
          </SvgText>
          <SvgText x={plotRight - 15} y={plotBottom + 25} fontSize="7.5" fill="#DC2626" textAnchor="end">
            Positive (Risk) &rarr;
          </SvgText>

          {/* Correlation Bars for Each Pair */}
          {correlations.map((item, idx) => {
            const centerY = plotTop + idx * rowHeight + rowHeight / 2;
            const r = item.correlation;
            const rX = mapRToX(r);
            const isPositive = r > 0;
            const barColor = isPositive ? '#DC2626' : '#2563EB';
            const barLeft = isPositive ? zeroX : rX;
            const barW = Math.abs(rX - zeroX);

            // Abbreviated label for Y axis
            const v1Short = item.variable_1.replace('_score', '').replace('_hours', '');
            const v2Short = item.variable_2.replace('_score', '').replace('_hours', '');
            const pairLabel = `${v1Short} ↔ ${v2Short}`;

            return (
              <G key={`item-${idx}`}>
                {/* Variable Pair Label on Y-axis */}
                <SvgText
                  x={plotLeft - 6}
                  y={centerY + 3}
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#1E293B"
                  textAnchor="end"
                >
                  {pairLabel.length > 14 ? pairLabel.substring(0, 13) + '…' : pairLabel}
                </SvgText>

                {/* Bipolar Bar */}
                <Rect
                  x={barLeft}
                  y={centerY - 6}
                  width={Math.max(2, barW)}
                  height="12"
                  fill={barColor}
                  fillOpacity="0.75"
                  rx="3"
                />

                {/* Whisker Marker at tip */}
                <Circle
                  cx={rX}
                  cy={centerY}
                  r="4.5"
                  fill={barColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Numerical r Value */}
                <SvgText
                  x={plotRight + 5}
                  y={centerY + 3.5}
                  fontSize="9.5"
                  fontWeight="bold"
                  fill={barColor}
                  textAnchor="start"
                >
                  {r > 0 ? `+${r}` : r}
                  {item.is_statistically_significant ? '*' : ''}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Statistical Details List */}
      <View style={styles.list}>
        {correlations.map((item, idx) => {
          const isPositive = item.correlation > 0;
          return (
            <View key={idx} style={styles.corrItem}>
              <View style={styles.topRow}>
                <View style={styles.varPair}>
                  <Text style={styles.varName}>{formatVarName(item.variable_1)}</Text>
                  <Text style={styles.vsText}>↔</Text>
                  <Text style={styles.varName}>{formatVarName(item.variable_2)}</Text>
                </View>
                <Badge
                  label={item.is_statistically_significant ? 'p < 0.05 *' : 'p = ' + item.p_value}
                  variant={item.is_statistically_significant ? 'info' : 'neutral'}
                />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.strengthText}>
                  {item.strength} {isPositive ? 'Positive Association' : 'Inverse Covariance'}
                </Text>
                <Text style={[styles.rValuePill, { color: isPositive ? '#DC2626' : '#2563EB' }]}>
                  r = {item.correlation > 0 ? `+${item.correlation}` : item.correlation}
                </Text>
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
    marginBottom: 8,
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
  bipolarBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bipolarBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  svgContainer: {
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
  },
  list: {
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  corrItem: {
    padding: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  varPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  varName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.text,
  },
  vsText: {
    fontSize: 11,
    color: Colors.textMuted,
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
    flex: 1,
  },
  rValuePill: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  sampleText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

export default CorrelationChart;
