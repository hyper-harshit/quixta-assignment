import { router } from 'expo-router';

/**
 * Returns to the entry list from anywhere. After a deep link there may be no
 * list underneath the current screen, in which case the list replaces it.
 */
export function backToList(): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

export function entryPath(id: string): string {
  return `/entries/${encodeURIComponent(id)}`;
}
