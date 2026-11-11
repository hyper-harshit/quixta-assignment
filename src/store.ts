/**
 * What the screens read. It mirrors device storage (the cached server entries
 * and the queue) in memory and adds the transient things only the UI cares
 * about: whether a sync is running, the last result, and per-row notices.
 */
import { useMemo, useSyncExternalStore } from 'react';

import { MSG } from './messages';
import { readEntriesCache } from './storage/entriesCache';
import { enqueue, readQueue } from './storage/queue';
import { sync } from './sync';
import type { Entry, OpKind, QueuedOp, SyncResult } from './types';

export interface StoreState {
  /** True once the cache and queue have been read from device storage. */
  hydrated: boolean;
  /** True once a sync has finished, whatever its result. */
  syncedOnce: boolean;
  serverEntries: Entry[];
  queue: QueuedOp[];
  /** Entry id to a notice that outlives the sync that produced it. */
  notices: Record<string, string>;
  syncing: boolean;
  lastSync: SyncResult | null;
}

export interface Row {
  entry: Entry;
  /** A change for this entry is still in the queue. */
  pending: boolean;
  notice: string | null;
}

const initialState: StoreState = {
  hydrated: false,
  syncedOnce: false,
  serverEntries: [],
  queue: [],
  notices: {},
  syncing: false,
  lastSync: null,
};

let state = initialState;
let syncsInFlight = 0;
const listeners = new Set<() => void>();

function setState(patch: Partial<StoreState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): StoreState {
  return state;
}

/** For tests: forget everything held in memory. */
export function resetStore(): void {
  syncsInFlight = 0;
  setState(initialState);
}

/** Loads the cache and the queue from device storage. */
export async function hydrate(): Promise<void> {
  const [serverEntries, queue] = await Promise.all([readEntriesCache(), readQueue()]);
  setState({ serverEntries, queue, hydrated: true });
}

/** Puts a change in the queue. Call runSync afterwards to try to send it. */
export async function queueChange(kind: OpKind, entry: Entry): Promise<void> {
  await enqueue(kind, entry);
  const notices = { ...state.notices };
  delete notices[entry.id];
  setState({ queue: await readQueue(), notices });
}

/** Runs a sync and brings the in-memory state up to date with the result. */
export async function runSync(): Promise<SyncResult> {
  syncsInFlight += 1;
  setState({ syncing: true });
  try {
    const result = await sync();
    const notices = { ...state.notices };
    for (const outcome of result.outcomes) {
      if (outcome.result === 'server_copy_kept') notices[outcome.entryId] = MSG.serverCopyKept;
    }
    setState({ lastSync: result, notices });
    return result;
  } finally {
    syncsInFlight = Math.max(0, syncsInFlight - 1);
    const [serverEntries, queue] = await Promise.all([readEntriesCache(), readQueue()]);
    setState({ serverEntries, queue, hydrated: true, syncedOnce: true, syncing: syncsInFlight > 0 });
  }
}

/**
 * The list the user sees: the server's entries with queued changes applied on
 * top. A row with a queued change shows the local version and "Waiting to sync".
 */
export function selectRows(current: StoreState): Row[] {
  const rows = new Map<string, Row>();
  for (const entry of current.serverEntries) {
    rows.set(entry.id, { entry, pending: false, notice: current.notices[entry.id] ?? null });
  }
  for (const op of current.queue) {
    rows.set(op.entry.id, { entry: op.entry, pending: true, notice: MSG.waitingToSync });
  }
  return [...rows.values()];
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useRows(): Row[] {
  const current = useStore();
  return useMemo(() => selectRows(current), [current]);
}

export type EntryLookup =
  | { status: 'loading'; row: null }
  | { status: 'missing'; row: null }
  | { status: 'found'; row: Row };

/**
 * Finds one entry by id. It reports "missing" only after the first sync has
 * finished, so a deep link that starts the app waits for data before it gives up.
 */
export function useEntry(id: string): EntryLookup {
  const current = useStore();
  const rows = useRows();
  const row = rows.find((item) => item.entry.id === id);
  if (row) return { status: 'found', row };
  if (!current.hydrated || !current.syncedOnce) return { status: 'loading', row: null };
  return { status: 'missing', row: null };
}
