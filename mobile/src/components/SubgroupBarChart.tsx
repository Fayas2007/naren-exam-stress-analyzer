// mobile/src/components/SubgroupBarChart.tsx
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
import { GroupComparison } from '../types';
import Card from './Card';
import Badge from './Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 380);

interface SubgroupBarChartProps {
  comparison: GroupComparison;
}

export const SubgroupBarChart: React.FC<SubgroupBarChartProps> = ({ comparison }) => {
  if (!comparison || !comparison.groups || comparison.groups.length === 0) {
    return null;
  }

  const groups = comparison.groups;
  const numGroups = groups.length;

  // SVG Chart Geometry
  const W = CHART_WIDTH;
  const rowHeight = 36;
  const plotLeft = 85;
  const plotRight = W - 45;
  const plotTop = 20;
  const plotBottom = plotTop + numGroups * rowHeight;
  const plotWidth = plotRight - plotLeft;
  const H = plotBottom + 32;

  // Map 0 - 10 stress scale to SVG X
  const mapX = (val: number) => {
    const clamped = Math.max(0, Math.min(10, val));
    return plotLeft + (clamped / 10) * plotWidth;
  };

  const getStressColor = (val: number) => {
    if (val > 7) return Colors.error;
    if (val >= 4) return Colors.warning;
    return Colors.success;
  };

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

      {/* Realistic Statistical Group Comparison Chart with ±SD Error Bars */}
      <View style={styles.svgContainer}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="scaleGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#10B981" stopOpacity="0.1" />
              <Stop offset="0.4" stopColor="#F59E0B" stopOpacity="0.1" />
              <Stop offset="0.7" stopColor="#EF4444" stopOpacity="0.15" />
            </LinearGradient>
          </Defs>

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

          {/* Reference Vertical Gridlines (0, 2, 4, 6, 8, 10) */}
          {[0, 2, 4, 6, 8, 10].map((tick) => {
            const x = mapX(tick);
            return (
              <G key={`vgrid-${tick}`}>
                <Line
                  x1={x}
                  y1={plotTop}
                  x2={x}
                  y2={plotBottom}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 || tick === 10 ? undefined : '2,2'}
                />
                <SvgText
                  x={x}
                  y={plotBottom + 14}
                  fontSize="9"
                  fill="#64748B"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}

          {/* Stress Zone Reference Labels at Bottom */}
          <SvgText x={mapX(2)} y={plotBottom + 26} fontSize="7.5" fill="#10B981" textAnchor="middle">Low (&lt;4)</SvgText>
          <SvgText x={mapX(5.5)} y={plotBottom + 26} fontSize="7.5" fill="#D97706" textAnchor="middle">Mod (4-7)</SvgText>
          <SvgText x={mapX(8.5)} y={plotBottom + 26} fontSize="7.5" fill="#DC2626" textAnchor="middle">High (&gt;7)</SvgText>

          {/* Subgroup Rows with Mean Points and ±SD Error Bars */}
          {groups.map((grp, idx) => {
            const centerY = plotTop + idx * rowHeight + rowHeight / 2;
            const meanVal = grp.mean_stress || 0;
            const sdVal = grp.sd_stress || 1.0;
            const meanX = mapX(meanVal);
            const errLowX = mapX(Math.max(0, meanVal - sdVal));
            const errHighX = mapX(Math.min(10, meanVal + sdVal));
            const barColor = getStressColor(meanVal);

            return (
              <G key={`grp-${idx}`}>
                {/* Group Name on Y-axis */}
                <SvgText
                  x={plotLeft - 8}
                  y={centerY + 3.5}
                  fontSize="10"
                  fontWeight="600"
                  fill="#1E293B"
                  textAnchor="end"
                >
                  {grp.group.length > 11 ? grp.group.substring(0, 10) + '…' : grp.group}
                </SvgText>

                {/* Shaded Track Bar to Mean */}
                <Rect
                  x={plotLeft}
                  y={centerY - 5}
                  width={Math.max(0, meanX - plotLeft)}
                  height="10"
                  fill={barColor}
                  fillOpacity="0.2"
                  rx="3"
                />

                {/* ±SD Error Whisker Line */}
                <Line
                  x1={errLowX}
                  y1={centerY}
                  x2={errHighX}
                  y2={centerY}
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                {/* Whisker End Caps */}
                <Line
                  x1={errLowX}
                  y1={centerY - 4}
                  x2={errLowX}
                  y2={centerY + 4}
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <Line
                  x1={errHighX}
                  y1={centerY - 4}
                  x2={errHighX}
                  y2={centerY + 4}
                  stroke="#334155"
                  strokeWidth="1.8"
                />

                {/* Mean Point Marker */}
                <Circle
                  cx={meanX}
                  cy={centerY}
                  r="5.5"
                  fill={barColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />

                {/* Value Callout on the right */}
                <SvgText
                  x={plotRight + 6}
                  y={centerY + 3.5}
                  fontSize="10"
                  fontWeight="bold"
                  fill={barColor}
                  textAnchor="start"
                >
                  {meanVal.toFixed(1)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Subgroup Summary Table */}
      <View style={styles.groupsContainer}>
        {groups.map((grp, idx) => {
          const barColor = getStressColor(grp.mean_stress);
          return (
            <View key={idx} style={styles.groupItem}>
              <View style={styles.groupHeader}>
                <View style={styles.groupNameRow}>
                  <View style={[styles.groupDot, { backgroundColor: barColor }]} />
                  <Text style={styles.groupName}>{grp.group}</Text>
                  <Text style={styles.sampleSize}>N = {grp.sample_size}</Text>
                </View>
                <Text style={[styles.meanValue, { color: barColor }]}>
                  μ = {grp.mean_stress} <Text style={styles.sdText}>(±{grp.sd_stress} SD)</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {comparison.statistical_test && (
        <View style={styles.testNote}>
          <Text style={styles.testText}>
            ANOVA Model: F = {comparison.statistical_test.f_statistic}, p ={' '}
            {comparison.statistical_test.p_value} ({comparison.statistical_test.significant ? 'Statistically Significant' : 'Not Significant'})
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
    marginBottom: 10,
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
  svgContainer: {
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
  },
  groupsContainer: {
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  groupItem: {
    width: '100%',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  sampleSize: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  meanValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sdText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  testNote: {
    marginTop: 10,
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
