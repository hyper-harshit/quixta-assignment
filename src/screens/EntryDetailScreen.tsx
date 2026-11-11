import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { EntryNotFound } from '../components/EntryNotFound';
import { Loading } from '../components/Loading';
import { useEntry } from '../store';
import { colors, space } from '../theme';

interface Props {
  id: string;
  onEdit: () => void;
  onBackToList: () => void;
}

function Field({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

export function EntryDetailScreen({ id, onEdit, onBackToList }: Props) {
  const lookup = useEntry(id);

  if (lookup.status === 'loading') return <Loading />;
  if (lookup.status === 'missing') return <EntryNotFound onBackToList={onBackToList} />;

  const { entry, notice } = lookup.row;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      {notice ? (
        <Text style={styles.notice} testID="entry-notice">
          {notice}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Field label="ID" value={entry.id} testID="detail-id" />
        <Field label="Category" value={entry.category} testID="detail-category" />
        <Field label="Date" value={entry.date} testID="detail-date" />
        <Field label="Duration" value={`${entry.durationMinutes} minutes`} testID="detail-duration" />
        <Field label="Note" value={entry.note || '—'} testID="detail-note" />
        <Field label="Status" value={entry.status} testID="detail-status" />
      </View>

      <Button label="Edit" onPress={onEdit} variant="primary" testID="edit-button" />
      <Button label="Back to list" onPress={onBackToList} testID="back-to-list-button" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg },
  card: {
    padding: space.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  field: { gap: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  value: { fontSize: 17, color: colors.text },
  notice: {
    padding: space.md,
    borderRadius: 8,
    backgroundColor: colors.noticeBackground,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
