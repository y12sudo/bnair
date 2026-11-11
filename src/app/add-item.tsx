import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, SectionTitle } from '../components/ui';
import { useStore } from '../lib/store';
import { colors, radius } from '../lib/theme';
import { CATEGORIES, type Category } from '../lib/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export default function AddItemScreen() {
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
        Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph your clothes.');
        return;
      }
    }
    const res = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };

  const save = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      await addItem({ tempUri: uri, category, name });
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Could not save photo', String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.photoWrap}>
        {uri ? (
          <Pressable onPress={takePhoto}>
            <Image source={{ uri }} style={styles.photo} />
          </Pressable>
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Ionicons name="camera-outline" size={56} color={colors.muted} />
            <Text style={styles.muted}>Lay the item flat in good light</Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title={uri ? 'Retake' : 'Take photo'} icon="camera" onPress={takePhoto} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="From library" icon="images-outline" variant="secondary" onPress={choosePhoto} />
        </View>
      </View>

      <SectionTitle>Category</SectionTitle>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </View>

      <SectionTitle>Name (optional)</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. White linen shirt"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="done"
      />

      <View style={{ padding: 16 }}>
        <Button title={saving ? 'Saving…' : 'Save to closet'} icon="checkmark" onPress={save} disabled={!uri || saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: 'center', padding: 16 },
  photo: { width: 260, height: 260, borderRadius: radius, backgroundColor: colors.border },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft },
  muted: { color: colors.muted },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  input: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
});
