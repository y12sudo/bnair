export const CATEGORIES = [
  { key: 'tops', label: 'Tops', icon: 'shirt-outline' },
  { key: 'bottoms', label: 'Bottoms', icon: 'reorder-two-outline' },
  { key: 'dresses', label: 'Dresses', icon: 'woman-outline' },
  { key: 'outerwear', label: 'Outerwear', icon: 'snow-outline' },
  { key: 'shoes', label: 'Shoes', icon: 'footsteps-outline' },
  { key: 'accessories', label: 'Accessories', icon: 'watch-outline' },
] as const;

export type Category = (typeof CATEGORIES)[number]['key'];

export function categoryLabel(key: Category): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export interface ClothingItem {
  id: string;
  imageUri: string;
  category: Category;
  name: string;
  createdAt: number;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
}

/** Calendar entries keyed by local date, e.g. "2026-11-11". */
export type CalendarMap = Record<string, string>;

export interface ClosetData {
  items: ClothingItem[];
  outfits: Outfit[];
  calendar: CalendarMap;
}
