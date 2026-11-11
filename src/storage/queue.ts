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
 * Adds a change to the end of the queue. The stored entry carries the status
 * the change is asking for: draft for saveDraft, submitted for submit.
 */
export function enqueue(kind: OpKind, entry: Entry): Promise<QueuedOp> {
  return inOrder(async () => {
    const op: QueuedOp = {
      opId: newId('op'),
      kind,
      entry: { ...entry, status: kind === 'submit' ? 'submitted' : 'draft' },
    };
    await write([...(await read()), op]);
    return op;
  });
}

export function removeOp(opId: string): Promise<void> {
  return inOrder(async () => {
    const queue = await read();
    await write(queue.filter((op) => op.opId !== opId));
  });
}
