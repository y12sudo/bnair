import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '../lib/haptics';
import { radius, useTheme } from '../lib/theme';

export type SwipeDir = 'left' | 'right';

export interface DeckCard {
  key: string;
}

const THRESHOLD = 110;

function Card({
  index,
  width,
  height,
  onSwiped,
  trigger,
  children,
}: {
  index: number;
  width: number;
  height: number;
  onSwiped: (dir: SwipeDir) => void;
  trigger: { dir: SwipeDir; n: number } | null;
  children: ReactNode;
}) {
  const t = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const isTop = index === 0;
  const crossedRef = useSharedValue(0);

  const fling = (dir: SwipeDir) => {
    'worklet';
    const to = (dir === 'right' ? 1 : -1) * width * 1.6;
    x.value = withTiming(to, { duration: 260 }, (done) => {
      if (done) scheduleOnRN(onSwiped, dir);
    });
  };

  // Buttons below the deck swipe the top card programmatically.
  useEffect(() => {
    if (isTop && trigger) {
      y.value = withTiming(-20, { duration: 260 });
      fling(trigger.dir);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.n]);

  const pan = usePanGesture({
    enabled: isTop,
    activeOffsetX: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
      y.value = e.translationY * 0.25;
      const crossed = Math.abs(e.translationX) > THRESHOLD ? 1 : 0;
      if (crossed !== crossedRef.value) {
        crossedRef.value = crossed;
        if (crossed) scheduleOnRN(haptic.soft);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (Math.abs(e.translationX) > THRESHOLD || Math.abs(e.velocityX) > 900) {
        fling(e.translationX > 0 ? 'right' : 'left');
      } else {
        x.value = withSpring(0, { damping: 15 });
        y.value = withSpring(0, { damping: 15 });
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const scale = isTop ? 1 : 1 - index * 0.05;
    return {
      zIndex: 10 - index,
      opacity: index > 2 ? 0 : 1,
      transform: [
        { translateX: x.value },
        { translateY: withSpring(isTop ? y.value : index * 16, { damping: 16 }) },
        { scale: withSpring(scale, { damping: 16 }) },
        { rotate: `${interpolate(x.value, [-width, width], [-12, 12], Extrapolation.CLAMP)}deg` },
      ],
    };
  });
  const wearStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { width, height, shadowColor: t.shadow }, cardStyle]}>
        {children}
        <Animated.View style={[styles.stamp, styles.stampLeft, { borderColor: t.success }, wearStyle]}>
          <Ionicons name="checkmark" size={20} color={t.success} />
          <Text style={[styles.stampText, { color: t.success }]}>WEAR</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampRight, { borderColor: t.danger }, skipStyle]}>
          <Ionicons name="close" size={20} color={t.danger} />
          <Text style={[styles.stampText, { color: t.danger }]}>SKIP</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function SwipeDeck<T extends DeckCard>({
  cards,
  width,
  height,
  renderCard,
  onSwipe,
  trigger,
}: {
  cards: T[];
  width: number;
  height: number;
  renderCard: (card: T) => ReactNode;
  onSwipe: (card: T, dir: SwipeDir) => void;
  trigger: { dir: SwipeDir; n: number } | null;
}) {
  const shown = cards.slice(0, 3);
  return (
    <View style={{ width, height: height + 36, alignSelf: 'center' }}>
      {shown
        .map((card, i) => (
          <Card key={card.key} index={i} width={width} height={height} trigger={i === 0 ? trigger : null} onSwiped={(dir) => onSwipe(card, dir)}>
            {renderCard(card)}
          </Card>
        ))
        .reverse()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: radius.xl,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  stamp: {
    position: 'absolute',
    top: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stampLeft: { left: 22, transform: [{ rotate: '-12deg' }] },
  stampRight: { right: 22, transform: [{ rotate: '12deg' }] },
  stampText: { fontWeight: '900', fontSize: 18, letterSpacing: 2 },
});
