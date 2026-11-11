import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { EntryRow } from '../components/EntryRow';
import { ServerPanel } from '../components/ServerPanel';
import { MSG } from '../messages';
import { useNetwork } from '../network';
import { runSync, useRows, useStore } from '../store';
import { colors, space } from '../theme';
import type { SyncResult } from '../types';

interface Props {
  onNewEntry: () => void;
  onOpenEntry: (id: string) => void;
}

function statusText(syncing: boolean, lastSync: SyncResult | null, online: boolean): string {
  if (syncing) return 'Syncing…';
  if (lastSync?.status === 'session_expired') return MSG.sessionExpired;
  if (!online || lastSync?.status === 'offline') return 'Offline';
  if (!lastSync) return '';
  return lastSync.message ?? 'Up to date';
}

export function EntryListScreen({ onNewEntry, onOpenEntry }: Props) {
  const { hydrated, syncing, lastSync } = useStore();
  const rows = useRows();
  const { online } = useNetwork();

  const startSync = () => {
    runSync().catch((error) => console.warn('Sync failed', error));
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(row) => row.entry.id}
      renderItem={({ item }) => <EntryRow row={item} onPress={() => onOpenEntry(item.entry.id)} />}
      style={styles.screen}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.actions}>
            <Button label="New entry" onPress={onNewEntry} variant="primary" testID="new-entry-button" />
            <Button label="Sync" onPress={startSync} disabled={syncing} testID="sync-button" />
          </View>
          <Text style={styles.status} testID="sync-status" accessibilityLiveRegion="polite">
            {statusText(syncing, lastSync, online)}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{hydrated ? 'No entries yet' : 'Loading…'}</Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <ServerPanel />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.sm },
  header: { gap: space.sm, marginBottom: space.sm },
  actions: { flexDirection: 'row', gap: space.md },
  status: { minHeight: 20, fontSize: 14, color: colors.muted },
  empty: { paddingVertical: space.xl, textAlign: 'center', color: colors.muted, fontSize: 15 },
  footer: { marginTop: space.xl },
});
