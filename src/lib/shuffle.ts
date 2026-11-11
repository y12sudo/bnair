import type { Category, ClothingItem } from './types';
import type { Weather } from './weather';
import { isRainy } from './weather';

function pick<T>(list: T[]): T | undefined {
  return list.length ? list[Math.floor(Math.random() * list.length)] : undefined;
}

/**
 * Builds a random outfit: a dress or a top + bottom, plus shoes, an optional
 * layer and up to two accessories. With weather, cold days always get a layer
 * and hot days skip it.
 */
export function shuffleOutfit(items: ClothingItem[], weather?: Weather): string[] {
  const by = (c: Category) => items.filter((i) => i.category === c);
  const tops = by('tops');
  const bottoms = by('bottoms');
  const dresses = by('dresses');
  const chosen: (ClothingItem | undefined)[] = [];

  const canSeparates = tops.length > 0 && bottoms.length > 0;
  const dressOdds = weather && weather.high < 12 ? 0.15 : 0.35;
  const useDress = dresses.length > 0 && (!canSeparates || Math.random() < dressOdds);

  if (useDress) chosen.push(pick(dresses));
  else chosen.push(pick(tops), pick(bottoms));

  chosen.push(pick(by('shoes')));

  let layerOdds = 0.45;
  if (weather) {
    if (weather.high <= 16 || isRainy(weather)) layerOdds = 1;
    else if (weather.high >= 26) layerOdds = 0;
  }
  if (Math.random() < layerOdds) chosen.push(pick(by('outerwear')));

  const accessories = [...by('accessories')].sort(() => Math.random() - 0.5);
  chosen.push(...accessories.slice(0, Math.min(accessories.length, Math.floor(Math.random() * 3))));

  return chosen.filter((i): i is ClothingItem => !!i).map((i) => i.id);
}

/** Several distinct suggestions for the swipe deck. */
export function shuffleMany(items: ClothingItem[], count: number, weather?: Weather): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const ids = shuffleOutfit(items, weather);
    const key = [...ids].sort().join('|');
    if (!ids.length || (seen.has(key) && tries < count * 6)) continue;
    seen.add(key);
    out.push(ids);
  }
  return out;
}
