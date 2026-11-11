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
});
