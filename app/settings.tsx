import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FadeScreen } from '../src/components/FadeScreen';
import { useVeilStore } from '../src/store/useStore';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    themeMode, theme, setThemeMode,
    resetCheckIns, resetVoiceEntries, resetAllData,
    checkCount, voiceCount,
  } = useVeilStore(s => ({
    themeMode: s.themeMode,
    theme: s.theme,
    setThemeMode: s.setThemeMode,
    resetCheckIns: s.resetCheckIns,
    resetVoiceEntries: s.resetVoiceEntries,
    resetAllData: s.resetAllData,
    checkCount: s.checkIns.length,
    voiceCount: s.voiceEntries.length,
  }));

  const confirmReset = (title: string, message: string, action: () => Promise<void>) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => { action().catch(e => Alert.alert('Reset failed', String(e))); },
      },
    ]);
  };

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backBtn, { backgroundColor: theme.chip, opacity: pressed ? 0.65 : 1 }]}
          >
            <Text style={[s.backText, { color: theme.textMuted }]}>←</Text>
          </Pressable>
          <View>
            <Text style={[s.title, { color: theme.text }]}>settings</Text>
            <Text style={[s.sub, { color: theme.textDim }]}>theme and local data</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: theme.text }]}>light theme</Text>
                <Text style={[s.rowSub, { color: theme.textMuted }]}>
                  Switch between dark and light mode
                </Text>
              </View>
              <Switch
                value={themeMode === 'light'}
                onValueChange={v => setThemeMode(v ? 'light' : 'dark')}
                trackColor={{ false: theme.border, true: theme.accentDim }}
                thumbColor={themeMode === 'light' ? theme.accent : theme.textMuted}
              />
            </View>
          </View>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.sectionLabel, { color: theme.textDim }]}>data reset</Text>
            <Text style={[s.warning, { color: theme.textMuted }]}>
              Data is stored only on this device. Reset actions cannot be undone.
            </Text>

            <ResetButton
              label={`Reset check-ins (${checkCount})`}
              color={theme.danger}
              borderColor={theme.border}
              onPress={() => confirmReset(
                'Reset check-ins?',
                'This deletes all manual check-ins, journal entries, heatmap data, and check-in patterns.',
                resetCheckIns,
              )}
            />
            <ResetButton
              label={`Reset voice journal (${voiceCount})`}
              color={theme.danger}
              borderColor={theme.border}
              onPress={() => confirmReset(
                'Reset voice journal?',
                'This deletes all saved voice journal records and voice-derived patterns.',
                resetVoiceEntries,
              )}
            />
            <ResetButton
              label="Reset all data"
              color={theme.danger}
              borderColor={theme.danger + '66'}
              strong
              onPress={() => confirmReset(
                'Reset everything?',
                'This deletes every check-in and voice journal entry stored by Veil.',
                resetAllData,
              )}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </FadeScreen>
  );
}

function ResetButton({
  label, color, borderColor, strong, onPress,
}: {
  label: string;
  color: string;
  borderColor: string;
  strong?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      s.resetBtn,
      { borderColor, backgroundColor: strong ? color + '18' : 'transparent', opacity: pressed ? 0.7 : 1 },
    ]}>
      <Text style={[s.resetText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12 },
  backBtn:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  backText:     { fontSize: 18 },
  title:        { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  sub:          { fontSize: 14, marginTop: 4 },
  content:      { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  card:         { borderRadius: 18, borderWidth: 0.5, padding: 18 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowTitle:     { fontSize: 16, fontWeight: '600' },
  rowSub:       { fontSize: 13, marginTop: 4, lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 8 },
  warning:      { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  resetBtn:     { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  resetText:    { fontSize: 14, fontWeight: '700' },
});
