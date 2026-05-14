import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS, getEmotion } from '../../src/constants/emotions';

const CORR = [
  { label: 'sleep → mood',         value: 0.82, color: '#4ecdc4' },
  { label: 'work → anxiety',       value: 0.67, color: '#FF6B6B' },
  { label: 'exercise → energy',    value: 0.74, color: '#6BCB77' },
  { label: 'loneliness → sadness', value: 0.58, color: '#A29BFE' },
];

export default function InsightsScreen() {
  const { moodChart, stats } = useVeilStore(s => ({ moodChart: s.moodChart, stats: s.stats }));
  const maxAvg = Math.max(...moodChart.map(d => d.avg), 1);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>patterns</Text>
          <Text style={s.sub}>last 14 days</Text>
        </View>

        <View style={[s.card, s.mx]}>
          <Text style={s.label}>mood</Text>
          <View style={s.chartRow}>
            {(moodChart.length > 0 ? moodChart : Array.from({ length: 14 }, () => ({ avg: 0 }))).map((d, i) => (
              <View key={i} style={s.barCol}>
                <View style={[s.bar, {
                  height: Math.max(4, (d.avg / maxAvg) * 60),
                  backgroundColor: d.avg > 7 ? COLORS.accent : d.avg > 4 ? COLORS.accent + '70' : COLORS.accent + '30',
                }]} />
              </View>
            ))}
          </View>
          <View style={s.chartLabels}>
            <Text style={s.chartLabel}>14 days ago</Text>
            <Text style={s.chartLabel}>today</Text>
          </View>
        </View>

        <View style={[s.card, s.mx, s.callout]}>
          <Text style={s.calloutBadge}>veil notices</Text>
          <Text style={s.calloutText}>Monday and Tuesday are consistently harder — anxiety and fatigue are 34% above your average</Text>
        </View>

        <View style={s.mx}>
          <Text style={s.label}>correlations</Text>
          {CORR.map(c => (
            <View key={c.label} style={[s.card, s.corrRow]}>
              <View style={{ flex: 1 }}>
                <Text style={s.corrLabel}>{c.label}</Text>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${c.value * 100}%` as any, backgroundColor: c.color }]} />
                </View>
              </View>
              <Text style={[s.corrVal, { color: c.color }]}>{Math.round(c.value * 100)}%</Text>
            </View>
          ))}
        </View>

        {stats && (
          <View style={s.mx}>
            <Text style={s.label}>overview</Text>
            <View style={s.grid}>
              {[
                { label: 'total entries', val: String(stats.totalEntries) },
                { label: 'day streak',    val: String(stats.streak) },
                { label: 'top emotion',   val: stats.topEmotion ? getEmotion(stats.topEmotion).label : '—' },
                { label: 'main trigger',  val: stats.topTrigger ?? '—' },
              ].map(item => (
                <View key={item.label} style={[s.card, s.statCard]}>
                  <Text style={s.statLabel}>{item.label}</Text>
                  <Text style={s.statVal}>{item.val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { paddingBottom: 32 },
  header:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:         { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
  mx:          { marginHorizontal: 20, marginBottom: 12 },
  label:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  card:        { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, padding: 14 },
  chartRow:    { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 4 },
  barCol:      { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar:         { width: '100%', borderRadius: 3 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  callout:     { borderLeftWidth: 2, borderLeftColor: COLORS.accent, paddingLeft: 14 },
  calloutBadge:{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  calloutText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  corrRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  corrLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  track:       { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill:        { height: '100%', borderRadius: 2 },
  corrVal:     { fontSize: 14, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:    { width: '47%', padding: 12 },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  statVal:     { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
});
