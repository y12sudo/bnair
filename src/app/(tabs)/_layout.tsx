import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import type { IconName } from '../../components/ui';
import { colors } from '../../lib/theme';

function icon(name: IconName) {
  return ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={name} color={color as ComponentProps<typeof Ionicons>['color']} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="closet" options={{ title: 'Closet', tabBarIcon: icon('shirt-outline') }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits', tabBarIcon: icon('albums-outline') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar-outline') }} />
    </Tabs>
  );
}
