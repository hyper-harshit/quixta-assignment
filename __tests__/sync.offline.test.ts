import { getServerEntries, setOnline } from '../src/api/fakeServer';
import { readQueue } from '../src/storage/queue';
import { getState, queueChange, runSync, selectRows } from '../src/store';
import { LOCAL_DRAFT, resetAll } from './support/resetAll';

beforeEach(resetAll);

describe('offline', () => {
  test('a queued change stays queued, its row says "Waiting to sync", and it is sent once online', async () => {
    setOnline(false);
    await queueChange('saveDraft', LOCAL_DRAFT);

    const offline = await runSync();

    expect(offline.status).toBe('offline');
    expect(offline.message).toBe('Waiting to sync');
    expect((await readQueue()).map((op) => op.entry)).toEqual([LOCAL_DRAFT]);
    expect(getServerEntries().map((entry) => entry.id)).toEqual(['srv_1']);
    expect(selectRows(getState())).toContainEqual({
      entry: LOCAL_DRAFT,
      pending: true,
      notice: 'Waiting to sync',
    });

    setOnline(true);
    const online = await runSync();

    expect(online.status).toBe('synced');
    expect(await readQueue()).toEqual([]);
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);
    expect(selectRows(getState())).toContainEqual({
      entry: LOCAL_DRAFT,
      pending: false,
      notice: null,
    });
  });

  test('a queued submit marks the server row submitted once online', async () => {
    await queueChange('saveDraft', LOCAL_DRAFT);
    await runSync();
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);

    setOnline(false);
    await queueChange('submit', LOCAL_DRAFT);
    expect((await runSync()).status).toBe('offline');
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);

    setOnline(true);
    await runSync();
    expect(getServerEntries()).toContainEqual({ ...LOCAL_DRAFT, status: 'submitted' });
  });

  test('an entry created and then edited offline is sent once, with the final edit', async () => {
    setOnline(false);
    await queueChange('saveDraft', LOCAL_DRAFT);
    await queueChange('saveDraft', { ...LOCAL_DRAFT, note: 'Edited offline' });

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: 'saveDraft', entry: { ...LOCAL_DRAFT, note: 'Edited offline' } });

    setOnline(true);
    const result = await runSync();

    expect(result.message).toBeNull();
    expect(result.outcomes).toEqual([
      { entryId: LOCAL_DRAFT.id, kind: 'saveDraft', result: 'applied', message: null },
    ]);
    expect(getServerEntries()).toContainEqual({ ...LOCAL_DRAFT, note: 'Edited offline' });
  });

  test('an entry submitted and then edited offline keeps the edit and stays submitted', async () => {
    setOnline(false);
    await queueChange('submit', LOCAL_DRAFT);
    await queueChange('saveDraft', { ...LOCAL_DRAFT, note: 'Edited offline' });

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.kind).toBe('submit');

    setOnline(true);
    const result = await runSync();

    // Not "Server copy kept": the server had no copy of its own to keep.
    expect(result.message).toBeNull();
    expect(getServerEntries()).toContainEqual({
      ...LOCAL_DRAFT,
      note: 'Edited offline',
      status: 'submitted',
    });
    expect(selectRows(getState())).toContainEqual({
      entry: { ...LOCAL_DRAFT, note: 'Edited offline', status: 'submitted' },
      pending: false,
      notice: null,
    });
  });

  test('several offline edits to a draft the server already has: only the last one is sent, and it wins', async () => {
    await queueChange('saveDraft', LOCAL_DRAFT);
    await runSync();
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);

    setOnline(false);
    await queueChange('saveDraft', { ...LOCAL_DRAFT, note: 'First edit' });
    await queueChange('saveDraft', { ...LOCAL_DRAFT, note: 'Second edit', durationMinutes: 120 });
    await queueChange('saveDraft', { ...LOCAL_DRAFT, note: 'Third edit', durationMinutes: 150 });

    const final = { ...LOCAL_DRAFT, note: 'Third edit', durationMinutes: 150 };
    expect((await readQueue()).map((op) => op.entry)).toEqual([final]);
    // Offline, the list shows the latest edit and the server still has the old row.
    expect(selectRows(getState())).toContainEqual({ entry: final, pending: true, notice: 'Waiting to sync' });
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);

    setOnline(true);
    const result = await runSync();

    expect(result.status).toBe('synced');
    expect(result.message).toBeNull();
    expect(result.outcomes).toEqual([
      { entryId: LOCAL_DRAFT.id, kind: 'saveDraft', result: 'applied', message: null },
    ]);
    expect(getServerEntries()).toContainEqual(final);
    expect(getServerEntries()).toHaveLength(2);
    expect(selectRows(getState())).toContainEqual({ entry: final, pending: false, notice: null });
  });

  test('several offline edits to a submitted server row: all are dropped, with one "Server copy kept"', async () => {
    const seed = getServerEntries().find((entry) => entry.id === 'srv_1')!;
    await runSync();

    setOnline(false);
    await queueChange('saveDraft', { ...seed, note: 'First edit' });
    await queueChange('saveDraft', { ...seed, note: 'Second edit' });
    await queueChange('submit', { ...seed, note: 'Third edit', durationMinutes: 120 });

    expect(await readQueue()).toHaveLength(1);

    setOnline(true);
    const result = await runSync();

    expect(result.message).toBe('Server copy kept');
    expect(result.outcomes).toEqual([
      { entryId: 'srv_1', kind: 'submit', result: 'server_copy_kept', message: 'Server copy kept' },
    ]);
    expect(getServerEntries()).toEqual([seed]);
    expect(await readQueue()).toEqual([]);
    expect(selectRows(getState())).toEqual([{ entry: seed, pending: false, notice: 'Server copy kept' }]);
  });
});
