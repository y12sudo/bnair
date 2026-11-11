import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ClosetData } from './types';

const DATA_KEY = 'outfit-saver/data/v1';

export const EMPTY_DATA: ClosetData = { items: [], outfits: [], calendar: {} };

export async function loadData(): Promise<ClosetData> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as Partial<ClosetData>;
    return {
      items: parsed.items ?? [],
      outfits: parsed.outfits ?? [],
      calendar: parsed.calendar ?? {},
    };
  } catch {
    return EMPTY_DATA;
  }
}

export async function saveData(data: ClosetData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function photoDir(): Directory {
  return new Directory(Paths.document, 'closet-photos');
}

/**
 * The camera and photo picker hand back a temporary file. Copy it into the
 * app's documents folder so the photo survives cache clean-ups.
 */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return toDataUrl(tempUri);
  const dir = photoDir();
  dir.create({ intermediates: true, idempotent: true });
  const ext = tempUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(dir, `${id}.${ext}`);
  if (dest.exists) dest.delete();
  await new File(tempUri).copy(dest);
  return dest.uri;
}

/** Web previews only: blob: URLs die on reload, so inline the image. */
async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function deletePhoto(uri: string): void {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing file: nothing to clean up.
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
