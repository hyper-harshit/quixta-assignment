import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetServer } from '../../src/api/fakeServer';
import { seedSession } from '../../src/storage/tokens';
import { resetStore } from '../../src/store';
import type { Entry } from '../../src/types';

/**
 * Puts everything back to a fresh install that has just signed in: the server
 * holds only srv_1, device storage is empty apart from the two tokens.
 */
export async function resetAll(): Promise<void> {
  resetServer();
  await AsyncStorage.clear();
  jest.requireMock<{ __reset: () => void }>('expo-secure-store').__reset();
  resetStore();
  await seedSession();
}

/** A draft made on the device that the server has not seen. */
export const LOCAL_DRAFT: Entry = {
  id: 'srv_2',
  category: 'repair',
  date: '2026-06-02',
  durationMinutes: 90,
  note: 'Replaced valve',
  status: 'draft',
};
