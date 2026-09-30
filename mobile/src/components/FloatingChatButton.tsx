// mobile/src/components/FloatingChatButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';

interface FloatingChatButtonProps {
  analysisId?: string;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ analysisId }) => {
  const router = useRouter();

  const handlePress = () => {
    if (analysisId) {
      router.push({
        pathname: '/(tabs)/assistant',
        params: { analysisId },
      });
    } else {
      router.push('/(tabs)/assistant');
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.floatingButton}
      onPress={handlePress}
    >
      <View style={styles.inner}>
        <Feather name="message-square" size={22} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FloatingChatButton;
