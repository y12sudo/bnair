import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { radius, type, useTheme } from '../lib/theme';
import type { ClothingItem } from '../lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const canBlur = Platform.OS === 'ios' || Platform.OS === 'web';

/* ───────────────────────── Backdrop ───────────────────────── */

function Blob({ color, size, x, y, delay }: { color: string; size: number; x: number; y: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 9000 + delay, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * 40 - 20 }, { translateY: t.value * -50 + 25 }, { scale: 1 + t.value * 0.12 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: canBlur ? 0.75 : 0.28,
        },
        style,
      ]}
    />
  );
}

/** Soft, slowly drifting mesh-gradient background used behind every screen. */
export function Backdrop() {
  const t = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={t.backdrop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Blob color={t.blobs[0]} size={340} x={-120} y={-80} delay={0} />
      <Blob color={t.blobs[1]} size={300} x={180} y={260} delay={1500} />
      <Blob color={t.blobs[2]} size={360} x={-60} y={560} delay={3000} />
      {canBlur && <BlurView intensity={80} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
    </View>
  );
}

/* ───────────────────────── Glass ───────────────────────── */

/** Glass inside glass uses a tinted fill instead of a second blur, like iOS vibrancy. */
const InsideGlass = createContext(false);

export function Glass({
  children,
  style,
  radius: r = radius.lg,
  intensity = 50,
  opaque,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  opaque?: boolean;
}) {
  const t = useTheme();
  const nested = useContext(InsideGlass);
  const blur = canBlur && !nested && !opaque;
  const fill = opaque ? t.card : nested ? t.fill : canBlur ? t.glassFill : t.glassFillSolid;
  return (
    <View
      style={[
        {
          borderRadius: r,
          overflow: 'hidden',
          zIndex: 0,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: nested ? 'transparent' : t.hairline,
          backgroundColor: fill,
        },
        style,
      ]}
    >
      {blur && <BlurView intensity={intensity} tint={t.blurTint} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />}
      <InsideGlass.Provider value>{children}</InsideGlass.Provider>
    </View>
  );
}

/* ───────────────────────── Pressables ───────────────────────── */

export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  onPress,
  hapticOnPress = true,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; hapticOnPress?: boolean }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 18, stiffness: 400 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 300 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) haptic.tap();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, anim, rest.disabled && { opacity: 0.4 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  size = 'lg',
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'glass' | 'danger';
  disabled?: boolean;
  size?: 'md' | 'lg';
}) {
  const t = useTheme();
  const h = size === 'lg' ? 54 : 44;
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.text;
  const content = (
    <View style={[styles.btnInner, { height: h }]}>
      {icon && <Ionicons name={icon} size={size === 'lg' ? 20 : 17} color={fg} />}
      <Text style={[type.headline, { color: fg }]}>{title}</Text>
    </View>
  );
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[t.accent, t.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btnShape, { shadowColor: t.accent }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <Glass radius={999}>{content}</Glass>
      )}
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  tint,
  variant = 'glass',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  tint?: string;
  variant?: 'glass' | 'primary';
}) {
  const t = useTheme();
  const inner = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.46} color={variant === 'primary' ? t.onAccent : (tint ?? t.text)} />
    </View>
  );
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.9}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[t.accent, t.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: size / 2, shadowColor: t.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <Glass radius={size / 2}>{inner}</Glass>
      )}
    </PressableScale>
  );
}

export function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const fg = selected ? (t.dark ? '#000' : '#fff') : t.text;
  const inner = (
    <View style={styles.chip}>
      {icon && <Ionicons name={icon} size={15} color={fg} />}
      <Text style={[type.callout, { color: fg }]}>{label}</Text>
    </View>
  );
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {selected ? <View style={{ borderRadius: 999, backgroundColor: t.text }}>{inner}</View> : <Glass radius={999}>{inner}</Glass>}
    </PressableScale>
  );
}

/* ───────────────────────── Typography / layout ───────────────────────── */

export function LargeTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && <Text style={[type.eyebrow, { color: t.accent }]}>{eyebrow}</Text>}
        <Text style={[type.largeTitle, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[type.eyebrow, { color: t.secondary }]}>{children}</Text>
      {right}
    </View>
  );
}

/** Floating back / action buttons for pushed screens. */
export function FloatingHeader({ title, right, close }: { title?: string; right?: ReactNode; close?: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  return (
    <View style={[styles.floatHeader, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={[t.backdrop[0], t.dark ? 'rgba(11,10,20,0)' : 'rgba(255,233,225,0)']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 76 }}
      />
      <IconButton icon={close ? 'close' : 'chevron-back'} label={close ? 'Close' : 'Back'} onPress={() => router.back()} />
      {title ? (
        <Glass radius={999} style={{ paddingHorizontal: 16, height: 36, justifyContent: 'center' }}>
          <Text style={[type.headline, { color: t.text }]}>{title}</Text>
        </Glass>
      ) : (
        <View />
      )}
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Glass style={styles.empty}>
      <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color="#fff" />
      </LinearGradient>
      <Text style={[type.title, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.callout, { color: t.secondary, textAlign: 'center', lineHeight: 21 }]}>{body}</Text>
      {action && <View style={{ alignSelf: 'stretch', marginTop: 8 }}>{action}</View>}
    </Glass>
  );
}

/* ───────────────────────── Item tiles ───────────────────────── */

export function ItemTile({
  item,
  size,
  selected,
  onPress,
  showLabel = true,
}: {
  item: ClothingItem;
  size: number;
  selected?: boolean;
  onPress?: () => void;
  showLabel?: boolean;
}) {
  const t = useTheme();
  return (
    <PressableScale onPress={onPress} style={{ width: size }} accessibilityLabel={item.name || item.category}>
      <View
        style={[
          styles.tile,
          { width: size, height: size, shadowColor: t.shadow },
          selected && { borderColor: t.accent, borderWidth: 3 },
        ]}
      >
        <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {selected && (
          <LinearGradient colors={[t.accent, t.accent2]} style={styles.check}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </LinearGradient>
        )}
      </View>
      {showLabel && !!item.name && (
        <Text numberOfLines={1} style={[type.footnote, { color: t.secondary, marginTop: 6 }]}>
          {item.name}
        </Text>
      )}
    </PressableScale>
  );
}

/* ───────────────────────── Destructive confirm ───────────────────────── */

export function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

const styles = StyleSheet.create({
  btnShape: {
    borderRadius: 999,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, height: 36 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 12 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 10,
  },
  floatHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  empty: { marginHorizontal: 20, padding: 28, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.15)',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
