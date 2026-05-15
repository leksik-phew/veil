import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS, getEmotion } from '../../src/constants/emotions';
import type { EmotionId } from '../../src/types';

const DOW_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOW_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function intensityToColor(avg: number | undefined): string {
  if (avg === undefined) return 'rgba(255,255,255,0.05)';
  if (avg >= 8) return '#8b7cf8';
  if (avg >= 6) return '#8b7cf8bb';
  if (avg >= 4) return '#8b7cf870';
  if (avg >= 2) return '#FF6B6B55';
  return '#FF6B6B25';
}

function buildGrid(data: { day: string; avg: number }[], weeks = 10): (number | undefined)[][] {
  const map: Record<string, number> = {};
  for (const d of data) map[d.day] = d.avg;
  const today  = new Date();
  const dow    = (today.getDay() + 6) % 7;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dow + 6);
  const grid: (number | undefined)[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const row: (number | undefined)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() - w * 7 - (6 - d));
      if (date > today) { row.push(undefined); continue; }
      row.push(map[date.toISOString().slice(0, 10)]);
    }
    grid.push(row);
  }
  return grid;
}

export default function InsightsScreen() {
  const { stats, checkIns, heatmapData } = useVeilStore(s => ({
    stats: s.stats, checkIns: s.checkIns, heatmapData: s.heatmapData,
  }));

  const heatGrid = useMemo(() => buildGrid(heatmapData, 10), [heatmapData]);

  const correlations = useMemo(() => {
    if (checkIns.length < 3) return [];
    const map: Record<string, Record<string, number>> = {};
    const globalEmo: Record<string, number> = {};
    for (const c of checkIns) {
      globalEmo[c.emotion] = (globalEmo[c.emotion] ?? 0) + 1;
      for (const t of c.triggers) {
        if (!map[t]) map[t] = {};
        map[t][c.emotion] = (map[t][c.emotion] ?? 0) + 1;
      }
    }
    const total  = checkIns.length;
    const results: { label: string; value: number; color: string }[] = [];
    for (const [trigger, emos] of Object.entries(map)) {
      const top = Object.entries(emos).sort((a, b) => b[1] - a[1])[0];
      if (!top) continue;
      const [emoId, count] = top;
      const trigTotal = Object.values(emos).reduce((a, b) => a + b, 0);
      const lift = (count / Math.max(trigTotal, 1)) / Math.max((globalEmo[emoId] ?? 0) / total, 0.01);
      results.push({
        label: `${trigger} → ${getEmotion(emoId as EmotionId).label}`,
        value: Math.min(0.95, Math.max(0.35, 0.4 + (lift - 1) * 0.22)),
        color: getEmotion(emoId as EmotionId).color,
      });
    }
    return results.sort((a, b) => b.value - a.value).slice(0, 4);
  }, [checkIns]);

  const insight = useMemo(() => {
    if (checkIns.length < 5) return null;
    const byDow: Record<number, number[]> = {};
    for (const c of checkIns) {
      const dow = new Date(c.createdAt).getDay();
      (byDow[dow] = byDow[dow] ?? []).push(c.intensity);
    }
    const avgs = Object.entries(byDow)
      .map(([d, vals]) => ({ d: +d, avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length }))
      .filter(x => x.n >= 2).sort((a, b) => a.avg - b.avg);
    if (avgs.length >= 2) {
      const worst = avgs[0], best = avgs[avgs.length - 1];
      const pct = Math.round(((best.avg - worst.avg) / Math.max(best.avg, 0.01)) * 100);
      return `${DOW_FULL[worst.d]}s tend to be harder — mood is ${pct}% lower than on ${DOW_FULL[best.d]}s`;
    }
    if (stats?.topEmotion) return `Your most frequent emotion lately is ${getEmotion(stats.topEmotion).label}`;
    return null;
  }, [checkIns, stats]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        <View style={s.header}>
          <Text style={s.title}>patterns</Text>
          <Text style={s.sub}>last 10 weeks</Text>
        </View>

        {/* Heatmap */}
        <View style={s.card}>
          <Text style={s.label}>mood calendar</Text>
          <View style={s.heatRow}>
            {DOW_SHORT.map((d, i) => <Text key={i} style={s.heatDayLabel}>{d}</Text>)}
          </View>
          {heatGrid.map((week, wi) => (
            <View key={wi} style={s.heatRow}>
              {week.map((avg, di) => (
                <View key={di} style={[s.heatCell, { backgroundColor: intensityToColor(avg) }]} />
              ))}
            </View>
          ))}
          <View style={s.legendRow}>
            <Text style={s.legendLabel}>less</Text>
            {[undefined, 2, 4, 6, 8, 10].map((v, i) => (
              <View key={i} style={[s.legendCell, { backgroundColor: intensityToColor(v) }]} />
            ))}
            <Text style={s.legendLabel}>more</Text>
          </View>
        </View>

        {/* Insight */}
        {insight && (
          <View style={[s.card, s.callout]}>
            <Text style={s.calloutBadge}>veil notices</Text>
            <Text style={s.calloutText}>{insight}</Text>
          </View>
        )}

        {/* Correlations */}
        <View style={s.card}>
          <Text style={s.label}>{correlations.length > 0 ? 'your patterns' : 'correlations'}</Text>
          {correlations.length > 0 ? correlations.map(c => (
            <View key={c.label} style={s.corrRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.corrLabel}>{c.label}</Text>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${Math.round(c.value * 100)}%` as any, backgroundColor: c.color }]} />
                </View>
              </View>
              <Text style={[s.corrVal, { color: c.color }]}>{Math.round(c.value * 100)}%</Text>
            </View>
          )) : (
            <Text style={s.corrEmpty}>Add check-ins with triggers to see your personal patterns here</Text>
          )}
        </View>

        {/* Stats 2×2 */}
        {stats && (
          <View style={s.statsGrid}>
            {[
              { label: 'total entries', val: String(stats.totalEntries) },
              { label: 'day streak',    val: String(stats.streak) },
              { label: 'avg intensity', val: stats.averageIntensity > 0 ? `${stats.averageIntensity}/10` : '—' },
              { label: 'top emotion',   val: stats.topEmotion ? getEmotion(stats.topEmotion).label : '—' },
            ].map(item => (
              <View key={item.label} style={s.statCard}>
                <Text style={s.statLabel}>{item.label}</Text>
                <Text style={s.statVal}>{item.val}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { paddingHorizontal: 20, paddingBottom: 32 },
  header:       { paddingTop: 24, paddingBottom: 16 },
  title:        { fontSize: 26, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
  sub:          { fontSize: 14, color: COLORS.textDim, marginTop: 4 },
  label:        { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 },
  card:         { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 0.5, borderColor: COLORS.border, padding: 18, marginBottom: 14 },
  // Heatmap
  heatRow:      { flexDirection: 'row', gap: 5, marginBottom: 5 },
  heatDayLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: '500' },
  heatCell:     { flex: 1, aspectRatio: 1, borderRadius: 4 },
  legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginHorizontal: 3 },
  legendCell:   { width: 11, height: 11, borderRadius: 3 },
  // Callout
  callout:      { borderLeftWidth: 2, borderLeftColor: COLORS.accent, paddingLeft: 16 },
  calloutBadge: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  calloutText:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  // Correlations
  corrRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  corrLabel:    { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 7 },
  track:        { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill:         { height: '100%', borderRadius: 2 },
  corrVal:      { fontSize: 14, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  corrEmpty:    { fontSize: 14, color: COLORS.textMuted, lineHeight: 22 },
  // Stats
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:     { width: '47.5%', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border, padding: 16 },
  statLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  statVal:      { fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
});
