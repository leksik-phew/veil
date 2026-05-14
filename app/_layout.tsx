import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/database';
import { useVeilStore } from '../src/store/useStore';

type AppState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const loadAll = useVeilStore(s => s.loadAll);
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const init = async () => {
    setAppState('loading');
    try {
      await initDatabase();
      await loadAll();
      setAppState('ready');
    } catch (e: any) {
      console.error('Init failed:', e);
      setErrorMsg(e?.message ?? 'Unknown error');
      setAppState('error');
    }
  };

  useEffect(() => { init(); }, []);

  if (appState === 'loading') {
    return (
      <View style={s.center}>
        <StatusBar style="light" />
        <Text style={s.logo}>◎</Text>
        <Text style={s.appName}>veil</Text>
        <ActivityIndicator color="#8b7cf8" style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (appState === 'error') {
    return (
      <View style={s.center}>
        <StatusBar style="light" />
        <Text style={s.errorIcon}>⚠</Text>
        <Text style={s.errorTitle}>Something went wrong</Text>
        <Text style={s.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity onPress={init} style={s.retryBtn} activeOpacity={0.8}>
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0b14' } }} />
    </>
  );
}

const s = StyleSheet.create({
  center:    { flex: 1, backgroundColor: '#0d0b14', alignItems: 'center', justifyContent: 'center' },
  logo:      { fontSize: 48, color: '#8b7cf8' },
  appName:   { fontSize: 22, fontWeight: '300', color: 'rgba(255,255,255,0.6)', letterSpacing: 6, marginTop: 12 },
  errorIcon: { fontSize: 40, color: '#FF6B6B', marginBottom: 16 },
  errorTitle:{ fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  errorMsg:  { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 32 },
  retryBtn:  { backgroundColor: '#8b7cf8', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 15, fontWeight: '600', color: '#0d0b14' },
});
