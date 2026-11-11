import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Row } from '../store';
import { colors, space } from '../theme';

interface Props {
  row: Row;
  onPress: () => void;
}

export function EntryRow({ row, onPress }: Props) {
  const { entry, notice } = row;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`entry-row-${entry.id}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.line}>
        <Text style={styles.title}>
          {entry.category} · {entry.date}
        </Text>
        <Text style={styles.status}>{entry.status}</Text>
      </View>
      <Text style={styles.detail} numberOfLines={1}>
        {entry.durationMinutes} min{entry.note ? ` · ${entry.note}` : ''}
      </Text>
      {notice ? (
        <Text style={styles.notice} testID={`entry-notice-${entry.id}`}>
          {notice}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: space.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.xs,
  },
  pressed: { opacity: 0.7 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
  status: { fontSize: 14, color: colors.muted },
  detail: { fontSize: 14, color: colors.muted },
  notice: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.noticeBackground,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
