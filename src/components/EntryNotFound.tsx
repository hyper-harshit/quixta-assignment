import { ScrollView, StyleSheet, Text } from 'react-native';

import { MSG } from '../messages';
import { colors, space } from '../theme';
import { Button } from './Button';

interface Props {
  onBackToList: () => void;
}

// A scroll view, so that iOS keeps the content clear of the header and the
// notch the same way it does on the other screens.
export function EntryNotFound({ onBackToList }: Props) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <Text style={styles.title} accessibilityRole="header">
        {MSG.entryNotFound}
      </Text>
      <Button label="Back to list" onPress={onBackToList} variant="primary" testID="back-to-list-button" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
});
