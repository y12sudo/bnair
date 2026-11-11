import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatLay } from '../../components/FlatLay';
import { Backdrop, Button, Chip, confirm, EmptyState, FloatingHeader, Glass, IconButton, ItemTile, SectionLabel } from '../../components/ui';
import { parseKey, todayKey } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { shuffleOutfit } from '../../lib/shuffle';
import { useStore } from '../../lib/store';
import { radius, type, useTheme } from '../../lib/theme';
import { CATEGORIES } from '../../lib/types';

export default function OutfitBuilder() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string; items?: string; day?: string }>();
  const { items, outfitById, itemById, saveOutfit, removeOutfit, setDay, calendar } = useStore();
  const existing = params.id !== 'new' ? outfitById(params.id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [selected, setSelected] = useState<string[]>(
    existing?.itemIds ?? (params.items ? params.items.split(',').filter(Boolean) : []),
  );

  const toggle = (id: string) => {
    haptic.tap();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const chosen = selected.map(itemById).filter((i) => !!i);
  const day = params.day ?? todayKey();
  const dayLabel = day === todayKey() ? 'Wear today' : `Wear ${parseKey(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const wornDays = existing ? Object.keys(calendar).filter((k) => calendar[k] === existing.id).sort() : [];
  const boardW = Math.min(width - 40, 460) - 28;

  const save = (assign: boolean) => {
    const outfit = saveOutfit({ id: existing?.id, name, itemIds: selected });
    if (assign) setDay(day, outfit.id);
    haptic.success();
    router.back();
  };

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Backdrop />
        <FloatingHeader />
        <EmptyState
          icon="shirt"
          title="Your closet is empty"
          body="Add a few pieces first, then come back to style them."
          action={<Button title="Add a piece" icon="camera" onPress={() => router.replace('/add-item')} />}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <FloatingHeader
        title={existing ? 'Edit look' : 'New look'}
        right={
          existing ? (
            <IconButton
              icon="trash-outline"
              label="Delete look"
              tint={t.danger}
              onPress={() =>
                confirm('Delete this look?', 'Your clothes stay in the closet.', () => {
                  haptic.warning();
                  router.back();
                  removeOutfit(existing.id);
                })
              }
            />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <Glass radius={radius.xl} intensity={80} style={{ padding: 14, gap: 12, width: boardW + 28 }}>
            <FlatLay items={chosen} width={boardW} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name this look"
              placeholderTextColor={t.tertiary}
              style={[type.title, { color: t.text, paddingHorizontal: 4, paddingVertical: 2 }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Shuffle" icon="shuffle" selected={false} onPress={() => setSelected(shuffleOutfit(items))} />
              <Chip label="Clear" icon="refresh" selected={false} onPress={() => setSelected([])} />
              <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={[type.footnote, { color: t.secondary }]}>{chosen.length} selected</Text>
              </View>
            </View>
          </Glass>
        </View>

        {CATEGORIES.map((c) => {
          const inCat = items.filter((i) => i.category === c.key);
          if (inCat.length === 0) return null;
          return (
            <View key={c.key}>
              <SectionLabel>{c.label}</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingVertical: 4 }}>
                {inCat.map((item) => (
                  <ItemTile key={item.id} item={item} size={96} selected={selected.includes(item.id)} onPress={() => toggle(item.id)} />
                ))}
              </ScrollView>
            </View>
          );
        })}

        {wornDays.length > 0 && (
          <>
            <SectionLabel>Planned on</SectionLabel>
            <Text style={[type.callout, { color: t.text, paddingHorizontal: 20, lineHeight: 22 }]}>
              {wornDays.map((k) => parseKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })).join('\n')}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Glass radius={999} intensity={70} style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Button title="Save" icon="bookmark" variant="glass" size="md" onPress={() => save(false)} disabled={!selected.length} />
          </View>
          <View style={{ flex: 1.5 }}>
            <Button title={dayLabel} icon="heart" size="md" onPress={() => save(true)} disabled={!selected.length} />
          </View>
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerWrap: { position: 'absolute', left: 14, right: 14, bottom: 0 },
  footer: { flexDirection: 'row', gap: 8, padding: 8 },
});
