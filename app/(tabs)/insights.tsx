import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  Easing, withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import { getEmotion, getEmotionLabel, getEmotionColorForText } from '../../src/constants/emotions';
import { TRANSLATIONS } from '../../src/i18n/translations';
import { buildNeuralPatterns, getPatternModelVersion, voicePatternIntensity } from '../../src/engine/patternModel';
import type { EmotionId, VoiceEntry } from '../../src/types';

const DOW_SHORT_EN = ['M','T','W','T','F','S','S'];
const DOW_SHORT_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// ── Heatmap helpers ──────────────────────────────────────────────────────────
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

// ── Animated bar ─────────────────────────────────────────────────────────────
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

// ── Voice Prosody Chart ───────────────────────────────────────────────────────
// Shows energy, stability, tempo as line chart over all voice recordings (chronological).
// Uses react-native-svg Path for smooth rendering on both iOS and Android.

const CHART_W = 300;
const CHART_H = 90;
const PAD_L = 6, PAD_R = 6, PAD_T = 10, PAD_B = 18; // bottom pad for x-axis labels

const PROSODY_LINES = [
  { key: 'energy',    colorDark: '#8b7cf8', colorLight: '#6c5dd3' },
  { key: 'stability', colorDark: '#4ecdc4', colorLight: '#1a9e96' },
  { key: 'tempo',     colorDark: '#FD79A8', colorLight: '#a00e50' },
] as const;

function xPos(i: number, n: number) {
  if (n < 2) return PAD_L + (CHART_W - PAD_L - PAD_R) / 2;
  return PAD_L + (i / (n - 1)) * (CHART_W - PAD_L - PAD_R);
}
function yPos(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  return PAD_T + (1 - clamped) * (CHART_H - PAD_T - PAD_B);
}

// Build a smooth polyline path
function buildPath(vals: number[]): string {
  if (vals.length < 2) return '';
  const n = vals.length;
  // Use cardinal spline for smooth curves
  let d = `M${xPos(0, n).toFixed(1)},${yPos(vals[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    // Simple cubic bezier — control points at 1/3 intervals
    const x0 = xPos(i - 1, n), y0 = yPos(vals[i - 1]);
    const x1 = xPos(i, n),     y1 = yPos(vals[i]);
    const cpx = x0 + (x1 - x0) * 0.45;
    d += ` C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

// Filled area under each line (for subtle fill)
function buildAreaPath(vals: number[]): string {
  if (vals.length < 2) return '';
  const n = vals.length;
  const baseY = yPos(0);
  let d = `M${xPos(0, n).toFixed(1)},${baseY.toFixed(1)} L${xPos(0, n).toFixed(1)},${yPos(vals[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const x0 = xPos(i - 1, n), y0 = yPos(vals[i - 1]);
    const x1 = xPos(i, n),     y1 = yPos(vals[i]);
    const cpx = x0 + (x1 - x0) * 0.45;
    d += ` C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  d += ` L${xPos(n - 1, n).toFixed(1)},${baseY.toFixed(1)} Z`;
  return d;
}

// Format x-axis label: show date for first/last + every ~5th point
function shouldShowLabel(i: number, n: number) {
  if (n <= 5) return true;
  if (i === 0 || i === n - 1) return true;
  // Show at ~25%, 50%, 75% marks
  const pct = i / (n - 1);
  return Math.abs(pct - 0.25) < 0.5 / n || Math.abs(pct - 0.5) < 0.5 / n || Math.abs(pct - 0.75) < 0.5 / n;
}

function formatDateShort(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'numeric', day: 'numeric' });
}

function VoiceProsodyChart({
  voiceEntries, t, tr, lang, isLight,
}: {
  voiceEntries: VoiceEntry[];
  t: any;
  tr: any;
  lang: string;
  isLight: boolean;
}) {
  // Store is newest-first — reverse to chronological
  const data = useMemo(() => [...voiceEntries].reverse(), [voiceEntries]);
  const n = data.length;

  const lineColors = useMemo(() =>
    PROSODY_LINES.map(l => ({ ...l, color: isLight ? l.colorLight : l.colorDark })),
    [isLight]
  );

  const labels = [
    tr.prosodyEnergy,
    tr.prosodyStability,
    tr.prosodyTempo,
  ];

  if (n < 2) {
    return (
      <Text style={{ fontSize: 13, lineHeight: 20, color: t.textMuted }}>
        {tr.voiceProsodyEmpty}
      </Text>
    );
  }

  // Rolling 7-point average for smoothing (optional — makes trends clearer)
  const smooth = (key: keyof VoiceEntry) => {
    const raw = data.map(e => (e[key] as number) ?? 0);
    // Simple 3-point moving average when n >= 5
    if (n < 5) return raw;
    return raw.map((v, i) => {
      if (i === 0 || i === n - 1) return v;
      return (raw[i - 1] + v + raw[i + 1]) / 3;
    });
  };

  const energyVals    = smooth('energy');
  const stabilityVals = smooth('stability');
  const tempoVals     = smooth('tempo');
  const allVals       = [energyVals, stabilityVals, tempoVals];

  // X-axis tick positions & labels
  const ticks = data
    .map((e, i) => ({ i, date: e.createdAt }))
    .filter(({ i }) => shouldShowLabel(i, n));

  return (
    <View>
      {/* SVG chart area */}
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        {/* Grid lines at 0.25, 0.5, 0.75 */}
        {[0.25, 0.5, 0.75].map(v => (
          <Line
            key={v}
            x1={PAD_L} y1={yPos(v)}
            x2={CHART_W - PAD_R} y2={yPos(v)}
            stroke={t.border}
            strokeWidth={0.7}
            strokeDasharray="3 4"
          />
        ))}

        {/* Area fills — very subtle */}
        {allVals.map((vals, li) => (
          <Path
            key={`area-${li}`}
            d={buildAreaPath(vals)}
            fill={lineColors[li].color}
            opacity={0.06}
          />
        ))}

        {/* Lines */}
        {allVals.map((vals, li) => (
          <Path
            key={`line-${li}`}
            d={buildPath(vals)}
            stroke={lineColors[li].color}
            strokeWidth={1.8}
            fill="none"
            opacity={0.92}
          />
        ))}

        {/* Latest-value dot */}
        {allVals.map((vals, li) => (
          <SvgCircle
            key={`dot-${li}`}
            cx={xPos(n - 1, n)}
            cy={yPos(vals[n - 1])}
            r={3.2}
            fill={lineColors[li].color}
          />
        ))}

        {/* X-axis tick marks */}
        {ticks.map(({ i }) => (
          <Line
            key={`tick-${i}`}
            x1={xPos(i, n)} y1={CHART_H - PAD_B + 2}
            x2={xPos(i, n)} y2={CHART_H - PAD_B + 5}
            stroke={t.border}
            strokeWidth={0.8}
          />
        ))}
      </Svg>

      {/* X-axis date labels — rendered as RN Text under the SVG */}
      {n >= 2 && (
        <View style={pca.xAxis}>
          {ticks.map(({ i, date }) => {
            const pct = n < 2 ? 50 : (i / (n - 1)) * 100;
            return (
              <Text
                key={i}
                style={[
                  pca.xLabel,
                  { color: t.textDim, left: `${pct}%` as any },
                ]}
              >
                {formatDateShort(date, lang)}
              </Text>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={pca.legend}>
        {lineColors.map((l, li) => (
          <View key={li} style={pca.legendItem}>
            <View style={[pca.dash, { backgroundColor: l.color }]} />
            <Text style={[pca.legendLabel, { color: t.textDim }]}>{labels[li]}</Text>
          </View>
        ))}
        <Text style={[pca.recCount, { color: t.textDim }]}>{n} rec</Text>
      </View>

      {/* Latest values row */}
      <View style={[pca.latestRow, { borderTopColor: t.border }]}>
        {(['energy', 'stability', 'tempo'] as const).map((key, li) => {
          const latest = data[n - 1]?.[key] ?? 0;
          const prev   = n > 1 ? data[n - 2]?.[key] ?? 0 : latest;
          const delta  = latest - prev;
          const arrow  = Math.abs(delta) < 0.02 ? '→' : delta > 0 ? '↑' : '↓';
          const arrowColor = Math.abs(delta) < 0.02
            ? t.textDim
            : delta > 0 ? '#6BCB77' : '#FF6B6B';
          return (
            <View key={key} style={pca.latestItem}>
              <Text style={[pca.latestLabel, { color: t.textDim }]}>{labels[li]}</Text>
              <View style={pca.latestValueRow}>
                <Text style={[pca.latestValue, { color: lineColors[li].color }]}>
                  {Math.round(latest * 100)}%
                </Text>
                <Text style={[pca.latestArrow, { color: arrowColor }]}>{arrow}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const pca = StyleSheet.create({
  xAxis:         { position: 'relative', height: 14, marginTop: -2 },
  xLabel:        { position: 'absolute', fontSize: 8, transform: [{ translateX: -10 }] },
  legend:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dash:          { width: 14, height: 2, borderRadius: 1 },
  legendLabel:   { fontSize: 10 },
  recCount:      { marginLeft: 'auto', fontSize: 10 },
  latestRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5 },
  latestItem:    { flex: 1, alignItems: 'center', gap: 3 },
  latestLabel:   { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.05 },
  latestValueRow:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  latestValue:   { fontSize: 15, fontWeight: '600' },
  latestArrow:   { fontSize: 12, fontWeight: '700' },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const { checkIns, voiceEntries, t, lang } = useVeilStore(s => ({
    checkIns: s.checkIns, voiceEntries: s.voiceEntries, t: s.theme, lang: s.lang,
  }));
  const tr = TRANSLATIONS[lang].insights;
  const isLight = useVeilStore(s => s.themeMode === 'light');

  const DOW_SHORT = lang === 'ru' ? DOW_SHORT_RU : DOW_SHORT_EN;
  const DOW_FULL  = lang === 'ru'
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
      if (lang === 'ru')
        return `${DOW_FULL[worst.d]} — обычно тяжелее, настроение на ${pct}% ниже, чем в ${DOW_FULL[best.d]}`;
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

          {/* ── Mood Calendar ── */}
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

          {/* ── Veil Notices ── */}
          {insight && (
            <View style={[s.card, s.callout, { backgroundColor: t.card, borderColor: t.border, borderLeftColor: t.accent }]}>
              <Text style={[s.calloutBadge, { color: t.textMuted }]}>{tr.veilNotices}</Text>
              <Text style={[s.calloutText, { color: t.text }]}>{insight}</Text>
            </View>
          )}

          {/* ── ML Patterns ── */}
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[s.label, { color: t.textDim }]}>{tr.mlPatterns}</Text>
            {patterns.length > 0 ? patterns.map((c, i) => (
              <View key={c.label} style={s.corrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.corrLabel, { color: t.textMuted }]}>{c.label}</Text>
                  <AnimatedBar value={c.value} color={c.color} trackColor={t.border} delay={i * 120} />
                </View>
                <Text style={[s.corrVal, { color: getEmotionColorForText(c.emotion, isLight) }]}>
                  {Math.round(c.value * 100)}%
                </Text>
              </View>
            )) : (
              <Text style={[s.corrEmpty, { color: t.textMuted }]}>{tr.noPatterns}</Text>
            )}
            {patterns.length > 0 && (
              <Text style={[s.modelTag, { color: t.textDim }]}>{getPatternModelVersion()} · {tr.onDevice}</Text>
            )}
          </View>

          {/* ── Voice Prosody Trends ── */}
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={s.prosodyHeader}>
              <View>
                <Text style={[s.label, { color: t.textDim, marginBottom: 2 }]}>{tr.voiceProsody}</Text>
                <Text style={[s.prosodySub, { color: t.textDim }]}>{tr.voiceProsodySub}</Text>
              </View>
              {/* Entry count badge */}
              {voiceEntries.length > 0 && (
                <View style={[s.prosodyBadge, { backgroundColor: t.accentDim, borderColor: t.chipBorderActive }]}>
                  <Text style={[s.prosodyBadgeText, { color: t.accent }]}>
                    {voiceEntries.length}
                  </Text>
                </View>
              )}
            </View>
            <VoiceProsodyChart
              voiceEntries={voiceEntries}
              t={t}
              tr={tr}
              lang={lang}
              isLight={isLight}
            />
          </View>

          {/* ── Stats 2×2 ── */}
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
  safe:          { flex: 1 },
  content:       { paddingHorizontal: 20, paddingBottom: 32 },
  header:        { paddingTop: 24, paddingBottom: 16 },
  title:         { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  sub:           { fontSize: 14, marginTop: 4 },
  label:         { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 14 },
  card:          { borderRadius: 18, borderWidth: 0.5, padding: 18, marginBottom: 14 },
  heatRow:       { flexDirection: 'row', gap: 5, marginBottom: 5 },
  heatDayLabel:  { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '500' },
  heatCell:      { flex: 1, aspectRatio: 1, borderRadius: 4 },
  legendRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendLabel:   { fontSize: 10, marginHorizontal: 3 },
  legendCell:    { width: 11, height: 11, borderRadius: 3 },
  callout:       { borderLeftWidth: 2, paddingLeft: 16 },
  calloutBadge:  { fontSize: 12, marginBottom: 6 },
  calloutText:   { fontSize: 14, lineHeight: 22 },
  corrRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  corrLabel:     { fontSize: 14, marginBottom: 7 },
  corrVal:       { fontSize: 14, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  corrEmpty:     { fontSize: 14, lineHeight: 22 },
  modelTag:      { fontSize: 11, marginTop: 2 },
  // Prosody section
  prosodyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  prosodySub:    { fontSize: 11, marginBottom: 12 },
  prosodyBadge:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  prosodyBadgeText: { fontSize: 11, fontWeight: '600' },
  // Stats grid
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:      { width: '47.5%', borderRadius: 16, borderWidth: 0.5, padding: 16 },
  statLabel:     { fontSize: 12, marginBottom: 6 },
  statVal:       { fontSize: 22, fontWeight: '600' },
});
