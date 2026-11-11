import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, confirm, EmptyState, OutfitCollage, SectionTitle } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';
import { CATEGORIES, categoryLabel } from '../../lib/types';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { itemById, updateItem, removeItem, outfits } = useStore();
  const item = itemById(id);
  const [name, setName] = useState(item?.name ?? '');

  if (!item) {
    return <EmptyState icon="help-circle-outline" title="Item not found" body="It may have been deleted." />;
  }

  const usedIn = outfits.filter((o) => o.itemIds.includes(item.id));

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: item.name || categoryLabel(item.category) }} />
      <View style={{ alignItems: 'center', padding: 16 }}>
        <Image source={{ uri: item.imageUri }} style={styles.photo} />
      </View>

      <SectionTitle>Name</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={() => updateItem(item.id, { name: name.trim() })}
        onSubmitEditing={() => updateItem(item.id, { name: name.trim() })}
        placeholder="Add a name"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <SectionTitle>Category</SectionTitle>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            selected={item.category === c.key}
            onPress={() => updateItem(item.id, { category: c.key })}
          />
        ))}
      </View>

      <SectionTitle>In {usedIn.length} saved outfit{usedIn.length === 1 ? '' : 's'}</SectionTitle>
      {usedIn.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
          {usedIn.map((o) => (
            <View key={o.id} style={{ width: 110 }}>
              <OutfitCollage items={o.itemIds.map(itemById).filter((i) => !!i)} height={110} />
              <Text numberOfLines={1} style={styles.small} onPress={() => router.push(`/outfit/${o.id}`)}>
                {o.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ padding: 16, gap: 10, marginTop: 10 }}>
        <Button
          title="Build an outfit with this"
          icon="color-wand-outline"
          onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', items: item.id } })}
        />
        <Button
          title="Delete item"
          icon="trash-outline"
          variant="danger"
          onPress={() =>
            confirm('Delete this item?', 'It will be removed from your closet and any saved outfits.', () => {
              router.back();
              removeItem(item.id);
            })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { width: 280, height: 280, borderRadius: radius, backgroundColor: colors.border },
  input: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  small: { marginTop: 4, fontSize: 13, color: colors.text, fontWeight: '600' },
});
