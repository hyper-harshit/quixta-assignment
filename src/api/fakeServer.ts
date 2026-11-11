/**
 * The in-memory server. It lives in the app's own JavaScript process, so
 * nothing here touches the network. The client reaches it through `fakeFetch`,
 * which is shaped like `fetch`: method, path, headers and a JSON body go in,
 * a status code and a JSON body come out, and the call rejects while offline.
 *
 * Routes
 *   GET  /entries              list
 *   PUT  /entries/:id          create or overwrite a draft
 *   POST /entries/:id/submit   create if missing, then mark submitted
 *   POST /auth/refresh         exchange the refresh token for an access token
 *
 * The functions under "Test handles" are for tests and the on-screen control
 * panel. Screens and the sync engine never call them.
 */
import type { Entry, EntryStatus } from '../types';

const INITIAL_ACCESS_TOKEN = 'access_1';
const REFRESHED_ACCESS_TOKEN = 'access_2';
const VALID_REFRESH_TOKEN = 'refresh_ok';

const SEED_ENTRIES: readonly Entry[] = [
  {
    id: 'srv_1',
    category: 'inspection',
    date: '2026-06-01',
    durationMinutes: 60,
    note: 'Lobby',
    status: 'submitted',
  },
];

interface ServerState {
  entries: Entry[];
  online: boolean;
  /** The access token the server currently accepts. Null once it has expired. */
  acceptedToken: string | null;
  rejectRefreshedToken: boolean;
  refreshCount: number;
}

function seedState(): ServerState {
  return {
    entries: SEED_ENTRIES.map((entry) => ({ ...entry })),
    online: true,
    acceptedToken: INITIAL_ACCESS_TOKEN,
    rejectRefreshedToken: false,
    refreshCount: 0,
  };
}

let state = seedState();

// ---------------------------------------------------------------------------
// Test handles
// ---------------------------------------------------------------------------

/** Puts the server online or offline. Offline calls reject like a failed fetch. */
export function setOnline(online: boolean): void {
  state.online = online;
}

/** Expires the access token, so the next authorised call returns 401. */
export function expireAccessToken(): void {
  state.acceptedToken = null;
}

/** Makes the retry after a refresh return 401 as well. Pass false to turn it off. */
export function failRetryAfterRefresh(fail = true): void {
  state.rejectRefreshedToken = fail;
}

/** A copy of the entries the server holds. */
export function getServerEntries(): Entry[] {
  return state.entries.map((entry) => ({ ...entry }));
}

/** How many times the refresh route has been called. */
export function getRefreshCount(): number {
  return state.refreshCount;
}

/** Back to the starting state: srv_1 only, access_1 accepted, online, no refreshes. */
export function resetServer(): void {
  state = seedState();
}

// ---------------------------------------------------------------------------
// Fetch-shaped entry point
// ---------------------------------------------------------------------------

export interface FakeRequestInit {
  method?: 'GET' | 'PUT' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface FakeResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}

function respond(status: number, body: unknown): FakeResponse {
  // Serialised up front so callers can never hold a reference into server memory.
  const text = JSON.stringify(body);
  return { status, ok: status >= 200 && status < 300, json: async () => JSON.parse(text) };
}

export async function fakeFetch(path: string, init: FakeRequestInit = {}): Promise<FakeResponse> {
  if (!state.online) throw new TypeError('Network request failed');

  const method = init.method ?? 'GET';
  const body: unknown = init.body ? JSON.parse(init.body) : undefined;

  if (method === 'POST' && path === '/auth/refresh') return refresh(body);

  if (!isAuthorised(init.headers)) return respond(401, { error: 'unauthorised' });

  if (method === 'GET' && path === '/entries') return respond(200, state.entries);

  const match = /^\/entries\/([^/]+)(\/submit)?$/.exec(path);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const isSubmit = Boolean(match[2]);
    if (method === 'PUT' && !isSubmit) return upsert(id, body, 'draft');
    if (method === 'POST' && isSubmit) return upsert(id, body, 'submitted');
  }

  return respond(404, { error: 'not found' });
}

function isAuthorised(headers: Record<string, string> | undefined): boolean {
  const token = headers?.Authorization?.replace(/^Bearer /, '');
  if (!token || token !== state.acceptedToken) return false;
  if (state.rejectRefreshedToken && token === REFRESHED_ACCESS_TOKEN) return false;
  return true;
}

function refresh(body: unknown): FakeResponse {
  state.refreshCount += 1;
  const refreshToken = (body as { refreshToken?: unknown } | undefined)?.refreshToken;
  if (refreshToken !== VALID_REFRESH_TOKEN) return respond(401, { error: 'invalid refresh token' });
  state.acceptedToken = REFRESHED_ACCESS_TOKEN;
  return respond(200, { accessToken: REFRESHED_ACCESS_TOKEN });
}

/**
 * The conflict rule, server side. A submitted row is never overwritten: the
 * caller gets 409 and the server's copy. Anything else is created or replaced.
 */
function upsert(id: string, body: unknown, status: EntryStatus): FakeResponse {
  const existing = state.entries.find((entry) => entry.id === id);
  if (existing?.status === 'submitted') return respond(409, { entry: existing });

  const saved: Entry = { ...(body as Entry), id, status };
  if (existing) {
    state.entries = state.entries.map((entry) => (entry.id === id ? saved : entry));
  } else {
    state.entries = [...state.entries, saved];
  }
  return respond(200, { entry: saved });
}
