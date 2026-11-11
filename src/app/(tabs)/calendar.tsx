import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatLay } from '../../components/FlatLay';
import { TAB_BAR_SPACE } from '../../components/TabBar';
import { Backdrop, Button, Glass, IconButton, LargeTitle, PressableScale, SectionLabel } from '../../components/ui';
import { dateKey, parseKey, todayKey } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { radius, type, useTheme } from '../../lib/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { calendar, outfits, outfitById, itemById, setDay } = useStore();
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => {
    const out: (string | null)[] = Array(month.getDay()).fill(null);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) out.push(dateKey(new Date(month.getFullYear(), month.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const cover = (key: string) => {
    const o = calendar[key] ? outfitById(calendar[key]) : undefined;
    return o?.itemIds.map(itemById).find((i) => !!i)?.imageUri;
  };

  const plannedThisMonth = cells.filter((k) => k && calendar[k]).length;
  const sel = calendar[selected] ? outfitById(calendar[selected]) : undefined;
  const selItems = sel ? sel.itemIds.map(itemById).filter((i) => !!i) : [];
  const selDate = parseKey(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const boardW = width - 40 - 28;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_SPACE + insets.bottom + 20 }}>
        <LargeTitle eyebrow={`${plannedThisMonth} ${plannedThisMonth === 1 ? 'day' : 'days'} styled`} title="Plan" />

        <View style={{ paddingHorizontal: 20 }}>
          <Glass radius={radius.xl} style={{ padding: 14 }}>
            <View style={styles.monthBar}>
              <Text style={[type.title, { color: t.text }]}>
                {month.toLocaleDateString(undefined, { month: 'long' })}{' '}
                <Text style={{ color: t.accent }}>{month.getFullYear()}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconButton icon="chevron-back" label="Previous month" size={36} onPress={() => shift(-1)} />
                <IconButton icon="chevron-forward" label="Next month" size={36} onPress={() => shift(1)} />
              </View>
            </View>
            <View style={styles.grid}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={[styles.weekday, { color: t.secondary }]}>
                  {w}
                </Text>
              ))}
              {cells.map((key, i) => {
                if (!key) return <View key={i} style={styles.cell} />;
                const img = cover(key);
                const isSel = key === selected;
                const isToday = key === today;
                return (
                  <Pressable
                    key={key}
                    style={styles.cell}
                    accessibilityLabel={parseKey(key).toDateString()}
                    onPress={() => {
                      haptic.tap();
                      setSelected(key);
                    }}
                  >
                    <View style={[styles.day, isSel && { borderColor: t.accent, borderWidth: 2.5 }]}>
                      {img ? (
                        <>
                          <Image source={{ uri: img }} style={StyleSheet.absoluteFill} />
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
                          <Text style={[styles.dayNum, { color: '#fff' }]}>{Number(key.slice(8))}</Text>
                        </>
                      ) : isToday ? (
                        <LinearGradient colors={[t.accent, t.accent2]} style={[StyleSheet.absoluteFill, styles.center]}>
                          <Text style={[styles.dayNum, { color: '#fff' }]}>{Number(key.slice(8))}</Text>
                        </LinearGradient>
                      ) : (
                        <Text style={[styles.dayNum, { color: t.text }]}>{Number(key.slice(8))}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Glass>
        </View>

        <SectionLabel>{selDate}</SectionLabel>
        <Animated.View key={selected + (sel?.id ?? '')} entering={FadeIn.duration(250)} style={{ paddingHorizontal: 20 }}>
          <Glass radius={radius.xl} style={{ padding: 14, gap: 14 }}>
            {sel ? (
              <>
                <PressableScale onPress={() => router.push(`/outfit/${sel.id}`)}>
                  <FlatLay items={selItems} width={boardW} framed={false} />
                </PressableScale>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: t.text }]} numberOfLines={1}>
                      {sel.name}
                    </Text>
                    <Text style={[type.footnote, { color: t.secondary }]}>{selItems.length} pieces</Text>
                  </View>
                  <IconButton icon="trash-outline" label="Clear this day" tint={t.danger} onPress={() => { haptic.warning(); setDay(selected, null); }} />
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 6, paddingVertical: 18 }}>
                <Ionicons name="sparkles-outline" size={28} color={t.tertiary} />
                <Text style={[type.callout, { color: t.secondary }]}>Nothing planned. Pick a look below.</Text>
              </View>
            )}
          </Glass>
        </Animated.View>

        <SectionLabel>{sel ? 'Swap look' : 'Choose a look'}</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
          {outfits
            .filter((o) => o.id !== sel?.id)
            .map((o) => (
              <PressableScale
                key={o.id}
                onPress={() => {
                  haptic.success();
                  setDay(selected, o.id);
                }}
              >
                <Glass radius={radius.md} style={{ padding: 6, width: 132 }}>
                  <FlatLay items={o.itemIds.map(itemById).filter((i) => !!i)} width={120} framed={false} />
                  <Text numberOfLines={1} style={[type.footnote, { color: t.text, padding: 4 }]}>
                    {o.name}
                  </Text>
                </Glass>
              </PressableScale>
            ))}
          <View style={{ width: 132, justifyContent: 'center' }}>
            <Button
              title="New"
              icon="add"
              variant="glass"
              size="md"
              onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', day: selected } })}
            />
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontWeight: '600', fontSize: 12, marginBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  day: { flex: 1, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 15, fontWeight: '600' },
});
