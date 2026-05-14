import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/database';
import { useVeilStore } from '../src/store/useStore';

export default function RootLayout() {
  const loadAll = useVeilStore(s => s.loadAll);

  useEffect(() => {
    initDatabase().then(() => loadAll()).catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0b14' } }} />
    </>
  );
}
