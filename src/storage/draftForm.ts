/** The in-progress new-entry form, kept so it survives leaving the screen or the app. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FormValues } from '../types';
import { isCategory } from '../validation';
import { createSerial } from './serial';

export const DRAFT_FORM_KEY = 'draft_form';

// Writes happen on every keystroke. Running them in order guarantees the last
// keystroke is the one that ends up stored, and that a clear is not undone by
// an earlier write still in flight.
const inOrder = createSerial();

export function saveDraftForm(values: FormValues): Promise<void> {
  return inOrder(() => AsyncStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(values)));
}

export function clearDraftForm(): Promise<void> {
  return inOrder(() => AsyncStorage.removeItem(DRAFT_FORM_KEY));
}

export function loadDraftForm(): Promise<FormValues | null> {
  return inOrder(async () => {
    const raw = await AsyncStorage.getItem(DRAFT_FORM_KEY);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw) as Partial<Record<keyof FormValues, unknown>>;
      return {
        category: isCategory(saved.category) ? saved.category : '',
        date: typeof saved.date === 'string' ? saved.date : '',
        duration: typeof saved.duration === 'string' ? saved.duration : '',
        note: typeof saved.note === 'string' ? saved.note : '',
      };
    } catch {
      return null;
    }
  });
}
