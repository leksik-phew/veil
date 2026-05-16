import React, { useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import { getEmotion, getEmotionLabel } from '../../src/constants/emotions';
import { TRANSLATIONS } from '../../src/i18n/translations';
import { buildNeuralPatterns, getPatternModelVersion, voicePatternIntensity } from '../../src/engine/patternModel';
import type { EmotionId } from '../../src/types';

const DOW_SHORT_EN = ['M','T','W','T','F','S','S'];
const DOW_SHORT_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// Heatmap cell color — accent/red gradient works on both light and dark bg
function intensityToColor(avg: number | undefined, accent: string): string {
  if (avg === undefined) return 'rgba(128,128,128,0.12)';
  if (avg >= 8) return accent;
  if (avg >= 6) return accent + 'bb';
  if (avg >= 4) return accent + '70';
  if (avg >= 2) return '#FF6B6B55';
  return '#FF6B6B28';
}

function buildGrid(data: { day: string; avg: number }[], weeks = 10): (number | undefined)[][] {
  const map: Record<string, number> = {};
  for (const d of data) map[d.day] = d.avg;
  const today = new Date(), dow = (today.getDay() + 6) % 7;
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

function buildDailyMood(data: { createdAt: string; intensity: number }[]): { day: string; avg: number }[] {
  const byDay: Record<string, number[]> = {};
  for (const e of data) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    (byDay[day] = byDay[day] ?? []).push(e.intensity);
  }
  return Object.entries(byDay)
    .map(([day, vals]) => ({ day, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function AnimatedBar({ value, color, trackColor, delay = 0 }: {
  value: number; color: string; trackColor: string; delay?: number;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(value * 100, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [value]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={[ab.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[ab.fill, style, { backgroundColor: color }]} />
    </View>
  );
}
const ab = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
});

export default function InsightsScreen() {
  const { checkIns, voiceEntries, t, lang } = useVeilStore(s => ({
    checkIns: s.checkIns, voiceEntries: s.voiceEntries, t: s.theme, lang: s.lang,
  }));
  const tr = TRANSLATIONS[lang].insights;

  // Localised day headers for heatmap
  const DOW_SHORT = lang === 'ru' ? DOW_SHORT_RU : DOW_SHORT_EN;

  // Localised day-of-week names
  const DOW_FULL = lang === 'ru'
    ? ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']
    : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const moodEntries = useMemo(() => [
    ...checkIns.map(e => ({ createdAt: e.createdAt, intensity: e.intensity, emotion: e.emotion })),
    ...voiceEntries.map(e => ({ createdAt: e.createdAt, intensity: voicePatternIntensity(e), emotion: e.detectedEmotion })),
  ], [checkIns, voiceEntries]);

  const combinedStats = useMemo(() => {
    const emoCounts: Record<string, number> = {};
    for (const e of moodEntries) emoCounts[e.emotion] = (emoCounts[e.emotion] ?? 0) + 1;
    const topEmotion = Object.entries(emoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionId | undefined;
    const lastWeek = moodEntries.filter(e => Date.now() - new Date(e.createdAt).getTime() <= 7 * 86400000);
    const avg = lastWeek.reduce((s, e) => s + e.intensity, 0) / Math.max(lastWeek.length, 1);
    const days = Array.from(new Set(moodEntries.map(e => new Date(e.createdAt).toISOString().slice(0, 10)))).sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < days.length; i++) {
      const exp = new Date(today); exp.setDate(today.getDate() - i);
      if (days[i] === exp.toISOString().slice(0, 10)) streak++;
      else break;
    }
    return { totalEntries: moodEntries.length, streak, averageIntensity: Math.round(avg * 10) / 10, topEmotion: topEmotion ?? null };
  }, [moodEntries]);

  const heatGrid = useMemo(() => buildGrid(buildDailyMood(moodEntries), 10), [moodEntries]);
  const patterns = useMemo(() => buildNeuralPatterns(checkIns, voiceEntries, 4, lang), [checkIns, voiceEntries, lang]);

  const insight = useMemo(() => {
    if (moodEntries.length < 5) return null;
    const byDow: Record<number, number[]> = {};
    for (const c of moodEntries) {
      const dow = new Date(c.createdAt).getDay();
      (byDow[dow] = byDow[dow] ?? []).push(c.intensity);
    }
    const avgs = Object.entries(byDow)
      .map(([d, vals]) => ({ d: +d, avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length }))
      .filter(x => x.n >= 2).sort((a, b) => a.avg - b.avg);
    if (avgs.length >= 2) {
      const worst = avgs[0], best = avgs[avgs.length - 1];
      const pct = Math.round(((best.avg - worst.avg) / Math.max(best.avg, 0.01)) * 100);
      if (lang === 'ru') {
        return `${DOW_FULL[worst.d]} — обычно тяжелее, настроение на ${pct}% ниже, чем в ${DOW_FULL[best.d]}`;
      }
      return `${DOW_FULL[worst.d]}s tend to be harder — mood is ${pct}% lower than on ${DOW_FULL[best.d]}s`;
    }
    if (combinedStats.topEmotion) {
      const emoName = getEmotionLabel(combinedStats.topEmotion, lang);
      return lang === 'ru'
        ? `Твоя самая частая эмоция: ${emoName}`
        : `Your most frequent emotion lately is ${emoName}`;
    }
  }, [moodEntries, combinedStats]);

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          <View style={s.header}>
            <Text style={[s.title, { color: t.text }]}>{tr.title}</Text>
            <Text style={[s.sub, { color: t.textDim }]}>{tr.subtitle}</Text>
          </View>

          {/* Heatmap */}
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[s.label, { color: t.textDim }]}>{tr.moodCalendar}</Text>
            <View style={s.heatRow}>
              {DOW_SHORT.map((d, i) => <Text key={i} style={[s.heatDayLabel, { color: t.textDim }]}>{d}</Text>)}
            </View>
            {heatGrid.map((week, wi) => (
              <View key={wi} style={s.heatRow}>
                {week.map((avg, di) => (
                  <View key={di} style={[s.heatCell, { backgroundColor: intensityToColor(avg, t.accent) }]} />
                ))}
              </View>
            ))}
            <View style={s.legendRow}>
              <Text style={[s.legendLabel, { color: t.textDim }]}>{tr.less}</Text>
              {[undefined, 2, 4, 6, 8, 10].map((v, i) => (
                <View key={i} style={[s.legendCell, { backgroundColor: intensityToColor(v, t.accent) }]} />
              ))}
              <Text style={[s.legendLabel, { color: t.textDim }]}>{tr.more}</Text>
            </View>
          </View>

          {/* Insight */}
          {insight && (
            <View style={[s.card, s.callout, { backgroundColor: t.card, borderColor: t.border, borderLeftColor: t.accent }]}>
              <Text style={[s.calloutBadge, { color: t.textMuted }]}>{tr.veilNotices}</Text>
              <Text style={[s.calloutText, { color: t.text }]}>{insight}</Text>
            </View>
          )}

          {/* ML Patterns */}
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[s.label, { color: t.textDim }]}>{tr.mlPatterns}</Text>
            {patterns.length > 0 ? patterns.map((c, i) => (
              <View key={c.label} style={s.corrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.corrLabel, { color: t.textMuted }]}>{c.label}</Text>
                  <AnimatedBar value={c.value} color={c.color} trackColor={t.border} delay={i * 120} />
                </View>
                <Text style={[s.corrVal, { color: c.color }]}>{Math.round(c.value * 100)}%</Text>
              </View>
            )) : (
              <Text style={[s.corrEmpty, { color: t.textMuted }]}>{tr.noPatterns}</Text>
            )}
            {patterns.length > 0 && (
              <Text style={[s.modelTag, { color: t.textDim }]}>{getPatternModelVersion()} · {tr.onDevice}</Text>
            )}
          </View>

          {/* Stats 2×2 */}
          <View style={s.statsGrid}>
            {[
              { label: tr.totalEntries, val: String(combinedStats.totalEntries) },
              { label: tr.dayStreak,    val: String(combinedStats.streak) },
              { label: tr.avgIntensity, val: combinedStats.averageIntensity > 0 ? `${combinedStats.averageIntensity}/10` : '—' },
              { label: tr.topEmotion,   val: combinedStats.topEmotion ? getEmotionLabel(combinedStats.topEmotion, lang) : '—' },
            ].map(item => (
              <View key={item.label} style={[s.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[s.statLabel, { color: t.textDim }]}>{item.label}</Text>
                <Text style={[s.statVal, { color: t.text }]}>{item.val}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </FadeScreen>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  content:      { paddingHorizontal: 20, paddingBottom: 32 },
  header:       { paddingTop: 24, paddingBottom: 16 },
  title:        { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  sub:          { fontSize: 14, marginTop: 4 },
  label:        { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 14 },
  card:         { borderRadius: 18, borderWidth: 0.5, padding: 18, marginBottom: 14 },
  heatRow:      { flexDirection: 'row', gap: 5, marginBottom: 5 },
  heatDayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '500' },
  heatCell:     { flex: 1, aspectRatio: 1, borderRadius: 4 },
  legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendLabel:  { fontSize: 10, marginHorizontal: 3 },
  legendCell:   { width: 11, height: 11, borderRadius: 3 },
  callout:      { borderLeftWidth: 2, paddingLeft: 16 },
  calloutBadge: { fontSize: 12, marginBottom: 6 },
  calloutText:  { fontSize: 14, lineHeight: 22 },
  corrRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  corrLabel:    { fontSize: 14, marginBottom: 7 },
  corrVal:      { fontSize: 14, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  corrEmpty:    { fontSize: 14, lineHeight: 22 },
  modelTag:     { fontSize: 11, marginTop: 2 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:     { width: '47.5%', borderRadius: 16, borderWidth: 0.5, padding: 16 },
  statLabel:    { fontSize: 12, marginBottom: 6 },
  statVal:      { fontSize: 22, fontWeight: '600' },
});
