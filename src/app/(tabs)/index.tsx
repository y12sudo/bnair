import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ItemThumb, SectionTitle } from '../../components/ui';
import { prettyDate, todayKey } from '../../lib/dates';
import { shuffleOutfit } from '../../lib/shuffle';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { categoryLabel } from '../../lib/types';

export default function TodayScreen() {
  const { items, calendar, outfitById, itemById, saveOutfit, setDay } = useStore();
  const key = todayKey();
  const planned = calendar[key] ? outfitById(calendar[key]) : undefined;
  const [suggestion, setSuggestion] = useState<string[] | null>(null);

  const showIds = suggestion ?? planned?.itemIds ?? [];
  const shown = showIds.map(itemById).filter((i) => !!i);

  const shuffle = () => {
    if (items.length === 0) {
      Alert.alert('Closet is empty', 'Add a few photos of your clothes first.');
      return;
    }
    setSuggestion(shuffleOutfit(items));
  };

  const wearSuggestion = () => {
    if (!suggestion?.length) return;
    const outfit = saveOutfit({ name: `Outfit for ${prettyDate(key)}`, itemIds: suggestion });
    setDay(key, outfit.id);
    setSuggestion(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>{prettyDate(key)}</Text>
      <Text style={styles.heading}>
        {suggestion ? 'How about this?' : planned ? `Wearing: ${planned.name}` : 'What are you wearing?'}
      </Text>

      {shown.length > 0 ? (
        <View style={styles.grid}>
          {shown.map((item) => (
            <View key={item.id}>
              <ItemThumb item={item} size={140} onPress={() => router.push(`/item/${item.id}`)} />
              <Text style={styles.cat}>{categoryLabel(item.category)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="sparkles-outline"
          title={items.length ? 'Nothing planned yet' : 'Start your closet'}
          body={
            items.length
              ? 'Shuffle for a suggestion, build an outfit, or pick one from your saved looks.'
              : 'Snap photos of your clothes and accessories in the Closet tab, then come back to plan your look.'
          }
        />
      )}

      <View style={styles.actions}>
        {suggestion ? (
          <>
            <Button title="Wear this today" icon="checkmark-circle-outline" onPress={wearSuggestion} />
            <Button
              title="Tweak it"
              icon="create-outline"
              variant="secondary"
              onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', items: suggestion.join(','), day: key } })}
            />
            <Button title="Shuffle again" icon="shuffle" variant="secondary" onPress={shuffle} />
          </>
        ) : (
          <>
            <Button title="Shuffle an outfit" icon="shuffle" onPress={shuffle} />
            <Button
              title="Build an outfit"
              icon="color-wand-outline"
              variant="secondary"
              onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', day: key } })}
            />
            {planned && (
              <Button
                title="Edit today's outfit"
                icon="create-outline"
                variant="secondary"
                onPress={() => router.push(`/outfit/${planned.id}`)}
              />
            )}
          </>
        )}
      </View>

      {!suggestion && !planned && items.length > 0 && (
        <>
          <SectionTitle>Tip</SectionTitle>
          <Text style={styles.tip}>
            Saved outfits can be assigned to any day from the Calendar tab.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  date: { color: colors.muted, fontSize: 15 },
  heading: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  cat: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { gap: 10, marginTop: 24 },
  tip: { color: colors.muted, paddingHorizontal: 16, lineHeight: 20 },
});
