import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { useTheme } from '../lib/theme';
import type { ClothingItem } from '../lib/types';

type Slot = { x: number; y: number; w: number; h: number; rot: number; z: number; round?: boolean };

/** Board height as a multiple of its width. */
export const FLATLAY_RATIO = 1.12;

function wobble(id: string, range: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000) * range * 2 - range;
}

/**
 * Lays an outfit out like a styled flat lay: the main garment in the middle,
 * a jacket peeking out behind, shoes at the foot, accessories down the side.
 * Positions are fractions of the board width so it scales to any size.
 */
function layout(items: ClothingItem[]): { item: ClothingItem; slot: Slot }[] {
  const of = (c: ClothingItem['category']) => items.filter((i) => i.category === c);
  const [outer, ...outerRest] = of('outerwear');
  const [top, ...topRest] = of('tops');
  const [bottom, ...bottomRest] = of('bottoms');
  const [dress, ...dressRest] = of('dresses');
  const [shoes, ...shoesRest] = of('shoes');
  const placed: { item: ClothingItem; slot: Slot }[] = [];
  const add = (item: ClothingItem | undefined, slot: Omit<Slot, 'rot'>, rot = 4) => {
    if (item) placed.push({ item, slot: { ...slot, rot: wobble(item.id, rot) } });
  };

  const hasSeparates = !!(top || bottom);
  if (dress && !hasSeparates) {
    add(outer, { x: 0.3, y: 0.05, w: 0.38, h: 0.38, z: 1 });
    add(dress, { x: 0.07, y: 0.06, w: 0.46, h: 0.74, z: 2 }, 2.5);
  } else {
    add(outer, { x: 0.3, y: 0.03, w: 0.38, h: 0.38, z: 1 });
    add(top, { x: 0.06, y: 0.06, w: 0.43, h: 0.43, z: 2 });
    add(bottom, { x: 0.12, y: 0.44, w: 0.4, h: 0.42, z: 3 });
  }
  add(shoes, { x: 0.4, y: 0.79, w: 0.27, h: 0.27, z: 4 }, 7);

  const side = [...of('accessories'), ...(dress && hasSeparates ? [dress] : []), ...dressRest, ...outerRest, ...topRest, ...bottomRest, ...shoesRest];
  side.slice(0, 4).forEach((item, i) =>
    add(item, { x: 0.73, y: 0.07 + i * 0.255, w: 0.22, h: 0.22, z: 5, round: item.category === 'accessories' }, 6),
  );
  return placed;
}

export function FlatLay({
  items,
  width,
  framed = true,
  empty = 'Pick pieces below to start styling',
}: {
  items: ClothingItem[];
  width: number;
  framed?: boolean;
  empty?: string;
}) {
  const t = useTheme();
  const height = width * FLATLAY_RATIO;
  const placed = layout(items);
  const extra = items.length - placed.length;
  const corner = Math.max(10, width * 0.05);

  return (
    <View
      style={[
        { width, height, borderRadius: corner * 1.4, overflow: 'hidden' },
        framed && { backgroundColor: t.board, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.hairline },
      ]}
    >
      {placed.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="shirt-outline" size={width * 0.14} color={t.tertiary} />
          {width > 200 && <Text style={{ color: t.secondary, fontSize: 15, fontWeight: '500' }}>{empty}</Text>}
        </View>
      )}
      {placed.map(({ item, slot }) => (
        <Animated.View
          key={item.id}
          entering={ZoomIn.springify().damping(14)}
          exiting={ZoomOut.duration(160)}
          layout={LinearTransition.springify().damping(16)}
          style={{
            position: 'absolute',
            left: slot.x * width,
            top: slot.y * width,
            width: slot.w * width,
            height: slot.h * width,
            zIndex: slot.z,
            transform: [{ rotate: `${slot.rot}deg` }],
            borderRadius: slot.round ? (slot.w * width) / 2 : corner,
            shadowColor: t.shadow,
            shadowOpacity: 0.28,
            shadowRadius: width * 0.03,
            shadowOffset: { width: 0, height: width * 0.015 },
            elevation: 4,
            backgroundColor: t.board,
          }}
        >
          <Image
            source={{ uri: item.imageUri }}
            style={{ flex: 1, borderRadius: slot.round ? (slot.w * width) / 2 : corner }}
            resizeMode="cover"
          />
        </Animated.View>
      ))}
      {extra > 0 && (
        <View style={[styles.more, { backgroundColor: t.text }]}>
          <Text style={{ color: t.dark ? '#000' : '#fff', fontWeight: '700', fontSize: 12 }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  more: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, zIndex: 9 },
});
