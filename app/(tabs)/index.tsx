import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PlutchikWheel from '../../src/components/PlutchikWheel';
import { TRIGGERS, COLORS, getEmotion } from '../../src/constants/emotions';
import { useVeilStore } from '../../src/store/useStore';
import type { EmotionId, TriggerId } from '../../src/types';

// ── Weekly Digest helpers ────────────────────────────────────────────────────────────
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isSameWeek(dateStr: string, now: Date): boolean {
  const d = new Date(dateStr);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function WeeklyDigest({ checkIns }: { checkIns: ReturnType<typeof useVeilStore<any>> }) {
  const now = new Date();
  const week = (checkIns as any[]).filter((c: any) => isSameWeek(c.createdAt, now));

  // Only show if we have at least 2 entries this week
  if (week.length < 2) return null;

  const avgMood = Math.round((week.reduce((s: number, c: any) => s + c.intensity, 0) / week.length) * 10) / 10;

  // Most frequent emotion
  const emoCounts: Record<string, number> = {};
  for (const c of week) emoCounts[c.emotion] = (emoCounts[c.emotion] ?? 0) + 1;
  const topEmoId = Object.entries(emoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionId | undefined;
  const topEmo = topEmoId ? getEmotion(topEmoId) : null;

  // Hardest day
  const byDow: Record<number, number[]> = {};
  for (const c of week) {
    const d = new Date(c.createdAt).getDay();
    (byDow[d] = byDow[d] ?? []).push(c.intensity);
  }
  const dowAvgs = Object.entries(byDow)
    .map(([d, vals]) => ({ d: +d, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.avg - b.avg);
  const hardestDay = dowAvgs[0] ? DOW[dowAvgs[0].d] : null;

  const moodLabel = avgMood >= 7 ? 'great week ✨' : avgMood >= 5 ? 'solid week' : 'tough week';

  return (
    <View style={d.digestCard}>
      <View style={d.digestHeader}>
        <Text style={d.digestTitle}>this week</Text>
        <Text style={d.digestMoodLabel}>{moodLabel}</Text>
      </View>
      <View style={d.digestRow}>
        <View style={d.digestStat}>
          <Text style={d.digestStatVal}>{week.length}</Text>
          <Text style={d.digestStatLabel}>check-ins</Text>
        </View>
        <View style={d.digestDivider} />
        <View style={d.digestStat}>
          <Text style={[d.digestStatVal, { color: COLORS.accent }]}>{avgMood}/10</Text>
          <Text style={d.digestStatLabel}>avg mood</Text>
        </View>
        {topEmo && (
          <><View style={d.digestDivider} />
          <View style={d.digestStat}>
            <Text style={[d.digestStatVal, { color: topEmo.color, fontSize: 14 }]}>{topEmo.label}</Text>
            <Text style={d.digestStatLabel}>most felt</Text>
          </View></>
        )}
        {hardestDay && (
          <><View style={d.digestDivider} />
          <View style={d.digestStat}>
            <Text style={[d.digestStatVal, { color: '#FF6B6B', fontSize: 14 }]}>{hardestDay}</Text>
            <Text style={d.digestStatLabel}>hardest day</Text>
          </View></>
        )}
      </View>
    </View>
  );
}

export default function CheckInScreen() {
  const { addCheckIn, checkIns } = useVeilStore(s => ({ addCheckIn: s.addCheckIn, checkIns: s.checkIns }));
  const [sel, setSel]       = useState<EmotionId | null>(null);
  const [trigs, setTrigs]   = useState<TriggerId[]>([]);
  const [intensity, setInt] = useState(5);
  const [note, setNote]     = useState('');
  const [saved, setSaved]   = useState(false);

  const toggle = (id: TriggerId) =>
    setTrigs(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id]);

  const save = async () => {
    if (!sel) { Alert.alert('Choose an emotion', 'Tap a segment on the wheel.'); return; }
    await addCheckIn(sel, intensity, trigs, note);
    setSaved(true);
    setTimeout(() => { setSaved(false); setSel(null); setTrigs([]); setNote(''); setInt(5); }, 1500);
  };

  const emo = sel ? getEmotion(sel) : null;
  const btnColor = saved ? COLORS.teal : emo?.color ?? COLORS.accent;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>how are you feeling?</Text>
            <Text style={s.sub}>{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={s.logo}><Text style={{ fontSize: 16, color: COLORS.accent }}>◎</Text></View>
        </View>

        <WeeklyDigest checkIns={checkIns} />

        <PlutchikWheel selected={sel} onSelect={setSel} size={240} />

        <View style={s.section}>
          <Text style={s.label}>intensity</Text>
          <View style={s.dotsRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
              <TouchableOpacity key={v} onPress={() => setInt(v)}
                style={[s.dot, { backgroundColor: v <= intensity ? (emo?.color ?? COLORS.accent) : 'rgba(255,255,255,0.1)', transform: [{ scale: v === intensity ? 1.35 : 1 }] }]}
              />
            ))}
            <View style={[s.badge, { backgroundColor: (emo?.color ?? COLORS.accent) + '33' }]}>
              <Text style={[s.badgeText, { color: emo?.color ?? COLORS.accent }]}>{intensity}/10</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>what triggered this?</Text>
          <View style={s.chips}>
            {TRIGGERS.map(t => {
              const active = trigs.includes(t.id);
              return (
                <TouchableOpacity key={t.id} onPress={() => toggle(t.id)}
                  style={[s.chip, active && s.chipOn]}>
                  <Text style={[s.chipText, active && s.chipTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>note</Text>
          <TextInput value={note} onChangeText={setNote}
            placeholder="what's happening inside..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline numberOfLines={3} style={s.input} />
        </View>

        <View style={s.section}>
          <TouchableOpacity onPress={save} activeOpacity={0.85}
            style={[s.btn, { backgroundColor: btnColor, opacity: sel ? 1 : 0.4 }]}>
            <Text style={s.btnText}>{saved ? '✓  saved' : 'lift the veil'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  content:   { paddingBottom: 32 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:     { fontSize: 22, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:       { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
  logo:      { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: 'rgba(139,124,248,0.3)', alignItems: 'center', justifyContent: 'center' },
  section:   { paddingHorizontal: 20, marginTop: 16 },
  label:     { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  dotsRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:       { width: 18, height: 18, borderRadius: 9 },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginLeft: 4 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipOn:    { backgroundColor: 'rgba(139,124,248,0.2)', borderColor: 'rgba(139,124,248,0.5)' },
  chipText:  { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  chipTextOn:{ color: '#c4b8ff' },
  input:     { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 10, lineHeight: 20, textAlignVertical: 'top' },
  btn:       { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText:   { fontSize: 15, fontWeight: '600', color: '#0d0b14' },
});

// Weekly digest styles (separate object to avoid name clash)
const d = StyleSheet.create({
  digestCard:      { marginHorizontal: 20, marginTop: 16, backgroundColor: 'rgba(139,124,248,0.08)', borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(139,124,248,0.25)', padding: 14 },
  digestHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  digestTitle:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.06, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' },
  digestMoodLabel: { fontSize: 12, color: COLORS.accent },
  digestRow:       { flexDirection: 'row', alignItems: 'center' },
  digestStat:      { flex: 1, alignItems: 'center' },
  digestStatVal:   { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  digestStatLabel: { fontSize: 10, color: COLORS.textDim },
  digestDivider:   { width: 0.5, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
});
