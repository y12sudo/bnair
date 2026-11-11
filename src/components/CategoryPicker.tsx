import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { radius, type, useTheme } from '../lib/theme';
import { CATEGORIES, type Category } from '../lib/types';
import { Glass, PressableScale } from './ui';

/** 3×2 grid of category tiles; the selected one lights up with the accent gradient. */
export function CategoryPicker({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((c) => {
        const on = value === c.key;
        const inner = (
          <View style={styles.tile}>
            <Ionicons name={c.icon} size={24} color={on ? '#fff' : t.text} />
            <Text style={[type.footnote, { color: on ? '#fff' : t.text }]}>{c.label}</Text>
          </View>
        );
        return (
          <View key={c.key} style={styles.cell}>
            <PressableScale onPress={() => onChange(c.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c.label}>
              {on ? (
                <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.md }}>
                  {inner}
                </LinearGradient>
              ) : (
                <Glass radius={radius.md}>{inner}</Glass>
              )}
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  cell: { width: '33.333%', padding: 4 },
  tile: { height: 78, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
