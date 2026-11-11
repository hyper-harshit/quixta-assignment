import type { OpKind, SyncResult } from './types';

/** User-facing strings. The first seven are quoted from the brief and must not change. */
export const MSG = {
  useSteps: 'Use 15-minute steps',
  durationRange: 'Duration must be between 15 minutes and 12 hours',
  duplicate: 'You already have this category on this date',
  waitingToSync: 'Waiting to sync',
  serverCopyKept: 'Server copy kept',
  sessionExpired: 'Session expired',
  entryNotFound: 'Entry not found',

  chooseCategory: 'Choose a category',
  dateFormat: 'Use the format YYYY-MM-DD',
  draftSaved: 'Draft saved',
  submitted: 'Submitted',
  syncFailed: 'Saved on this device. Sync did not finish; try Sync again.',
} as const;

/**
 * One line telling the user what happened to the change they just saved.
 *
 * Every sync result lists each change still in the queue as "waiting". So a
 * change with no outcome at all is no longer queued: a sync that was already
 * running when it was saved picked it up and sent it.
 */
export function describeOutcome(result: SyncResult, entryId: string, kind: OpKind): string {
  const outcome = [...result.outcomes].reverse().find((item) => item.entryId === entryId);
  if (outcome?.result === 'server_copy_kept') return MSG.serverCopyKept;
  if (outcome?.result === 'waiting') {
    return result.status === 'session_expired' ? MSG.sessionExpired : MSG.waitingToSync;
  }
  return kind === 'submit' ? MSG.submitted : MSG.draftSaved;
}
