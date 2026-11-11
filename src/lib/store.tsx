import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { deletePhoto, EMPTY_DATA, loadData, newId, persistPhoto, saveData } from './storage';
import type { Category, ClosetData, ClothingItem, Outfit } from './types';

interface Store extends ClosetData {
  ready: boolean;
  addItem(input: { tempUri: string; category: Category; name: string }): Promise<ClothingItem>;
  updateItem(id: string, patch: Partial<Pick<ClothingItem, 'category' | 'name'>>): void;
  removeItem(id: string): void;
  saveOutfit(input: { id?: string; name: string; itemIds: string[] }): Outfit;
  removeOutfit(id: string): void;
  setDay(dateKey: string, outfitId: string | null): void;
  itemById(id: string): ClothingItem | undefined;
  outfitById(id: string): Outfit | undefined;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ClosetData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveData(data).catch(() => {});
  }, [data]);

  const addItem = useCallback<Store['addItem']>(async ({ tempUri, category, name }) => {
    const id = newId();
    const imageUri = await persistPhoto(tempUri, id);
    const item: ClothingItem = { id, imageUri, category, name: name.trim(), createdAt: Date.now() };
    setData((d) => ({ ...d, items: [item, ...d.items] }));
    return item;
  }, []);

  const updateItem = useCallback<Store['updateItem']>((id, patch) => {
    setData((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const removeItem = useCallback<Store['removeItem']>((id) => {
    setData((d) => {
      const item = d.items.find((i) => i.id === id);
      if (item) deletePhoto(item.imageUri);
      return {
        ...d,
        items: d.items.filter((i) => i.id !== id),
        outfits: d.outfits.map((o) => ({ ...o, itemIds: o.itemIds.filter((x) => x !== id) })),
      };
    });
  }, []);

  const saveOutfit = useCallback<Store['saveOutfit']>(({ id, name, itemIds }) => {
    const outfit: Outfit = {
      id: id ?? newId(),
      name: name.trim() || 'Untitled outfit',
      itemIds,
      createdAt: Date.now(),
    };
    setData((d) => {
      const exists = d.outfits.some((o) => o.id === outfit.id);
      return {
        ...d,
        outfits: exists
          ? d.outfits.map((o) => (o.id === outfit.id ? { ...outfit, createdAt: o.createdAt } : o))
          : [outfit, ...d.outfits],
      };
    });
    return outfit;
  }, []);

  const removeOutfit = useCallback<Store['removeOutfit']>((id) => {
    setData((d) => {
      const calendar = { ...d.calendar };
      for (const k of Object.keys(calendar)) if (calendar[k] === id) delete calendar[k];
      return { ...d, outfits: d.outfits.filter((o) => o.id !== id), calendar };
    });
  }, []);

  const setDay = useCallback<Store['setDay']>((key, outfitId) => {
    setData((d) => {
      const calendar = { ...d.calendar };
      if (outfitId) calendar[key] = outfitId;
      else delete calendar[key];
      return { ...d, calendar };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready,
      addItem,
      updateItem,
      removeItem,
      saveOutfit,
      removeOutfit,
      setDay,
      itemById: (id) => data.items.find((i) => i.id === id),
      outfitById: (id) => data.outfits.find((o) => o.id === id),
    }),
    [data, ready, addItem, updateItem, removeItem, saveOutfit, removeOutfit, setDay],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
