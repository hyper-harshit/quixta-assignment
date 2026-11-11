import { secureGet, secureSet } from './secure';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

const INITIAL_ACCESS_TOKEN = 'access_1';
const INITIAL_REFRESH_TOKEN = 'refresh_ok';

export function getAccessToken(): Promise<string | null> {
  return secureGet(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): Promise<void> {
  return secureSet(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_TOKEN_KEY);
}

/**
 * Stands in for signing in. The in-memory server starts every launch
 * accepting access_1, so the device starts every launch holding it.
 */
export async function seedSession(): Promise<void> {
  await secureSet(ACCESS_TOKEN_KEY, INITIAL_ACCESS_TOKEN);
  await secureSet(REFRESH_TOKEN_KEY, INITIAL_REFRESH_TOKEN);
}
