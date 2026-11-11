/** The device's copy of what the server last told it. Lets the list show while offline. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Entry } from '../types';
import { createSerial } from './serial';

export const ENTRIES_CACHE_KEY = 'entries_cache';

const inOrder = createSerial();

async function read(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

export function readEntriesCache(): Promise<Entry[]> {
  return inOrder(read);
}

export function writeEntriesCache(entries: Entry[]): Promise<void> {
  return inOrder(() => AsyncStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(entries)));
}

/** Replaces the cached entry with the same id, or adds it at the end. */
export function upsertCachedEntry(entry: Entry): Promise<void> {
  return inOrder(async () => {
    const entries = await read();
    const exists = entries.some((item) => item.id === entry.id);
    const next = exists
      ? entries.map((item) => (item.id === entry.id ? entry : item))
      : [...entries, entry];
    await AsyncStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(next));
  });
}
