/**
 * The sync engine. It pushes queued changes to the server oldest first, then
 * pulls the server's list into the device cache.
 *
 * It knows nothing about screens or about how the network is detected. It
 * only sees calls succeed, conflict, or fail.
 */
import { NetworkError, SessionExpiredError, listEntries, saveDraft, submitEntry } from './api/client';
import { MSG } from './messages';
import { upsertCachedEntry, writeEntriesCache } from './storage/entriesCache';
import { readQueue, removeOp } from './storage/queue';
import type { SyncOutcome, SyncResult, SyncStatus } from './types';

let running: Promise<SyncResult> | null = null;
let followUp: Promise<SyncResult> | null = null;

/**
 * Runs a sync. Only one runs at a time. A call made while one is running
 * waits for it and then runs once more, so a change queued mid-run is never
 * left behind; every caller that arrives during the wait shares that run.
 */
export function sync(): Promise<SyncResult> {
  if (!running) {
    running = runOnce().finally(() => {
      running = null;
    });
    return running;
  }
  if (!followUp) {
    followUp = running
      .catch(() => undefined)
      .then(() => {
        followUp = null;
        return sync();
      });
  }
  return followUp;
}

async function runOnce(): Promise<SyncResult> {
  const outcomes: SyncOutcome[] = [];
  let status: SyncStatus = 'synced';

  try {
    // Push. The head of the queue is read fresh each time round, so changes
    // queued while this loop runs are picked up too.
    for (;;) {
      const [op] = await readQueue();
      if (!op) break;

      const result = op.kind === 'submit' ? await submitEntry(op.entry) : await saveDraft(op.entry);

      // The conflict rule, device side. Whether the server took the change or
      // refused it because the row is already submitted, the server's copy is
      // now the truth for this id and the queued change is finished with.
      await upsertCachedEntry(result.entry);
      await removeOp(op.opId);

      outcomes.push({
        entryId: op.entry.id,
        kind: op.kind,
        result: result.conflict ? 'server_copy_kept' : 'applied',
        message: result.conflict ? MSG.serverCopyKept : null,
      });
    }

    // Pull.
    await writeEntriesCache(await listEntries());
  } catch (error) {
    // Both of these stop the run and leave the rest of the queue untouched.
    if (error instanceof NetworkError) status = 'offline';
    else if (error instanceof SessionExpiredError) status = 'session_expired';
    else throw error;
  }

  for (const op of await readQueue()) {
    outcomes.push({
      entryId: op.entry.id,
      kind: op.kind,
      result: 'waiting',
      message: MSG.waitingToSync,
    });
  }

  return { status, message: headline(status, outcomes), outcomes };
}

function headline(status: SyncStatus, outcomes: SyncOutcome[]): string | null {
  if (status === 'session_expired') return MSG.sessionExpired;
  if (outcomes.some((outcome) => outcome.result === 'server_copy_kept')) return MSG.serverCopyKept;
  if (outcomes.some((outcome) => outcome.result === 'waiting')) return MSG.waitingToSync;
  return null;
}
