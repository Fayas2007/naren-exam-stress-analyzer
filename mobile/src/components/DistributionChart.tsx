// mobile/src/components/DistributionChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Colors from '../constants/Colors';
import { StressCategory } from '../types';
import Card from './Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 380);

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

  // SVG Chart Geometry
  const W = CHART_WIDTH;
  const H = 190;
  const plotLeft = 40;
  const plotRight = W - 15;
  const plotTop = 24;
  const plotBottom = 150;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  // Max percentage to scale Y axis
  const maxPct = Math.max(...categories.map((c) => c.percentage || 0), 60);
  const yCeil = Math.ceil(maxPct / 20) * 20;

  const barCount = categories.length;
  const barWidth = Math.min(68, (plotWidth / barCount) * 0.65);
  const spacing = (plotWidth - barWidth * barCount) / (barCount + 1);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Stress Level Distribution</Text>
          <View style={styles.graphBadge}>
            <Text style={styles.graphBadgeText}>Empirical Frequency</Text>
          </View>
        </View>
        {rulesDescription && (
          <Text style={styles.subtitle}>{rulesDescription}</Text>
        )}
      </View>

      {/* Realistic Statistical Column Graph */}
      <View style={styles.svgContainer}>
        <Svg width={W} height={H}>
          <Defs>
            {categories.map((cat, idx) => {
              const baseColor = cat.color || Colors.primary;
              return (
                <LinearGradient
                  key={`grad-${idx}`}
                  id={`catGrad-${idx}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={baseColor} stopOpacity="1" />
                  <Stop offset="1" stopColor={baseColor} stopOpacity="0.75" />
                </LinearGradient>
              );
            })}
          </Defs>

          {/* Grid Panel Background */}
          <Rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={plotHeight}
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1"
            rx="4"
          />

          {/* Horizontal Grid Lines & Ticks */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((step, idx) => {
            const val = Math.round(yCeil * step);
            const y = plotBottom - (val / yCeil) * plotHeight;
            return (
              <G key={`grid-${idx}`}>
                <Line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={step > 0 && step < 1 ? '3,3' : undefined}
                />
                <SvgText
                  x={plotLeft - 6}
                  y={y + 3.5}
                  fontSize="9"
                  fill="#64748B"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {val}%
                </SvgText>
              </G>
            );
          })}

          {/* Columns */}
          {categories.map((cat, idx) => {
            const x = plotLeft + spacing * (idx + 1) + barWidth * idx;
            const pct = Math.max(0, cat.percentage || 0);
            const barH = Math.max(8, (pct / yCeil) * plotHeight);
            const y = plotBottom - barH;
            const isDominant = cat.category === dominantCategory;

            return (
              <G key={`col-${idx}`}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={`url(#catGrad-${idx})`}
                  stroke={isDominant ? '#0F172A' : '#CBD5E1'}
                  strokeWidth={isDominant ? '1.5' : '1'}
                  rx="4"
                />

                {/* Percentage & Count Badge on Top */}
                <G transform={`translate(${x + barWidth / 2}, ${y - 8})`}>
                  <Rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="14"
                    rx="3"
                    fill={isDominant ? '#0F172A' : '#334155'}
                  />
                  <SvgText
                    x="0"
                    y="-2"
                    fontSize="8.5"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {pct}%
                  </SvgText>
                </G>

                {/* Category Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={plotBottom + 15}
                  fontSize="10"
                  fontWeight={isDominant ? '700' : '600'}
                  fill={isDominant ? '#0F172A' : '#475569'}
                  textAnchor="middle"
                >
                  {cat.category.replace(' Stress', '')}
                </SvgText>

                {/* Range Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={plotBottom + 27}
                  fontSize="8.5"
                  fill="#94A3B8"
                  textAnchor="middle"
                >
                  {cat.range}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Detailed Breakdown Rows */}
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
                  {isDominant && (
                    <View style={styles.dominantPill}>
                      <Text style={styles.dominantPillText}>Dominant</Text>
                    </View>
                  )}
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
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  graphBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  graphBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  svgContainer: {
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
  },
  barsContainer: {
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
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
  dominantPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  dominantPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
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
