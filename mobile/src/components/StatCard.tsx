// mobile/src/components/StatCard.tsx
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Colors from '../constants/Colors';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  accentColor = Colors.primary,
  style,
}) => {
  return (
    <Card style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }]}>{icon}</View>}
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  subtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default StatCard;
