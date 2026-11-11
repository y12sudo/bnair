import type { Category, ClothingItem } from './types';

function pick<T>(list: T[]): T | undefined {
  return list.length ? list[Math.floor(Math.random() * list.length)] : undefined;
}

/**
 * Builds a random outfit from the closet: either a dress or a top + bottom,
 * plus shoes, sometimes a layer, and up to two accessories.
 */
export function shuffleOutfit(items: ClothingItem[]): string[] {
  const by = (c: Category) => items.filter((i) => i.category === c);
  const tops = by('tops');
  const bottoms = by('bottoms');
  const dresses = by('dresses');
  const chosen: (ClothingItem | undefined)[] = [];

  const canSeparates = tops.length > 0 && bottoms.length > 0;
  const useDress = dresses.length > 0 && (!canSeparates || Math.random() < 0.35);

  if (useDress) {
    chosen.push(pick(dresses));
  } else {
    chosen.push(pick(tops), pick(bottoms));
  }
  chosen.push(pick(by('shoes')));
  if (Math.random() < 0.5) chosen.push(pick(by('outerwear')));

  const accessories = [...by('accessories')].sort(() => Math.random() - 0.5);
  const accessoryCount = Math.min(accessories.length, Math.floor(Math.random() * 3));
  chosen.push(...accessories.slice(0, accessoryCount));

  return chosen.filter((i): i is ClothingItem => !!i).map((i) => i.id);
}
