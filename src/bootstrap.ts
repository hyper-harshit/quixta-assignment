import { startNetworkWatch } from './network';
import { seedSession } from './storage/tokens';
import { hydrate, runSync } from './store';

/**
 * Start-up sequence, run once from the root layout:
 * sign in (fake), load what the device already has, find out whether the
 * network is up, then sync. Returns a function that stops the network watch.
 */
export function startApp(): () => void {
  let stopped = false;
  let stopNetworkWatch: (() => void) | null = null;

  const syncQuietly = () => {
    runSync().catch((error) => console.warn('Sync failed', error));
  };

  (async () => {
    await seedSession();
    await hydrate();
    const stop = await startNetworkWatch(syncQuietly);
    if (stopped) {
      stop();
      return;
    }
    stopNetworkWatch = stop;
    await runSync();
  })().catch((error) => console.warn('Start-up failed', error));

  return () => {
    stopped = true;
    stopNetworkWatch?.();
  };
}
