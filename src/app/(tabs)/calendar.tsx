import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, OutfitCollage, SectionTitle } from '../../components/ui';
import { dateKey, prettyDate, todayKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const { calendar, outfits, outfitById, itemById, setDay } = useStore();
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => {
    const first = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(first).fill(null);
    for (let d = 1; d <= days; d++) out.push(dateKey(new Date(month.getFullYear(), month.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const coverFor = (key: string) => {
    const outfit = calendar[key] ? outfitById(calendar[key]) : undefined;
    const first = outfit?.itemIds.map(itemById).find((i) => !!i);
    return { outfit, cover: first?.imageUri };
  };

  const sel = coverFor(selected);
  const selItems = sel.outfit ? sel.outfit.itemIds.map(itemById).filter((i) => !!i) : [];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.monthBar}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={24} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={i} style={styles.cell} />;
          const { cover } = coverFor(key);
          const isSel = key === selected;
          const isToday = key === today;
          return (
            <Pressable key={key} style={styles.cell} onPress={() => setSelected(key)}>
              <View style={[styles.day, isSel && styles.daySel, isToday && !isSel && styles.dayToday]}>
                {cover && <Image source={{ uri: cover }} style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} />}
                <Text style={[styles.dayNum, cover && styles.dayNumOnImg]}>{Number(key.slice(8))}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>{prettyDate(selected)}</SectionTitle>
      <View style={styles.panel}>
        {sel.outfit ? (
          <>
            <Pressable onPress={() => router.push(`/outfit/${sel.outfit!.id}`)}>
              <OutfitCollage items={selItems} height={180} />
              <Text style={styles.outfitName}>{sel.outfit.name}</Text>
            </Pressable>
            <Button title="Remove from this day" icon="close-circle-outline" variant="danger" onPress={() => setDay(selected, null)} />
          </>
        ) : (
          <Text style={styles.muted}>No outfit planned.</Text>
        )}
      </View>

      <SectionTitle>{sel.outfit ? 'Swap for another outfit' : 'Pick an outfit'}</SectionTitle>
      {outfits.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.muted}>Save an outfit first, then assign it here.</Text>
          <Button
            title="Build an outfit"
            icon="color-wand-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', day: selected } })}
          />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
          {outfits
            .filter((o) => o.id !== sel.outfit?.id)
            .map((o) => (
              <Pressable key={o.id} style={{ width: 120 }} onPress={() => setDay(selected, o.id)}>
                <OutfitCollage items={o.itemIds.map(itemById).filter((i) => !!i)} height={120} />
                <Text numberOfLines={1} style={styles.pickName}>
                  {o.name}
                </Text>
              </Pressable>
            ))}
          <Pressable
            style={[styles.newCard]}
            onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', day: selected } })}
          >
            <Ionicons name="add" size={28} color={colors.accent} />
            <Text style={styles.pickName}>New</Text>
          </Pressable>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontWeight: '600', marginBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  day: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySel: { borderColor: colors.accent, borderWidth: 2.5 },
  dayToday: { borderColor: colors.accent },
  dayNum: { margin: 4, fontSize: 12, fontWeight: '700', color: colors.text },
  dayNumOnImg: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  panel: {
    marginHorizontal: 16,
    padding: 12,
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outfitName: { marginTop: 8, fontWeight: '700', fontSize: 16, color: colors.text },
  muted: { color: colors.muted },
  pickName: { marginTop: 6, fontSize: 13, color: colors.text, fontWeight: '600' },
  newCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
