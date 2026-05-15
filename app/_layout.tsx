import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '../src/db/database';
import { useVeilStore } from '../src/store/useStore';

type AppState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const { loadAll, theme, themeMode } = useVeilStore(s => ({
    loadAll: s.loadAll, theme: s.theme, themeMode: s.themeMode,
  }));
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Pulsing logo
  const pulse  = useRef(new Animated.Value(1)).current;
  const logoY  = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    // Slide up + fade in on mount
    Animated.spring(logoY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 160 }).start();

    // Continuous pulse while loading
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

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
      <GestureHandlerRootView style={[s.root, { backgroundColor: theme.bg }]}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <View style={s.center}>
          <Animated.Text style={[s.logo, { color: theme.accent, opacity: pulse, transform: [{ translateY: logoY }] }]}>
            ◎
          </Animated.Text>
          <Animated.Text style={[s.appName, { color: theme.textMuted, transform: [{ translateY: logoY }] }]}>
            veil
          </Animated.Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (appState === 'error') {
    return (
      <GestureHandlerRootView style={[s.root, { backgroundColor: theme.bg }]}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <View style={s.center}>
          <Text style={s.errorIcon}>⚠</Text>
          <Text style={[s.errorTitle, { color: theme.text }]}>Something went wrong</Text>
          <Text style={[s.errorMsg, { color: theme.textMuted }]}>{errorMsg}</Text>
          <TouchableOpacity onPress={init} style={[s.retryBtn, { backgroundColor: theme.accent }]} activeOpacity={0.8}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0d0b14' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo:       { fontSize: 52, color: '#8b7cf8' },
  appName:    { fontSize: 22, fontWeight: '300', color: 'rgba(255,255,255,0.5)', letterSpacing: 7, marginTop: 14 },
  errorIcon:  { fontSize: 40, color: '#FF6B6B', marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  errorMsg:   { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 32 },
  retryBtn:   { backgroundColor: '#8b7cf8', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText:  { fontSize: 15, fontWeight: '600', color: '#0d0b14' },
});
