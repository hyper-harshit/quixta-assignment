import { MSG } from './messages';
import { CATEGORIES, type Category, type Entry, type EntryStatus, type FormValues } from './types';

export const MIN_MINUTES = 15;
export const MAX_MINUTES = 720;
export const STEP_MINUTES = 15;

export interface FormErrors {
  category: string | null;
  date: string | null;
  duration: string | null;
}

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function validateCategory(category: string): string | null {
  return isCategory(category) ? null : MSG.chooseCategory;
}

/** Accepts only real calendar dates written as YYYY-MM-DD. */
export function validateDate(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return MSG.dateFormat;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? null : MSG.dateFormat;
}

/**
 * Range is checked before the step, so 10 and 725 report the range and 20
 * reports the step.
 */
export function validateDuration(raw: string): string | null {
  const text = raw.trim();
  const minutes = /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
  if (Number.isNaN(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
    return MSG.durationRange;
  }
  if (!Number.isInteger(minutes) || minutes % STEP_MINUTES !== 0) return MSG.useSteps;
  return null;
}

export function validateForm(values: FormValues): FormErrors {
  return {
    category: validateCategory(values.category),
    date: validateDate(values.date),
    duration: validateDuration(values.duration),
  };
}

export function isValid(errors: FormErrors): boolean {
  return !errors.category && !errors.date && !errors.duration;
}

/**
 * True when another entry already has this category on this date. Pass
 * `exceptId` when editing, so an entry is not compared with itself.
 */
export function hasDuplicate(
  entries: Entry[],
  category: string,
  date: string,
  exceptId?: string,
): boolean {
  const day = date.trim();
  return entries.some(
    (entry) => entry.id !== exceptId && entry.category === category && entry.date === day,
  );
}

/** Only call with values that passed validateForm. */
export function formToEntry(values: FormValues, id: string, status: EntryStatus): Entry {
  return {
    id,
    category: values.category as Category,
    date: values.date.trim(),
    durationMinutes: Number(values.duration.trim()),
    note: values.note.trim(),
    status,
  };
}

export function entryToForm(entry: Entry): FormValues {
  return {
    category: entry.category,
    date: entry.date,
    duration: String(entry.durationMinutes),
    note: entry.note,
  };
}
