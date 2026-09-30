// mobile/src/components/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Colors from '../constants/Colors';

interface BadgeProps {
  label: string;
  variant?: 'low' | 'moderate' | 'high' | 'info' | 'neutral' | 'success';
  size?: 'small' | 'medium';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'small',
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'low':
      case 'success':
        return {
          backgroundColor: Colors.successLight,
          borderColor: Colors.successBorder,
          textColor: Colors.success,
        };
      case 'moderate':
        return {
          backgroundColor: Colors.warningLight,
          borderColor: Colors.warningBorder,
          textColor: Colors.warning,
        };
      case 'high':
        return {
          backgroundColor: Colors.errorLight,
          borderColor: Colors.errorBorder,
          textColor: Colors.error,
        };
      case 'info':
        return {
          backgroundColor: Colors.primaryLight,
          borderColor: Colors.primaryBorder,
          textColor: Colors.primary,
        };
      case 'neutral':
      default:
        return {
          backgroundColor: Colors.backgroundSecondary,
          borderColor: Colors.border,
          textColor: Colors.textSecondary,
        };
    }
  };

  const theme = getBadgeStyle();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.textColor,
            fontSize: isSmall ? 11 : 13,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

export default Badge;
