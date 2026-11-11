import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatLay, FLATLAY_RATIO } from '../../components/FlatLay';
import { type SwipeDir, SwipeDeck } from '../../components/SwipeDeck';
import { TAB_BAR_SPACE } from '../../components/TabBar';
import { Backdrop, Button, EmptyState, Glass, IconButton, LargeTitle, SectionLabel } from '../../components/ui';
import { parseKey, todayKey } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { newId } from '../../lib/storage';
import { shuffleMany } from '../../lib/shuffle';
import { useStore } from '../../lib/store';
import { radius, type, useTheme } from '../../lib/theme';
import { styleTip, useWeather, type Weather } from '../../lib/weather';

type Suggestion = { key: string; ids: string[] };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function WeatherCard({ w }: { w: Weather }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <Glass style={styles.weather}>
        <LinearGradient colors={['#5AC8FA', '#007AFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weatherIcon}>
          <Ionicons name={w.icon} size={26} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={[type.title, { color: t.text }]}>{w.temp}°</Text>
            <Text style={[type.callout, { color: t.secondary }]}>
              {w.label} · H {w.high}° L {w.low}°{w.place ? ` · ${w.place}` : ''}
            </Text>
          </View>
          <Text style={[type.footnote, { color: t.text }]}>{styleTip(w)}</Text>
        </View>
      </Glass>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { items, calendar, outfitById, itemById, saveOutfit, setDay } = useStore();
  const weatherState = useWeather();
  const weather = weatherState.status === 'ready' ? weatherState.weather : undefined;

  const key = todayKey();
  const planned = calendar[key] ? outfitById(calendar[key]) : undefined;
  const [browsing, setBrowsing] = useState(false);
  const [deck, setDeck] = useState<Suggestion[]>([]);
  const [trigger, setTrigger] = useState<{ dir: SwipeDir; n: number } | null>(null);
  const skipped = useRef(0);

  // Size the deck so the card, its buttons and the tab bar all fit on one screen.
  const weatherSpace = weatherState.status === 'unavailable' ? 0 : 96;
  const room = height - insets.top - insets.bottom - 150 - weatherSpace - 36 - 84 - TAB_BAR_SPACE;
  const cardW = Math.max(240, Math.min(width - 40, 420, (room - 64) / FLATLAY_RATIO));
  const cardH = cardW * FLATLAY_RATIO + 64;
  const heroW = Math.min(width - 40, 460);

  const refill = useCallback(
    (current: Suggestion[]) => {
      const need = 4 - current.length;
      if (need <= 0 || items.length === 0) return current;
      return [...current, ...shuffleMany(items, need, weather).map((ids) => ({ key: newId(), ids }))];
    },
    [items, weather],
  );

  // Fresh deck when the closet or weather changes.
  useEffect(() => {
    setDeck(refill([]));
  }, [refill]);

  const showDeck = items.length > 0 && (!planned || browsing);

  const onSwipe = (card: Suggestion, dir: SwipeDir) => {
    setTrigger(null);
    if (dir === 'right') {
      haptic.success();
      const d = parseKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const outfit = saveOutfit({ name: `${weather ? `${weather.label} day` : 'Daily look'} · ${d}`, itemIds: card.ids });
      setDay(key, outfit.id);
      setBrowsing(false);
      setDeck((cur) => refill(cur.filter((c) => c.key !== card.key)));
    } else {
      skipped.current += 1;
      setDeck((cur) => refill(cur.filter((c) => c.key !== card.key)));
    }
  };

  const plannedItems = planned ? planned.itemIds.map(itemById).filter((i) => !!i) : [];
  const date = parseKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_SPACE + insets.bottom + 20 }}>
        <LargeTitle eyebrow={date} title={greeting()} />

        {weather && (
          <View style={{ paddingHorizontal: 20 }}>
            <WeatherCard w={weather} />
          </View>
        )}

        {items.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="camera"
              title="Build your closet"
              body="Photograph a few tops, bottoms and shoes. Then come back here and swipe through outfits made from your own clothes."
              action={<Button title="Add your first piece" icon="camera" onPress={() => router.push('/add-item')} />}
            />
          </View>
        ) : showDeck ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <SectionLabel
              right={
                planned ? (
                  <Text onPress={() => setBrowsing(false)} style={[type.callout, { color: t.accent }]}>
                    Keep current
                  </Text>
                ) : undefined
              }
            >
              Swipe right to wear
            </SectionLabel>
            <SwipeDeck
              cards={deck}
              width={cardW}
              height={cardH}
              trigger={trigger}
              onSwipe={onSwipe}
              renderCard={(card) => {
                const its = card.ids.map(itemById).filter((i) => !!i);
                return (
                  <Glass radius={radius.xl} opaque style={{ flex: 1, padding: 14 }}>
                    <FlatLay items={its} width={cardW - 28} framed={false} />
                    <View style={styles.cardFooter}>
                      <Text style={[type.headline, { color: t.text }]} numberOfLines={1}>
                        {its.map((i) => i.name).filter(Boolean).slice(0, 3).join(' · ') || `${its.length} pieces`}
                      </Text>
                    </View>
                  </Glass>
                );
              }}
            />
            <View style={styles.controls}>
              <IconButton icon="close" label="Skip" size={60} tint={t.danger} onPress={() => setTrigger((p) => ({ dir: 'left', n: (p?.n ?? 0) + 1 }))} />
              <IconButton
                icon="color-wand"
                label="Edit this look"
                size={48}
                onPress={() => deck[0] && router.push({ pathname: '/outfit/[id]', params: { id: 'new', items: deck[0].ids.join(','), day: key } })}
              />
              <IconButton icon="heart" label="Wear this" size={60} variant="primary" onPress={() => setTrigger((p) => ({ dir: 'right', n: (p?.n ?? 0) + 1 }))} />
            </View>
          </Animated.View>
        ) : (
          planned && (
            <Animated.View entering={FadeInDown.springify().damping(16)}>
              <SectionLabel>Today’s look</SectionLabel>
              <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                <Glass radius={radius.xl} intensity={80} style={{ padding: 14, gap: 14, width: heroW }}>
                  <FlatLay items={plannedItems} width={heroW - 28} framed={false} />
                  <View style={{ paddingHorizontal: 4 }}>
                    <Text style={[type.title, { color: t.text }]}>{planned.name}</Text>
                    <Text style={[type.callout, { color: t.secondary, marginTop: 2 }]}>
                      {plannedItems.length} pieces · locked in for today
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Button title="Restyle" icon="shuffle" variant="glass" size="md" onPress={() => setBrowsing(true)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Edit" icon="color-wand" variant="glass" size="md" onPress={() => router.push(`/outfit/${planned.id}`)} />
                    </View>
                  </View>
                </Glass>
              </View>
            </Animated.View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  weather: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  weatherIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flex: 1, justifyContent: 'center', paddingHorizontal: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 8 },
});
