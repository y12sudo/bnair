import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, confirm, ItemThumb, OutfitCollage, SectionTitle } from '../../components/ui';
import { prettyDate, todayKey } from '../../lib/dates';
import { shuffleOutfit } from '../../lib/shuffle';
import { useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';
import { CATEGORIES } from '../../lib/types';

export default function OutfitBuilder() {
  const params = useLocalSearchParams<{ id: string; items?: string; day?: string }>();
  const { items, outfitById, itemById, saveOutfit, removeOutfit, setDay, calendar } = useStore();
  const existing = params.id !== 'new' ? outfitById(params.id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [selected, setSelected] = useState<string[]>(
    existing?.itemIds ?? (params.items ? params.items.split(',').filter(Boolean) : []),
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const chosen = selected.map(itemById).filter((i) => !!i);
  const day = params.day;
  const wornDays = existing
    ? Object.keys(calendar).filter((k) => calendar[k] === existing.id).sort()
    : [];

  const save = (assignTo?: string) => {
    const outfit = saveOutfit({ id: existing?.id, name, itemIds: selected });
    if (assignTo) setDay(assignTo, outfit.id);
    router.back();
  };

  if (items.length === 0) {
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={styles.empty}>Add some clothes to your closet before building an outfit.</Text>
        <Button title="Add an item" icon="camera" onPress={() => router.replace('/add-item')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: existing ? 'Edit outfit' : 'New outfit' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 16, gap: 12 }}>
          <OutfitCollage items={chosen} height={200} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name this outfit (e.g. Friday casual)"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Shuffle" icon="shuffle" variant="secondary" onPress={() => setSelected(shuffleOutfit(items))} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Clear" icon="refresh" variant="secondary" onPress={() => setSelected([])} disabled={!selected.length} />
            </View>
          </View>
        </View>

        {CATEGORIES.map((c) => {
          const inCat = items.filter((i) => i.category === c.key);
          if (inCat.length === 0) return null;
          return (
            <View key={c.key}>
              <SectionTitle>{c.label}</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
                {inCat.map((item) => (
                  <ItemThumb key={item.id} item={item} size={92} selected={selected.includes(item.id)} onPress={() => toggle(item.id)} />
                ))}
              </ScrollView>
            </View>
          );
        })}

        {wornDays.length > 0 && (
          <>
            <SectionTitle>Planned on</SectionTitle>
            <Text style={styles.days}>{wornDays.map(prettyDate).join('\n')}</Text>
          </>
        )}

        {existing && (
          <View style={{ padding: 16 }}>
            <Button
              title="Delete outfit"
              icon="trash-outline"
              variant="danger"
              onPress={() =>
                confirm('Delete this outfit?', 'Your clothes stay in the closet.', () => {
                  router.back();
                  removeOutfit(existing.id);
                })
              }
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button title="Save" icon="bookmark-outline" variant="secondary" onPress={() => save()} disabled={!selected.length} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            title={day && day !== todayKey() ? 'Save for that day' : 'Wear today'}
            icon="calendar-outline"
            onPress={() => save(day ?? todayKey())}
            disabled={!selected.length}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  empty: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  days: { paddingHorizontal: 16, color: colors.text, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
