import { getServerEntries } from '../src/api/fakeServer';
import { readEntriesCache } from '../src/storage/entriesCache';
import { enqueue, readQueue } from '../src/storage/queue';
import { getState, queueChange, runSync, selectRows } from '../src/store';
import { sync } from '../src/sync';
import { resetAll } from './support/resetAll';

beforeEach(resetAll);

function serverRow(id: string) {
  return getServerEntries().find((entry) => entry.id === id);
}

describe('a queued edit for a row the server already has as submitted', () => {
  test('is dropped: the server note stays "Lobby" and the result says "Server copy kept"', async () => {
    const seed = serverRow('srv_1');
    expect(seed).toMatchObject({ status: 'submitted', note: 'Lobby' });

    await enqueue('saveDraft', { ...seed!, note: 'Changed on the device' });

    const result = await sync();

    expect(serverRow('srv_1')).toEqual(seed);
    expect(serverRow('srv_1')?.note).toBe('Lobby');

    expect(result.status).toBe('synced');
    expect(result.message).toBe('Server copy kept');
    expect(result.outcomes).toEqual([
      { entryId: 'srv_1', kind: 'saveDraft', result: 'server_copy_kept', message: 'Server copy kept' },
    ]);

    // The edit is gone from the queue and the device holds the server's copy.
    expect(await readQueue()).toEqual([]);
    expect(await readEntriesCache()).toEqual([seed]);
  });

  test('is dropped when the queued change is a submit, too', async () => {
    const seed = serverRow('srv_1');
    await enqueue('submit', { ...seed!, note: 'Changed on the device', durationMinutes: 120 });

    const result = await sync();

    expect(serverRow('srv_1')).toEqual(seed);
    expect(result.message).toBe('Server copy kept');
    expect(await readQueue()).toEqual([]);
  });

  test('leaves the list row showing the server copy with "Server copy kept"', async () => {
    const seed = serverRow('srv_1');
    await queueChange('saveDraft', { ...seed!, note: 'Changed on the device' });

    // While the edit is queued the row shows the local version.
    expect(selectRows(getState())).toEqual([
      {
        entry: { ...seed!, note: 'Changed on the device', status: 'draft' },
        pending: true,
        notice: 'Waiting to sync',
      },
    ]);

    await runSync();

    expect(selectRows(getState())).toEqual([
      { entry: seed, pending: false, notice: 'Server copy kept' },
    ]);
  });
});
