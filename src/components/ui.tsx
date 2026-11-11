import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../lib/theme';
import type { ClothingItem } from '../lib/types';

/** Destructive confirmation that works on native and web. */
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

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  const fg = primary ? '#fff' : variant === 'danger' ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        variant === 'danger' && { borderColor: colors.danger },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function ItemThumb({
  item,
  size = 96,
  selected,
  onPress,
}: {
  item: ClothingItem;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: size }}>
      <View
        style={[
          styles.thumb,
          { width: size, height: size },
          selected && { borderColor: colors.accent, borderWidth: 3 },
        ]}
      >
        <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {selected && (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>
      {!!item.name && (
        <Text numberOfLines={1} style={styles.thumbLabel}>
          {item.name}
        </Text>
      )}
    </Pressable>
  );
}

/** A compact collage of an outfit's items. */
export function OutfitCollage({ items, height = 160 }: { items: ClothingItem[]; height?: number }) {
  if (items.length === 0) {
    return (
      <View style={[styles.collage, styles.center, { height }]}>
        <Ionicons name="shirt-outline" size={32} color={colors.muted} />
      </View>
    );
  }
  const shown = items.slice(0, 4);
  const cols = shown.length === 1 ? 1 : 2;
  const rows = shown.length <= 2 ? 1 : 2;
  return (
    <View style={[styles.collage, { height, flexDirection: 'row', flexWrap: 'wrap' }]}>
      {shown.map((item, idx) => (
        <View
          key={item.id}
          style={{
            width: `${100 / cols}%`,
            height: `${100 / rows}%`,
            padding: 1,
            ...(shown.length === 3 && idx === 2 ? { width: '100%' } : null),
          }}
        >
          <Image source={{ uri: item.imageUri }} style={{ flex: 1, borderRadius: 8 }} resizeMode="cover" />
        </View>
      ))}
      {items.length > 4 && (
        <View style={styles.more}>
          <Text style={styles.moreText}>+{items.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Fab({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius,
    borderWidth: 1.5,
  },
  btnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnSecondary: { backgroundColor: colors.card, borderColor: colors.accent },
  btnText: { fontSize: 16, fontWeight: '600' },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { color: colors.text, fontWeight: '500' },
  thumb: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbLabel: { marginTop: 4, fontSize: 12, color: colors.muted },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collage: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.accentSoft },
  center: { alignItems: 'center', justifyContent: 'center' },
  more: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moreText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
