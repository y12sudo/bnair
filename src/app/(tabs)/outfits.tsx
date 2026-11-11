import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EmptyState, Fab, OutfitCollage } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

export default function OutfitsScreen() {
  const { outfits, itemById, calendar } = useStore();
  const { width } = useWindowDimensions();
  const cols = width > 600 ? 3 : 2;
  const cardWidth = (width - 32 - 12 * (cols - 1)) / cols;

  const timesWorn = (id: string) => Object.values(calendar).filter((v) => v === id).length;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        key={cols}
        data={outfits}
        numColumns={cols}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item: outfit }) => {
          const items = outfit.itemIds.map(itemById).filter((i) => !!i);
          const worn = timesWorn(outfit.id);
          return (
            <Pressable style={[styles.card, { width: cardWidth }]} onPress={() => router.push(`/outfit/${outfit.id}`)}>
              <OutfitCollage items={items} height={cardWidth} />
              <Text style={styles.name} numberOfLines={1}>
                {outfit.name}
              </Text>
              <Text style={styles.meta}>
                {items.length} piece{items.length === 1 ? '' : 's'}
                {worn ? ` · planned ${worn}×` : ''}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title="No saved outfits yet"
            body="Tap + to combine items from your closet into a look you can reuse."
          />
        }
      />
      <Fab icon="add" label="New outfit" onPress={() => router.push('/outfit/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 110, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 8, borderWidth: 1, borderColor: colors.border },
  name: { marginTop: 8, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
