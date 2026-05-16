import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore, type VeilBackupFile, type ImportMode } from '../../src/store/useStore';
import { EMOTIONS } from '../../src/constants/emotions';
import { TRANSLATIONS } from '../../src/i18n/translations';
import type { ThemeMode, Lang } from '../../src/types';

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
  const scale  = useSharedValue(1);
  const anim   = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDark = mode === 'dark';
  const bg     = isDark ? '#0d0b14' : '#f7f4ef';
  const card   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(18,16,24,0.06)';
  return (
    <Pressable style={{ flex: 1 }}
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

// ── Language card ─────────────────────────────────────────────────────────────
function LangCard({ lang, label, flag, active, onPress, accent }: {
  lang: Lang; label: string; flag: string; active: boolean; onPress: () => void; accent: string;
}) {
  const t     = useVeilStore(s => s.theme);
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable style={{ flex: 1 }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 22, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Animated.View style={[lc.card, { backgroundColor: t.card, borderColor: active ? accent : t.border }, anim]}>
        <Text style={lc.flag}>{flag}</Text>
        <Text style={[lc.label, { color: active ? accent : t.textMuted }]}>{label}</Text>
        {active && <View style={[lc.dot, { backgroundColor: accent }]} />}
      </Animated.View>
    </Pressable>
  );
}
const lc = StyleSheet.create({
  card:  { borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 6 },
  flag:  { fontSize: 28 },
  label: { fontSize: 13, fontWeight: '600' },
  dot:   { width: 5, height: 5, borderRadius: 3 },
});

// ── Personalisation card ──────────────────────────────────────────────────────
function PersonalisationCard() {
  const { t, ft, lang, resetFineTuning } = useVeilStore(s => ({
    t: s.theme, ft: s.fineTuningState, lang: s.lang, resetFineTuning: s.resetFineTuning,
  }));
  const tr       = TRANSLATIONS[lang].settings;
  const total    = ft.totalConfirmations;
  const counts   = ft.counts;
  const maxCount = Math.max(...EMOTIONS.map(e => counts[e.id] ?? 0), 1);
  const level    = Math.min(100, Math.round((total / 50) * 100));

  const confirmReset = () => Alert.alert(
    tr.resetPersonalTitle, tr.resetPersonalMsg,
    [
      { text: tr.cancel, style: 'cancel' },
      { text: tr.reset,  style: 'destructive', onPress: resetFineTuning },
    ],
  );

  return (
    <View style={[pc.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={pc.headerRow}>
        <View>
          <Text style={[pc.heading, { color: t.text }]}>
            {total === 0 ? tr.notPersonalised : tr.personalised(level)}
          </Text>
          <Text style={[pc.sub, { color: t.textMuted }]}>
            {total === 0 ? tr.personalSub0 : tr.personalSubN(total)}
          </Text>
        </View>
      </View>
      {total > 0 && (
        <View style={[pc.levelTrack, { backgroundColor: t.border }]}>
          <View style={[pc.levelFill, { width: `${level}%` as any, backgroundColor: t.accent }]} />
        </View>
      )}
      {total > 0 && (
        <View style={pc.emotionGrid}>
          {EMOTIONS.map(e => {
            const count = counts[e.id] ?? 0;
            const fill  = count / maxCount;
            return (
              <View key={e.id} style={pc.emotionItem}>
                <View style={[pc.barTrack, { backgroundColor: t.border }]}>
                  <View style={[pc.barFill, {
                    height: `${Math.max(fill * 100, count > 0 ? 15 : 0)}%` as any,
                    backgroundColor: e.color + (count > 0 ? 'cc' : '30'),
                  }]} />
                </View>
                <Text style={[pc.emotionLabel, { color: count > 0 ? e.color : t.textDim }]}>
                  {e.label.slice(0, 3)}
                </Text>
                {count > 0 && <Text style={[pc.emotionCount, { color: t.textDim }]}>{count}</Text>}
              </View>
            );
          })}
        </View>
      )}
      {total > 0 && (
        <Pressable onPress={confirmReset} style={({ pressed }) => [
          pc.resetBtn, { borderColor: t.danger + '55', opacity: pressed ? 0.7 : 1 }
        ]}>
          <Text style={[pc.resetText, { color: t.danger }]}>{tr.resetPersonal}</Text>
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

// ── Export / Import card ──────────────────────────────────────────────────────
function ExportImportCard() {
  const { t, lang, exportData, pickBackupFile, importData } = useVeilStore(s => ({
    t: s.theme, lang: s.lang,
    exportData:     s.exportData,
    pickBackupFile: s.pickBackupFile,
    importData:     s.importData,
  }));
  const tr = TRANSLATIONS[lang].settings;
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Export
  const handleExport = async () => {
    setExporting(true);
    try { await exportData(); }
    catch (err) { Alert.alert(tr.exportError, String(err)); }
    finally { setExporting(false); }
  };

  // Import — three-step Alert chain
  const handleImport = async () => {
    setImporting(true);
    let file: VeilBackupFile | null = null;
    try { file = await pickBackupFile(); }
    catch { Alert.alert(tr.importError, tr.importInvalidFile); setImporting(false); return; }
    setImporting(false);
    if (!file) return;

    const date = new Date(file.exportedAt)
      .toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    // Step 1: preview + mode
    Alert.alert('Veil Backup', tr.importPreviewTitle(date, file.stats.checkInsCount, file.stats.voiceEntriesCount), [
      { text: tr.importModeCancel, style: 'cancel' },
      { text: tr.importModeMerge,                    onPress: () => askSettings(file!, 'merge')   },
      { text: tr.importModeReplace, style: 'destructive', onPress: () => askSettings(file!, 'replace') },
    ]);
  };

  const askSettings = (file: VeilBackupFile, mode: ImportMode) => {
    if (!file.settings) { askFineTuning(file, mode, false); return; }
    Alert.alert(tr.importSettingsTitle, tr.importSettingsMsg, [
      { text: tr.importNo,  onPress: () => askFineTuning(file, mode, false) },
      { text: tr.importYes, onPress: () => askFineTuning(file, mode, true)  },
    ]);
  };

  const askFineTuning = (file: VeilBackupFile, mode: ImportMode, inclSettings: boolean) => {
    if (!file.fineTuningState) { doImport(file, mode, inclSettings, false); return; }
    Alert.alert(tr.importFTTitle, tr.importFTMsg, [
      { text: tr.importNo,  onPress: () => doImport(file, mode, inclSettings, false) },
      { text: tr.importYes, onPress: () => doImport(file, mode, inclSettings, true)  },
    ]);
  };

  const doImport = async (file: VeilBackupFile, mode: ImportMode, inclSettings: boolean, inclFT: boolean) => {
    setImporting(true);
    try {
      await importData(file, mode, inclSettings, inclFT);
      Alert.alert(tr.importSuccessTitle, tr.importSuccess(file.stats.checkInsCount, file.stats.voiceEntriesCount));
    } catch (err) { Alert.alert(tr.importError, String(err)); }
    finally { setImporting(false); }
  };

  const busy = exporting || importing;

  return (
    <View style={[ei.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Export row */}
      <Pressable onPress={handleExport} disabled={busy}
        style={({ pressed }) => [ei.row, { opacity: pressed ? 0.75 : 1 }]}>
        <View style={[ei.iconWrap, { backgroundColor: t.accentDim }]}>
          {exporting
            ? <ActivityIndicator size="small" color={t.accent} />
            : <Text style={[ei.icon, { color: t.accent }]}>↑</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ei.label, { color: t.text }]}>{tr.exportBtn}</Text>
          <Text style={[ei.sub,   { color: t.textMuted }]}>{tr.exportSub}</Text>
        </View>
        <Text style={[ei.arrow, { color: t.textDim }]}>›</Text>
      </Pressable>

      <View style={[ei.divider, { backgroundColor: t.border }]} />

      {/* Import row */}
      <Pressable onPress={handleImport} disabled={busy}
        style={({ pressed }) => [ei.row, { opacity: pressed ? 0.75 : 1 }]}>
        <View style={[ei.iconWrap, { backgroundColor: t.accentDim }]}>
          {importing
            ? <ActivityIndicator size="small" color={t.accent} />
            : <Text style={[ei.icon, { color: t.accent }]}>↓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ei.label, { color: t.text }]}>{tr.importBtn}</Text>
          <Text style={[ei.sub,   { color: t.textMuted }]}>{tr.importSub}</Text>
        </View>
        <Text style={[ei.arrow, { color: t.textDim }]}>›</Text>
      </Pressable>
    </View>
  );
}
const ei = StyleSheet.create({
  card:     { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden', marginBottom: 8 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  icon:     { fontSize: 20, fontWeight: '700' },
  label:    { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  sub:      { fontSize: 13 },
  arrow:    { fontSize: 20, fontWeight: '300' },
  divider:  { height: 0.5, marginHorizontal: 16 },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const {
    t, themeMode, setThemeMode, lang, setLang,
    stats, resetCheckIns, resetVoiceEntries, resetAllData,
  } = useVeilStore(s => ({
    t: s.theme, themeMode: s.themeMode, setThemeMode: s.setThemeMode,
    lang: s.lang, setLang: s.setLang,
    stats: s.stats, resetCheckIns: s.resetCheckIns,
    resetVoiceEntries: s.resetVoiceEntries, resetAllData: s.resetAllData,
  }));

  const tr = TRANSLATIONS[lang].settings;

  const confirmReset = (title: string, msg: string, action: () => Promise<void>) =>
    Alert.alert(title, msg, [
      { text: tr.cancel, style: 'cancel' },
      { text: tr.delete, style: 'destructive', onPress: action },
    ]);

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          <View style={s.header}>
            <Text style={[s.title, { color: t.text }]}>{tr.title}</Text>
          </View>

          {/* Appearance */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.appearance}</Text>
          <View style={s.themeRow}>
            <ThemeCard mode="dark"  label={tr.dark}  active={themeMode === 'dark'}  accent={t.accent} onPress={() => setThemeMode('dark')} />
            <View style={{ width: 12 }} />
            <ThemeCard mode="light" label={tr.light} active={themeMode === 'light'} accent={t.accent} onPress={() => setThemeMode('light')} />
          </View>

          {/* Language */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.language}</Text>
          <View style={s.themeRow}>
            <LangCard lang="en" label="English" flag="🇬🇧" active={lang === 'en'} accent={t.accent} onPress={() => setLang('en')} />
            <View style={{ width: 12 }} />
            <LangCard lang="ru" label="Русский" flag="🇷🇺" active={lang === 'ru'} accent={t.accent} onPress={() => setLang('ru')} />
          </View>

          {/* Personalisation */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.personalisation}</Text>
          <PersonalisationCard />

          {/* Export & Import */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.exportImport}</Text>
          <ExportImportCard />

          {/* Data */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.data}</Text>
          <ActionRow
            label={tr.clearCheckins}
            sub={tr.entries(stats?.totalEntries ?? 0)}
            onPress={() => confirmReset(tr.clearCheckinsTitle, tr.clearCheckinsMsg, resetCheckIns)}
          />
          <ActionRow
            label={tr.clearVoice}
            onPress={() => confirmReset(tr.clearVoiceTitle, tr.clearVoiceMsg, resetVoiceEntries)}
          />
          <ActionRow
            label={tr.clearAll}
            color={t.danger}
            sub={tr.clearAllSub}
            onPress={() => confirmReset(tr.clearAllTitle, tr.clearAllMsg, resetAllData)}
          />

          {/* About */}
          <Text style={[s.sectionLabel, { color: t.textDim }]}>{tr.about}</Text>
          <View style={[s.aboutCard, { backgroundColor: t.card, borderColor: t.border }]}>
            {[
              { k: tr.version,    v: '1.0.0',           vColor: t.text },
              { k: tr.mlAudio,    v: 'prototype-net-v2', vColor: t.text },
              { k: tr.mlPatterns, v: 'bayes-net-v2',     vColor: t.text },
              { k: tr.storage,    v: tr.storageVal,       vColor: t.text },
              { k: tr.network,    v: tr.networkVal,       vColor: t.teal },
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

          <Text style={[s.privacy, { color: t.textDim }]}>{tr.privacy}</Text>

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
