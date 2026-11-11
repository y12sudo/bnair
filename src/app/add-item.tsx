import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '../components/CategoryPicker';
import { Backdrop, Button, Glass, IconButton, SectionLabel } from '../components/ui';
import { haptic } from '../lib/haptics';
import { useStore } from '../lib/store';
import { radius, type, useTheme } from '../lib/theme';
import type { Category } from '../lib/types';

const PICKER: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75 };

function Corner({ style, color }: { style: object; color: string }) {
  return <View style={[styles.corner, { borderColor: color }, style]} />;
}

export default function AddItemScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: Category }>();
  const { addItem } = useStore();
  const [uri, setUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>(params.category ?? 'tops');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera access needed', 'Turn on camera access in Settings to photograph your clothes.');
        return;
      }
    }
    const res = await ImagePicker.launchCameraAsync(PICKER);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };
  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync(PICKER);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };
  const save = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      await addItem({ tempUri: uri, category, name });
      haptic.success();
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Could not save photo', String(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton icon="close" label="Cancel" onPress={() => router.back()} />
          <Text style={[type.headline, { color: t.text }]}>New piece</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.finderWrap}>
          <Glass radius={radius.xl} style={styles.finder}>
            {uri ? (
              <Animated.View entering={ZoomIn.springify().damping(14)} style={StyleSheet.absoluteFill}>
                <Image source={{ uri }} style={{ flex: 1 }} />
              </Animated.View>
            ) : (
              <Pressable onPress={takePhoto} style={styles.finderEmpty} accessibilityLabel="Take photo">
                <Ionicons name="shirt-outline" size={56} color={t.tertiary} />
                <Text style={[type.callout, { color: t.secondary, textAlign: 'center' }]}>
                  Lay it flat on a plain surface,{'\n'}in soft daylight
                </Text>
              </Pressable>
            )}
            <Corner color={uri ? '#fff' : t.accent} style={{ top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 14 }} />
            <Corner color={uri ? '#fff' : t.accent} style={{ top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 14 }} />
            <Corner color={uri ? '#fff' : t.accent} style={{ bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 14 }} />
            <Corner color={uri ? '#fff' : t.accent} style={{ bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 14 }} />
          </Glass>
        </View>

        <View style={styles.shutterRow}>
          <IconButton icon="images" label="Choose from library" size={52} onPress={choosePhoto} />
          <Pressable onPress={takePhoto} accessibilityRole="button" accessibilityLabel={uri ? 'Retake photo' : 'Take photo'} style={[styles.shutterRing, { borderColor: t.text }]}>
            {({ pressed }) => <View style={[styles.shutter, { backgroundColor: t.text, transform: [{ scale: pressed ? 0.88 : 1 }] }]} />}
          </Pressable>
          <View style={{ width: 52 }} />
        </View>

        <SectionLabel>Category</SectionLabel>
        <CategoryPicker value={category} onChange={setCategory} />

        <SectionLabel>Name</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Glass radius={radius.md}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cream cable-knit sweater"
              placeholderTextColor={t.tertiary}
              style={[type.body, styles.input, { color: t.text }]}
              returnKeyType="done"
            />
          </Glass>
        </View>

        <View style={{ padding: 20, paddingTop: 28 }}>
          <Button title={saving ? 'Saving…' : 'Add to closet'} icon="checkmark" onPress={save} disabled={!uri || saving} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  finderWrap: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 18 },
  finder: { width: '100%', maxWidth: 420, aspectRatio: 1 },
  finderEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  corner: { position: 'absolute', width: 34, height: 34, borderWidth: 3.5 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 20 },
  shutterRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 62, height: 62, borderRadius: 31 },
  input: { paddingHorizontal: 16, height: 52 },
});
