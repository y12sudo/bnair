import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '../../components/TabBar';
import { Backdrop, Button, Chip, EmptyState, IconButton, ItemTile, LargeTitle } from '../../components/ui';
import { useStore } from '../../lib/store';
import { CATEGORIES, type Category } from '../../lib/types';

const GAP = 12;
const PAD = 20;

export default function ClosetScreen() {
  const { items } = useStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const { width } = useWindowDimensions();
  const cols = width > 700 ? 4 : 3;
  const size = Math.floor((width - PAD * 2 - GAP * (cols - 1)) / cols);
  const shown = filter === 'all' ? items : items.filter((i) => i.category === filter);
  const add = () => router.push({ pathname: '/add-item', params: filter === 'all' ? {} : { category: filter } });

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <FlatList
        key={cols}
        data={shown}
        numColumns={cols}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_SPACE + insets.bottom + 20, gap: GAP + 6 }}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD }}
        ListHeaderComponent={
          <View>
            <LargeTitle
              eyebrow={`${items.length} piece${items.length === 1 ? '' : 's'}`}
              title="Closet"
              right={<IconButton icon="add" label="Add a piece" onPress={add} />}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: PAD, paddingBottom: 6 }}>
              <Chip label="All" icon="apps" selected={filter === 'all'} onPress={() => setFilter('all')} />
              {CATEGORIES.map((c) => (
                <Chip key={c.key} label={c.label} icon={c.icon} selected={filter === c.key} onPress={() => setFilter(c.key)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 35).springify().damping(16)}>
            <ItemTile item={item} size={size} onPress={() => router.push(`/item/${item.id}`)} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={filter === 'all' ? 'shirt' : (CATEGORIES.find((c) => c.key === filter)?.icon ?? 'shirt')}
            title={filter === 'all' ? 'An empty closet' : 'Nothing here yet'}
            body="Lay a piece flat in good light and snap it. Square photos look best."
            action={<Button title="Take a photo" icon="camera" onPress={add} />}
          />
        }
      />
    </View>
  );
}
