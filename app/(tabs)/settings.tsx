import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import { EMOTIONS } from '../../src/constants/emotions';
import type { ThemeMode } from '../../src/types';

// ── Animated row ──────────────────────────────────────────────────────────────
function ActionRow({ label, sub, color, onPress }: {
  label: string; sub?: string; color?: string; onPress: () => void;
}) {
  const t     = useVeilStore(s => s.theme);
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 22, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Animated.View style={[row.wrap, { backgroundColor: t.card, borderColor: t.border }, anim]}>
        <View style={{ flex: 1 }}>
          <Text style={[row.label, { color: color ?? t.text }]}>{label}</Text>
          {sub && <Text style={[row.sub, { color: t.textMuted }]}>{sub}</Text>}
        </View>
        <Text style={[row.arrow, { color: t.textDim }]}>›</Text>
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

// ── Theme card ────────────────────────────────────────────────────────────────
function ThemeCard({ mode, label, active, onPress, accent }: {
  mode: ThemeMode; label: string; active: boolean; onPress: () => void; accent: string;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDark = mode === 'dark';
  const bg     = isDark ? '#0d0b14' : '#f7f4ef';
  const card   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(18,16,24,0.06)';

  return (
    <Pressable
      style={{ flex: 1 }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 22, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Animated.View style={[tc.card, { borderColor: active ? accent : 'transparent' }, anim]}>
        <View style={[tc.preview, { backgroundColor: bg }]}>
          <View style={[tc.previewBar,    { backgroundColor: card }]} />
          <View style={[tc.previewCircle, { borderColor: accent }]} />
          <View style={[tc.previewChip,   { backgroundColor: card }]} />
        </View>
        <Text style={[tc.label, { color: active ? accent : '#888' }]}>{label}</Text>
        {active && <View style={[tc.dot, { backgroundColor: accent }]} />}
      </Animated.View>
    </Pressable>
  );
}
const tc = StyleSheet.create({
  card:          { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.08)', borderWidth: 2, borderColor: 'transparent' },
  preview:       { height: 80, padding: 10, gap: 6, alignItems: 'center', justifyContent: 'center' },
  previewBar:    { width: '70%', height: 8, borderRadius: 4 },
  previewCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  previewChip:   { width: '50%', height: 6, borderRadius: 3 },
  label:         { textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 8 },
  dot:           { width: 6, height: 6, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
});

// ── Personalization card ──────────────────────────────────────────────────────
function PersonalizationCard() {
  const { t, ft, resetFineTuning } = useVeilStore(s => ({
    t: s.theme, ft: s.fineTuningState, resetFineTuning: s.resetFineTuning,
  }));

  const total    = ft.totalConfirmations;
  const counts   = ft.counts;
  const maxCount = Math.max(...EMOTIONS.map(e => counts[e.id] ?? 0), 1);

  // Personalization level: 0-100%, capped at 50 confirmations = 100%
  const level    = Math.min(100, Math.round((total / 50) * 100));

  const confirmReset = () => Alert.alert(
    'Reset personalisation?',
    'The model will return to its default state. Your voice entries stay. Cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetFineTuning },
    ],
  );

  return (
    <View style={[pc.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Header row */}
      <View style={pc.headerRow}>
        <View>
          <Text style={[pc.heading, { color: t.text }]}>
            {total === 0 ? 'not yet personalised' : `${level}% personalised`}
          </Text>
          <Text style={[pc.sub, { color: t.textMuted }]}>
            {total === 0
              ? 'save voice entries to adapt the model to your voice'
              : `${total} voice ${total === 1 ? 'confirmation' : 'confirmations'} · model adapts on-device`}
          </Text>
        </View>
      </View>

      {/* Personalisation level bar */}
      {total > 0 && (
        <View style={[pc.levelTrack, { backgroundColor: t.border }]}>
          <View style={[pc.levelFill, { width: `${level}%` as any, backgroundColor: t.accent }]} />
        </View>
      )}

      {/* Per-emotion dots */}
      {total > 0 && (
        <View style={pc.emotionGrid}>
          {EMOTIONS.map(e => {
            const count = counts[e.id] ?? 0;
            const fill  = count / maxCount;
            return (
              <View key={e.id} style={pc.emotionItem}>
                {/* Mini stacked bars */}
                <View style={[pc.barTrack, { backgroundColor: t.border }]}>
                  <View style={[pc.barFill, {
                    height: `${Math.max(fill * 100, count > 0 ? 15 : 0)}%` as any,
                    backgroundColor: e.color + (count > 0 ? 'cc' : '30'),
                  }]} />
                </View>
                <Text style={[pc.emotionLabel, { color: count > 0 ? e.color : t.textDim }]}>
                  {e.label.slice(0, 3)}
                </Text>
                {count > 0 && (
                  <Text style={[pc.emotionCount, { color: t.textDim }]}>{count}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Reset button */}
      {total > 0 && (
        <Pressable onPress={confirmReset} style={({ pressed }) => [
          pc.resetBtn, { borderColor: t.danger + '55', opacity: pressed ? 0.7 : 1 }
        ]}>
          <Text style={[pc.resetText, { color: t.danger }]}>reset personalisation</Text>
        </Pressable>
      )}
    </View>
  );
}

const pc = StyleSheet.create({
  card:         { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 8 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heading:      { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  sub:          { fontSize: 13, lineHeight: 18 },
  levelTrack:   { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  levelFill:    { height: '100%', borderRadius: 2 },
  emotionGrid:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  emotionItem:  { alignItems: 'center', gap: 4, flex: 1 },
  barTrack:     { width: 20, height: 36, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:      { width: '100%', borderRadius: 4 },
  emotionLabel: { fontSize: 9, fontWeight: '600' },
  emotionCount: { fontSize: 9 },
  resetBtn:     { alignSelf: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 2 },
  resetText:    { fontSize: 13, fontWeight: '500' },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { t, themeMode, setThemeMode, stats, resetCheckIns, resetVoiceEntries, resetAllData } = useVeilStore(s => ({
    t: s.theme, themeMode: s.themeMode, setThemeMode: s.setThemeMode,
    stats: s.stats, resetCheckIns: s.resetCheckIns,
    resetVoiceEntries: s.resetVoiceEntries, resetAllData: s.resetAllData,
  }));

  const confirmReset = (title: string, msg: string, action: () => Promise<void>) =>
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: action },
    ]);

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          <View style={s.header}>
            <Text style={[s.title, { color: t.text }]}>settings</Text>
          </View>

          {/* Appearance */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>appearance</Text>
          <View style={s.themeRow}>
            <ThemeCard mode="dark"  label="dark"  active={themeMode === 'dark'}  accent={t.accent} onPress={() => setThemeMode('dark')} />
            <View style={{ width: 12 }} />
            <ThemeCard mode="light" label="light" active={themeMode === 'light'} accent={t.accent} onPress={() => setThemeMode('light')} />
          </View>

          {/* Personalisation */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>personalisation</Text>
          <PersonalizationCard />

          {/* Data */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>data</Text>
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
            color={t.danger}
            sub="check-ins + voice entries"
            onPress={() => confirmReset('Clear everything?', 'This will permanently delete all your data. Cannot be undone.', resetAllData)}
          />

          {/* About */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>about</Text>
          <View style={[s.aboutCard, { backgroundColor: t.card, borderColor: t.border }]}>
            {[
              { k: 'version', v: '1.0.0',                vColor: t.text },
              { k: 'ml audio',  v: 'prototype-net-v2',   vColor: t.text },
              { k: 'ml patterns', v: 'bayes-net-v2',     vColor: t.text },
              { k: 'storage',  v: 'on-device only',       vColor: t.text },
              { k: 'network',  v: 'zero requests',        vColor: t.teal },
            ].map((item, i, arr) => (
              <React.Fragment key={item.k}>
                <View style={s.aboutRow}>
                  <Text style={[s.aboutKey, { color: t.textMuted }]}>{item.k}</Text>
                  <Text style={[s.aboutVal, { color: item.vColor }]}>{item.v}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.aboutDivider, { backgroundColor: t.border }]} />}
              </React.Fragment>
            ))}
          </View>

          <Text style={[s.privacy, { color: t.textDim }]}>
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
