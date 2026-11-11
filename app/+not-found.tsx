import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { backToList } from '../src/navigation';
import { colors, space } from '../src/theme';

/** Any path that matches no route. An unknown entry id is handled by the detail screen instead. */
export default function NotFoundRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Page not found
      </Text>
      <Button label="Back to list" onPress={backToList} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
    backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
});
