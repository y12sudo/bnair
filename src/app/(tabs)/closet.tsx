import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Chip, ChipRow, EmptyState, Fab, ItemThumb } from '../../components/ui';
import { useStore } from '../../lib/store';
import { CATEGORIES, type Category } from '../../lib/types';

const GAP = 12;
const PAD = 16;

export default function ClosetScreen() {
  const { items } = useStore();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const { width } = useWindowDimensions();
  const cols = width > 600 ? 4 : 3;
  const size = Math.floor((width - PAD * 2 - GAP * (cols - 1)) / cols);

  const shown = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <View style={{ flex: 1 }}>
      <View>
        <ChipRow>
          <Chip label={`All (${items.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
          {CATEGORIES.map((c) => {
            const count = items.filter((i) => i.category === c.key).length;
            return (
              <Chip
                key={c.key}
                label={`${c.label} (${count})`}
                selected={filter === c.key}
                onPress={() => setFilter(c.key)}
              />
            );
          })}
        </ChipRow>
      </View>
      <FlatList
        key={cols}
        data={shown}
        numColumns={cols}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <ItemThumb item={item} size={size} onPress={() => router.push(`/item/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="camera-outline"
            title={filter === 'all' ? 'Your closet is empty' : 'Nothing in this category'}
            body="Tap + to take a photo of a piece of clothing or an accessory."
          />
        }
      />
      <Fab icon="add" label="Add item" onPress={() => router.push({ pathname: '/add-item', params: filter === 'all' ? {} : { category: filter } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: PAD, paddingBottom: 110, gap: GAP },
});
