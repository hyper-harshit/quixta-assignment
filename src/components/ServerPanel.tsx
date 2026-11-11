/**
 * Controls for the in-memory server, so each sync state can be reached by
 * hand. This is a reviewer's tool, not part of the product. It is the one UI
 * file allowed to call the server's test handles.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { expireAccessToken, failRetryAfterRefresh, getRefreshCount } from '../api/fakeServer';
import { setNetworkOverride, useNetwork, type NetworkOverride } from '../network';
import { useStore } from '../store';
import { colors, space } from '../theme';
import { Button } from './Button';

const OVERRIDES: { value: NetworkOverride; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

export function ServerPanel() {
  const network = useNetwork();
  // Subscribing to the store re-renders the panel after every sync, which
  // keeps the refresh count below current.
  useStore();
  const [failRetry, setFailRetry] = useState(false);
  // The refresh count at the moment the token was expired. While the count is
  // unchanged, no call has hit the 401 yet.
  const [expiredAtCount, setExpiredAtCount] = useState<number | null>(null);
  const refreshCount = getRefreshCount();

  return (
    <View style={styles.panel} testID="server-panel">
      <Text style={styles.heading}>Fake server</Text>

      <Text style={styles.label}>Network</Text>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {OVERRIDES.map(({ value, label }) => {
          const selected = network.override === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setNetworkOverride(value)}
              testID={`network-${value}`}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Device is {network.deviceOnline ? 'online' : 'offline'}. The app is acting as{' '}
        {network.online ? 'online' : 'offline'}. Auto follows the device.
      </Text>

      <Button
        label="Expire access token"
        onPress={() => {
          expireAccessToken();
          setExpiredAtCount(refreshCount);
        }}
        testID="expire-token-button"
      />
      {expiredAtCount === refreshCount ? (
        <Text style={styles.hint}>Expired. The next call to the server returns 401.</Text>
      ) : null}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Fail retry after refresh</Text>
        <Switch
          accessibilityLabel="Fail retry after refresh"
          onValueChange={(value) => {
            failRetryAfterRefresh(value);
            setFailRetry(value);
          }}
          testID="fail-retry-switch"
          value={failRetry}
        />
      </View>

      <Text style={styles.hint} testID="refresh-count">
        Refresh calls so far: {refreshCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: space.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: space.sm,
  },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  segments: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentLabel: { fontSize: 15, color: colors.text },
  segmentLabelSelected: { color: colors.primaryText, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.muted },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  switchLabel: { fontSize: 15, color: colors.text },
});
