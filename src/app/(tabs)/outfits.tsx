import { router } from 'expo-router';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatLay } from '../../components/FlatLay';
import { TAB_BAR_SPACE } from '../../components/TabBar';
import { Backdrop, Button, EmptyState, Glass, IconButton, LargeTitle, PressableScale } from '../../components/ui';
import { useStore } from '../../lib/store';
import { radius, type, useTheme } from '../../lib/theme';

export default function OutfitsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { outfits, itemById, calendar } = useStore();
  const { width } = useWindowDimensions();
  const cols = width > 700 ? 3 : 2;
  const cardWidth = (width - 40 - 14 * (cols - 1)) / cols;
  const timesPlanned = (id: string) => Object.values(calendar).filter((v) => v === id).length;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <FlatList
        key={cols}
        data={outfits}
        numColumns={cols}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_SPACE + insets.bottom + 20, gap: 14 }}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 20 }}
        ListHeaderComponent={
          <LargeTitle
            eyebrow={`${outfits.length} saved`}
            title="Looks"
            right={<IconButton icon="add" label="New look" onPress={() => router.push('/outfit/new')} />}
          />
        }
        renderItem={({ item: outfit, index }) => {
          const its = outfit.itemIds.map(itemById).filter((i) => !!i);
          const n = timesPlanned(outfit.id);
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify().damping(16)}>
              <PressableScale onPress={() => router.push(`/outfit/${outfit.id}`)}>
                <Glass radius={radius.lg} style={{ width: cardWidth, padding: 8 }}>
                  <FlatLay items={its} width={cardWidth - 16} />
                  <View style={{ padding: 6, paddingTop: 10 }}>
                    <Text style={[type.headline, { color: t.text }]} numberOfLines={1}>
                      {outfit.name}
                    </Text>
                    <Text style={[type.footnote, { color: t.secondary, marginTop: 2 }]}>
                      {its.length} pieces{n ? ` · worn ${n}×` : ''}
                    </Text>
                  </View>
                </Glass>
              </PressableScale>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="layers"
            title="No looks yet"
            body="Combine pieces from your closet into outfits you can reuse, or swipe right on a suggestion in Today."
            action={<Button title="Style a look" icon="color-wand" onPress={() => router.push('/outfit/new')} />}
          />
        }
      />
    </View>
  );
}
