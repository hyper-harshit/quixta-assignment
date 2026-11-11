/**
 * Typed calls to the server. This is the only file that knows about tokens on
 * the wire, and the only place the refresh-once rule is written.
 */
import { getAccessToken, getRefreshToken, setAccessToken } from '../storage/tokens';
import type { Entry } from '../types';
import { fakeFetch, type FakeRequestInit, type FakeResponse } from './fakeServer';

/** The server could not be reached. */
export class NetworkError extends Error {
  constructor() {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/** The call was rejected with 401 and one refresh did not fix it. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

/** A real backend would put `fetch` here, with a base URL. */
const transport = fakeFetch;

async function send(path: string, init: FakeRequestInit, token?: string | null): Promise<FakeResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await transport(path, { ...init, headers });
  } catch {
    throw new NetworkError();
  }
}

/** Calls the refresh route once and stores the new access token. Null when refused. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  const response = await send('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  const { accessToken } = (await response.json()) as { accessToken: string };
  await setAccessToken(accessToken);
  return accessToken;
}

/**
 * Makes one authorised call. On 401 it refreshes once and retries once.
 * There is no loop: a second 401, or a refused refresh, ends the operation
 * with SessionExpiredError.
 */
async function authorised(path: string, init: FakeRequestInit): Promise<FakeResponse> {
  const first = await send(path, init, await getAccessToken());
  if (first.status !== 401) return first;

  const freshToken = await refreshAccessToken();
  if (!freshToken) throw new SessionExpiredError();

  const retry = await send(path, init, freshToken);
  if (retry.status === 401) throw new SessionExpiredError();
  return retry;
}

/** `entry` is always the server's copy after the call, whether or not ours was accepted. */
export interface WriteResult {
  conflict: boolean;
  entry: Entry;
}

async function write(method: 'PUT' | 'POST', path: string, entry: Entry): Promise<WriteResult> {
  const response = await authorised(path, { method, body: JSON.stringify(entry) });
  if (response.status !== 409 && !response.ok) {
    throw new Error(`Unexpected response ${response.status} from ${method} ${path}`);
  }
  const body = (await response.json()) as { entry: Entry };
  return { conflict: response.status === 409, entry: body.entry };
}

export async function listEntries(): Promise<Entry[]> {
  const response = await authorised('/entries', { method: 'GET' });
  if (!response.ok) throw new Error(`Unexpected response ${response.status} from GET /entries`);
  return (await response.json()) as Entry[];
}

export function saveDraft(entry: Entry): Promise<WriteResult> {
  return write('PUT', `/entries/${encodeURIComponent(entry.id)}`, entry);
}

export function submitEntry(entry: Entry): Promise<WriteResult> {
  return write('POST', `/entries/${encodeURIComponent(entry.id)}/submit`, entry);
}
