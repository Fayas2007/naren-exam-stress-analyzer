// mobile/src/components/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Colors from '../constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      ...styles.button,
      ...(fullWidth && { width: '100%' }),
    };

    if (size === 'small') {
      base = { ...base, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 };
    } else if (size === 'large') {
      base = { ...base, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 };
    }

    switch (variant) {
      case 'secondary':
        return {
          ...base,
          backgroundColor: Colors.backgroundSecondary,
          borderColor: Colors.border,
          borderWidth: 1,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderColor: Colors.primary,
          borderWidth: 1.5,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: Colors.error,
        };
      case 'primary':
      default:
        return {
          ...base,
          backgroundColor: Colors.primary,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    let baseText: TextStyle = styles.text;

    if (size === 'small') {
      baseText = { ...baseText, fontSize: 13 };
    } else if (size === 'large') {
      baseText = { ...baseText, fontSize: 16 };
    }

    switch (variant) {
      case 'secondary':
        return { ...baseText, color: Colors.text };
      case 'outline':
        return { ...baseText, color: Colors.primary };
      case 'danger':
      case 'primary':
      default:
        return { ...baseText, color: Colors.white };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        getContainerStyle(),
        isDisabled && { opacity: 0.6, backgroundColor: variant === 'outline' ? 'transparent' : Colors.disabled },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? Colors.primary : Colors.white}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[getTextStyle(), isDisabled && { color: Colors.disabledText }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default Button;
