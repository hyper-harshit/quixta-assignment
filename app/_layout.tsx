import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { startApp } from '../src/bootstrap';
import { colors } from '../src/theme';

// Puts the list underneath any screen opened by a deep link, so a cold start
// on worklog://entries/srv_1 still has somewhere to go back to.
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  useEffect(() => startApp(), []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ title: 'Work log' }} />
        <Stack.Screen name="new" options={{ title: 'New entry' }} />
        <Stack.Screen name="entries/[id]" options={{ title: 'Entry' }} />
        <Stack.Screen name="entries/[id]/edit" options={{ title: 'Edit entry' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
      </Stack>
    </>
  );
}
