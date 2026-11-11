export const CATEGORIES = ['inspection', 'repair', 'travel'] as const;

export type Category = (typeof CATEGORIES)[number];

export type EntryStatus = 'draft' | 'submitted';

export interface Entry {
  id: string;
  category: Category;
  /** YYYY-MM-DD */
  date: string;
  /** Whole minutes, 15 to 720, in steps of 15. */
  durationMinutes: number;
  note: string;
  status: EntryStatus;
}

/** What the form holds while the user types. Duration stays as typed text. */
export interface FormValues {
  category: Category | '';
  date: string;
  duration: string;
  note: string;
}

export const EMPTY_FORM: FormValues = { category: '', date: '', duration: '', note: '' };

export type OpKind = 'saveDraft' | 'submit';

/** One change waiting on the device for the server. */
export interface QueuedOp {
  opId: string;
  kind: OpKind;
  /** The full entry as it should be on the server once this change is applied. */
  entry: Entry;
}

export type SyncStatus = 'synced' | 'offline' | 'session_expired';

export type OutcomeResult = 'applied' | 'server_copy_kept' | 'waiting';

export interface SyncOutcome {
  entryId: string;
  kind: OpKind;
  result: OutcomeResult;
  message: string | null;
}

export interface SyncResult {
  status: SyncStatus;
  /** The one line worth showing for the whole run, or null when there is nothing to say. */
  message: string | null;
  outcomes: SyncOutcome[];
}
