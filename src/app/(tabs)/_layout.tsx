import { Tabs } from 'expo-router';

import { TabBar } from '../../components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="closet" options={{ title: 'Closet' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Looks' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Plan' }} />
    </Tabs>
  );
}
