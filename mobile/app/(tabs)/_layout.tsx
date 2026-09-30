// mobile/app/(tabs)/_layout.tsx
// Sleek Floating Dark Navigation Bar matching the reference theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../../src/constants/Colors';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bottomMargin = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10);

  return (
    <View style={[styles.tabBarWrapper, { bottom: bottomMargin }]}>
      <View style={styles.floatingBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: any = 'home';
          let label = 'Home';

          if (route.name === 'index') {
            iconName = 'home';
            label = 'Home';
          } else if (route.name === 'analyses') {
            iconName = 'box';
            label = 'Studies';
          } else if (route.name === 'assistant') {
            iconName = 'navigation';
            label = 'Assistant';
          } else if (route.name === 'profile') {
            iconName = 'user';
            label = 'Profile';
          }

          return (
            <React.Fragment key={route.key}>
              {/* Insert Center Orange Floating Action Button before the 3rd tab (assistant) */}
              {index === 2 ? (
                <TouchableOpacity
                  style={styles.centerFabButton}
                  onPress={() => router.push('/upload')}
                  activeOpacity={0.88}
                >
                  <View style={styles.centerFabInner}>
                    <Feather name="plus" size={24} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <Feather
                  name={iconName}
                  size={20}
                  color={isFocused ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? '#FFFFFF' : '#64748B' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="analyses"
        options={{
          title: 'Studies',
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  floatingBar: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderRadius: 36,
    height: 64,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  centerFabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 4,
  },
  centerFabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
