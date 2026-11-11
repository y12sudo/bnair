import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '../../components/CategoryPicker';
import { FlatLay } from '../../components/FlatLay';
import { Backdrop, Button, confirm, EmptyState, FloatingHeader, Glass, IconButton, PressableScale, SectionLabel } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { radius, type, useTheme } from '../../lib/theme';
import { categoryLabel } from '../../lib/types';

export default function ItemScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { itemById, updateItem, removeItem, outfits, calendar } = useStore();
  const item = itemById(id);
  const [name, setName] = useState(item?.name ?? '');

  if (!item) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Backdrop />
        <FloatingHeader />
        <EmptyState icon="help" title="Piece not found" body="It may have been removed from your closet." />
      </View>
    );
  }

  const usedIn = outfits.filter((o) => o.itemIds.includes(item.id));
  const wornDays = Object.values(calendar).filter((oid) => usedIn.some((o) => o.id === oid)).length;
  const heroH = Math.min(width, 520);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <FloatingHeader
        right={
          <IconButton
            icon="trash-outline"
            label="Delete piece"
            tint={t.danger}
            onPress={() =>
              confirm('Delete this piece?', 'It will be removed from your closet and any saved looks.', () => {
                haptic.warning();
                router.back();
                removeItem(item.id);
              })
            }
          />
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: heroH }}>
          <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['transparent', t.backdrop[1]]} style={styles.fade} />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -56 }}>
          <Glass radius={radius.xl} style={{ padding: 18, gap: 4 }}>
            <Text style={[type.eyebrow, { color: t.accent }]}>{categoryLabel(item.category)}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => updateItem(item.id, { name: name.trim() })}
              onSubmitEditing={() => updateItem(item.id, { name: name.trim() })}
              placeholder="Name this piece"
              placeholderTextColor={t.tertiary}
              style={[type.largeTitle, { color: t.text, fontSize: 28, padding: 0 }]}
            />
            <View style={styles.stats}>
              <Stat value={usedIn.length} label={usedIn.length === 1 ? 'look' : 'looks'} />
              <Stat value={wornDays} label={wornDays === 1 ? 'day planned' : 'days planned'} />
              <Stat value={new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} label="added" />
            </View>
          </Glass>
        </View>

        <SectionLabel>Category</SectionLabel>
        <CategoryPicker value={item.category} onChange={(c) => updateItem(item.id, { category: c })} />

        {usedIn.length > 0 && (
          <>
            <SectionLabel>Appears in</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
              {usedIn.map((o) => (
                <PressableScale key={o.id} onPress={() => router.push(`/outfit/${o.id}`)}>
                  <Glass radius={radius.md} style={{ padding: 6, width: 132 }}>
                    <FlatLay items={o.itemIds.map(itemById).filter((i) => !!i)} width={120} framed={false} />
                    <Text numberOfLines={1} style={[type.footnote, { color: t.text, padding: 4 }]}>
                      {o.name}
                    </Text>
                  </Glass>
                </PressableScale>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ padding: 20, paddingTop: 28 }}>
          <Button
            title="Style a look around this"
            icon="color-wand"
            onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', items: item.id } })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.title, { color: t.text }]}>{value}</Text>
      <Text style={[type.footnote, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(127,127,127,0.3)' },
});
