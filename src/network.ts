/**
 * Network status. Two inputs decide whether the app counts as online:
 *
 *   - the device's real connection, reported by NetInfo
 *   - an override from the control panel: auto (follow the device), online, offline
 *
 * The result is pushed to the fake server as reachable or not, which is how a
 * real loss of connection reaches the sync engine: its next request fails.
 * When the app comes back online a sync is started.
 */
import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

import { setOnline } from './api/fakeServer';

export type NetworkOverride = 'auto' | 'online' | 'offline';

export interface NetworkState {
  deviceOnline: boolean;
  override: NetworkOverride;
  /** What the app acts on. */
  online: boolean;
}

let state: NetworkState = { deviceOnline: true, override: 'auto', online: true };
let onReconnect: (() => void) | null = null;
const listeners = new Set<() => void>();

function apply(patch: Partial<Pick<NetworkState, 'deviceOnline' | 'override'>>): void {
  const merged = { ...state, ...patch };
  const online = merged.override === 'auto' ? merged.deviceOnline : merged.override === 'online';
  const cameBack = !state.online && online;

  state = { ...merged, online };
  setOnline(online);
  listeners.forEach((listener) => listener());

  if (cameBack) onReconnect?.();
}

/**
 * Reads the current connection, then keeps listening. `reconnect` is called
 * each time the app goes from offline to online. Returns a stop function.
 */
export async function startNetworkWatch(reconnect: () => void): Promise<() => void> {
  onReconnect = reconnect;

  // isConnected is null while the platform has not decided yet; treat that as online.
  const current = await NetInfo.fetch();
  apply({ deviceOnline: current.isConnected !== false });

  const unsubscribe = NetInfo.addEventListener((next) => {
    apply({ deviceOnline: next.isConnected !== false });
  });

  return () => {
    unsubscribe();
    if (onReconnect === reconnect) onReconnect = null;
  };
}

export function setNetworkOverride(override: NetworkOverride): void {
  apply({ override });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NetworkState {
  return state;
}

export function useNetwork(): NetworkState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
