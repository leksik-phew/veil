import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import type { ThemeMode } from '../../src/types';

// ── Press-animated row ────────────────────────────────────────────────────────
function ActionRow({
  label, sub, color, onPress,
}: { label: string; sub?: string; color?: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const theme = useVeilStore(s => s.theme);
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 22, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        row.wrap,
        { backgroundColor: theme.card, borderColor: theme.border },
        anim,
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={[row.label, { color: color ?? theme.text }]}>{label}</Text>
          {sub && <Text style={[row.sub, { color: theme.textMuted }]}>{sub}</Text>}
        </View>
        <Text style={[row.arrow, { color: theme.textDim }]}>›</Text>
      </Animated.View>
    </Pressable>
  );
}
const row = StyleSheet.create({
  wrap:  { borderRadius: 14, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '500' },
  sub:   { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 20, fontWeight: '300', marginLeft: 8 },
});

// ── Theme preview card ────────────────────────────────────────────────────────
function ThemeCard({
  mode, label, active, onPress, accent,
}: { mode: ThemeMode; label: string; active: boolean; onPress: () => void; accent: string }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDark = mode === 'dark';
  const bg     = isDark ? '#0d0b14' : '#f7f4ef';
  const card   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(18,16,24,0.06)';
  const text   = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(18,16,24,0.85)';
  const muted  = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(18,16,24,0.3)';

  return (
    <Pressable
      style={{ flex: 1 }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 22, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        tc.card,
        { borderColor: active ? accent : 'transparent', borderWidth: active ? 2 : 2 },
        anim,
      ]}>
        {/* Mini screen preview */}
        <View style={[tc.preview, { backgroundColor: bg }]}>
          <View style={[tc.previewBar, { backgroundColor: card }]} />
          <View style={[tc.previewCircle, { borderColor: accent }]} />
          <View style={[tc.previewChip, { backgroundColor: card }]} />
        </View>
        <Text style={[tc.label, { color: active ? accent : '#888' }]}>{label}</Text>
        {active && <View style={[tc.dot, { backgroundColor: accent }]} />}
      </Animated.View>
    </Pressable>
  );
}
const tc = StyleSheet.create({
  card:        { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.08)', borderWidth: 2, borderColor: 'transparent' },
  preview:     { height: 80, padding: 10, gap: 6, alignItems: 'center', justifyContent: 'center' },
  previewBar:  { width: '70%', height: 8, borderRadius: 4 },
  previewCircle:{ width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  previewChip: { width: '50%', height: 6, borderRadius: 3 },
  label:       { textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 8 },
  dot:         { width: 6, height: 6, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, stats, resetCheckIns, resetVoiceEntries, resetAllData } = useVeilStore(s => ({
    theme: s.theme, themeMode: s.themeMode, setThemeMode: s.setThemeMode,
    stats: s.stats, resetCheckIns: s.resetCheckIns,
    resetVoiceEntries: s.resetVoiceEntries, resetAllData: s.resetAllData,
  }));

  const confirmReset = (title: string, msg: string, action: () => Promise<void>) => {
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: action },
    ]);
  };

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]}>settings</Text>
          </View>

          {/* Appearance */}
          <Text style={[s.sectionLabel, { color: theme.textDim }]}>appearance</Text>
          <View style={s.themeRow}>
            <ThemeCard
              mode="dark" label="dark" active={themeMode === 'dark'}
              accent={theme.accent} onPress={() => setThemeMode('dark')}
            />
            <View style={{ width: 12 }} />
            <ThemeCard
              mode="light" label="light" active={themeMode === 'light'}
              accent={theme.accent} onPress={() => setThemeMode('light')}
            />
          </View>

          {/* Data */}
          <Text style={[s.sectionLabel, { color: theme.textDim }]}>data</Text>
          <ActionRow
            label="clear check-ins"
            sub={`${stats?.totalEntries ?? 0} entries`}
            onPress={() => confirmReset('Clear check-ins?', 'This will delete all check-in history. Cannot be undone.', resetCheckIns)}
          />
          <ActionRow
            label="clear voice entries"
            onPress={() => confirmReset('Clear voice entries?', 'This will delete all voice journal recordings. Cannot be undone.', resetVoiceEntries)}
          />
          <ActionRow
            label="clear all data"
            color={theme.danger}
            sub="check-ins + voice entries"
            onPress={() => confirmReset('Clear everything?', 'This will permanently delete all your data. Cannot be undone.', resetAllData)}
          />

          {/* About */}
          <Text style={[s.sectionLabel, { color: theme.textDim }]}>about</Text>
          <View style={[s.aboutCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.aboutRow}>
              <Text style={[s.aboutKey, { color: theme.textMuted }]}>version</Text>
              <Text style={[s.aboutVal, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={[s.aboutDivider, { backgroundColor: theme.border }]} />
            <View style={s.aboutRow}>
              <Text style={[s.aboutKey, { color: theme.textMuted }]}>storage</Text>
              <Text style={[s.aboutVal, { color: theme.text }]}>on-device only</Text>
            </View>
            <View style={[s.aboutDivider, { backgroundColor: theme.border }]} />
            <View style={s.aboutRow}>
              <Text style={[s.aboutKey, { color: theme.textMuted }]}>network</Text>
              <Text style={[s.aboutVal, { color: theme.teal }]}>zero requests</Text>
            </View>
            <View style={[s.aboutDivider, { backgroundColor: theme.border }]} />
            <View style={s.aboutRow}>
              <Text style={[s.aboutKey, { color: theme.textMuted }]}>ml model</Text>
              <Text style={[s.aboutVal, { color: theme.text }]}>on-device inference</Text>
            </View>
          </View>

          <Text style={[s.privacy, { color: theme.textDim }]}>
            Veil never sends data anywhere. Everything stays on your device. Zero bytes to the cloud.
          </Text>

        </ScrollView>
      </SafeAreaView>
    </FadeScreen>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  content:      { paddingHorizontal: 20, paddingBottom: 48 },
  header:       { paddingTop: 24, paddingBottom: 20 },
  title:        { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 12, marginTop: 24 },
  themeRow:     { flexDirection: 'row' },
  aboutCard:    { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden', marginBottom: 16 },
  aboutRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  aboutKey:     { fontSize: 14 },
  aboutVal:     { fontSize: 14, fontWeight: '500' },
  aboutDivider: { height: 0.5, marginHorizontal: 16 },
  privacy:      { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
});
