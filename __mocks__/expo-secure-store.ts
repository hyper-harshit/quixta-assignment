/**
 * In-memory stand-in for expo-secure-store, used by every test (switched on in
 * jest.setup.ts). Only the three calls the app makes are provided.
 */
const items = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return items.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  items.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  items.delete(key);
}

/** Test-only: empties the store. */
export function __reset(): void {
  items.clear();
}
