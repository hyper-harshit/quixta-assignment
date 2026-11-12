/** The offline queue: changes made on the device that the server has not taken yet. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { newId } from '../ids';
import type { Entry, OpKind, QueuedOp } from '../types';
import { createSerial } from './serial';

export const QUEUE_KEY = 'sync_queue';

const inOrder = createSerial();

async function read(): Promise<QueuedOp[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedOp[]): Promise<void> {
  return AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Oldest first. */
export function readQueue(): Promise<QueuedOp[]> {
  return inOrder(read);
}

/**
 * Queues a change. The stored entry carries the status the change is asking
 * for: draft for saveDraft, submitted for submit.
 *
 * The queue holds at most one change per entry. If one is already waiting for
 * this entry, the new values replace it where it stands, so the server only
 * ever receives the latest version. Without this, an entry created and then
 * edited offline would be sent twice, and if the first was a submit the edit
 * would be refused as a conflict with the device's own earlier version.
 *
 * A waiting submit stays a submit: saving more edits does not un-submit it.
 *
 * The replacement gets a new opId. If a sync is sending the old one at this
 * moment, its removeOp will not match, and the new values are sent next.
 */
export function enqueue(kind: OpKind, entry: Entry): Promise<QueuedOp> {
  return inOrder(async () => {
    const queue = await read();
    const index = queue.findIndex((queued) => queued.entry.id === entry.id);
    const waiting = index === -1 ? null : queue[index];

    const finalKind: OpKind = waiting?.kind === 'submit' ? 'submit' : kind;
    const op: QueuedOp = {
      opId: newId('op'),
      kind: finalKind,
      entry: { ...entry, status: finalKind === 'submit' ? 'submitted' : 'draft' },
    };

    if (index === -1) queue.push(op);
    else queue[index] = op;
    await write(queue);
    return op;
  });
}

export function removeOp(opId: string): Promise<void> {
  return inOrder(async () => {
    const queue = await read();
    await write(queue.filter((op) => op.opId !== opId));
  });
}
