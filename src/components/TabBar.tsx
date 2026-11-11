import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { useTheme } from '../lib/theme';
import { Glass, IconButton, type IconName } from './ui';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['sparkles-outline', 'sparkles'],
  closet: ['shirt-outline', 'shirt'],
  outfits: ['layers-outline', 'layers'],
  calendar: ['calendar-clear-outline', 'calendar-clear'],
};

export const TAB_BAR_SPACE = 104;

/** Floating glass pill with a sliding highlight, plus a separate camera button. */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const [pillWidth, setPillWidth] = useState(0);
  const inset = 5;
  const slot = pillWidth ? (pillWidth - inset * 2) / state.routes.length : 0;

  const highlight = useAnimatedStyle(() => ({
    width: slot,
    transform: [{ translateX: withSpring(inset + state.index * slot, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Glass radius={999} intensity={70} style={styles.pill}>
        <View style={{ flexDirection: 'row', flex: 1 }} onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}>
          {slot > 0 && (
            <Animated.View
              style={[styles.highlight, { backgroundColor: t.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)' }, highlight]}
            />
          )}
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const label = descriptors[route.key].options.title ?? route.name;
            const [off, on] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
            const color = focused ? t.accent : t.secondary;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={styles.tab}
                onPress={() => {
                  if (!focused) {
                    haptic.tap();
                    navigateToTab(route.key);
                  }
                }}
              >
                <Ionicons name={focused ? on : off} size={22} color={color} />
                <Text style={[styles.label, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Glass>
      <IconButton icon="camera" label="Add a piece" size={62} variant="primary" onPress={() => router.push('/add-item')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { flex: 1, height: 62, flexDirection: 'row' },
  highlight: { position: 'absolute', top: 5, bottom: 5, borderRadius: 999 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
});
