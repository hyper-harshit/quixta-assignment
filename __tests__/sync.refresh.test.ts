import {
  expireAccessToken,
  failRetryAfterRefresh,
  getRefreshCount,
  getServerEntries,
} from '../src/api/fakeServer';
import { enqueue, readQueue } from '../src/storage/queue';
import { secureSet } from '../src/storage/secure';
import { REFRESH_TOKEN_KEY, getAccessToken } from '../src/storage/tokens';
import { sync } from '../src/sync';
import { LOCAL_DRAFT, resetAll } from './support/resetAll';

beforeEach(resetAll);

describe('when the access token has expired', () => {
  test('refresh runs once and the retried call succeeds with access_2', async () => {
    await enqueue('saveDraft', LOCAL_DRAFT);
    expireAccessToken();

    const result = await sync();

    expect(getRefreshCount()).toBe(1);
    expect(await getAccessToken()).toBe('access_2');

    // The server accepts nothing but access_2 after a refresh, so the draft
    // arriving proves the retry was made, and made with the new token. The
    // list call that follows reuses access_2 without refreshing again.
    expect(result.status).toBe('synced');
    expect(result.message).toBeNull();
    expect(result.outcomes).toEqual([
      { entryId: LOCAL_DRAFT.id, kind: 'saveDraft', result: 'applied', message: null },
    ]);
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);
    expect(await readQueue()).toEqual([]);
  });

  test('a retry that is also rejected gives "Session expired" without a second refresh', async () => {
    await enqueue('saveDraft', LOCAL_DRAFT);
    expireAccessToken();
    failRetryAfterRefresh();

    const result = await sync();

    expect(getRefreshCount()).toBe(1);
    expect(result.status).toBe('session_expired');
    expect(result.message).toBe('Session expired');

    // Nothing reached the server and nothing was dropped.
    expect(getServerEntries().map((entry) => entry.id)).toEqual(['srv_1']);
    expect((await readQueue()).map((op) => op.entry)).toEqual([LOCAL_DRAFT]);
    expect(result.outcomes).toEqual([
      { entryId: LOCAL_DRAFT.id, kind: 'saveDraft', result: 'waiting', message: 'Waiting to sync' },
    ]);
  });

  test('a later sync is a new attempt: it may refresh once more, and sends the queue when it works', async () => {
    await enqueue('saveDraft', LOCAL_DRAFT);
    expireAccessToken();
    failRetryAfterRefresh();
    await sync();
    expect(getRefreshCount()).toBe(1);

    // Still failing: the new sync gets one refresh of its own, no more.
    const second = await sync();
    expect(second.status).toBe('session_expired');
    expect(getRefreshCount()).toBe(2);

    // Once the server accepts the refreshed token the stored one just works.
    failRetryAfterRefresh(false);
    const third = await sync();
    expect(third.status).toBe('synced');
    expect(getRefreshCount()).toBe(2);
    expect(getServerEntries()).toContainEqual(LOCAL_DRAFT);
    expect(await readQueue()).toEqual([]);
  });

  test('refresh is refused unless the stored refresh token is refresh_ok', async () => {
    await secureSet(REFRESH_TOKEN_KEY, 'refresh_revoked');
    await enqueue('saveDraft', LOCAL_DRAFT);
    expireAccessToken();

    const result = await sync();

    expect(result.status).toBe('session_expired');
    expect(getRefreshCount()).toBe(1);
    expect(await getAccessToken()).toBe('access_1');
    expect(await readQueue()).toHaveLength(1);
  });
});
