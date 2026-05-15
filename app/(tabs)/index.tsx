import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import PlutchikWheel from '../../src/components/PlutchikWheel';
import { TRIGGERS, COLORS, getEmotion } from '../../src/constants/emotions';
import { useVeilStore } from '../../src/store/useStore';
import type { EmotionId, TriggerId } from '../../src/types';

// ── Intensity Slider ──────────────────────────────────────────────────────────
const THUMB = 28, HALF = 14, TRACK_H = 5;
function calcX(v: number, w: number)   { 'worklet'; return HALF + ((v - 1) / 9) * (w - THUMB); }
function calcVal(x: number, w: number) { 'worklet'; return Math.round(Math.min(10, Math.max(1, 1 + ((x - HALF) / Math.max(w - THUMB, 1)) * 9))); }
function clampX(x: number, w: number)  { 'worklet'; return Math.min(Math.max(x, HALF), w - HALF); }

function IntensitySlider({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  const trackW = useSharedValue(1);
  const posX   = useSharedValue(HALF);

  useEffect(() => {
    if (trackW.value > 1)
      posX.value = withSpring(calcX(value, trackW.value), { damping: 22, stiffness: 380, mass: 0.5 });
  }, [value]);

  const onLayout = (ev: LayoutChangeEvent) => {
    const w = ev.nativeEvent.layout.width;
    trackW.value = w; posX.value = calcX(value, w);
  };

  const thumbStyle = useAnimatedStyle(() => ({ left: posX.value - HALF }));
  const fillStyle  = useAnimatedStyle(() => ({ width: Math.max(0, posX.value - HALF) }));
  const badgeStyle = useAnimatedStyle(() => ({ left: posX.value - 18 }));

  const gesture = Gesture.Pan()
    .activeOffsetX([-4, 4]).failOffsetY([-15, 15])
    .onBegin(e => { const x = clampX(e.x, trackW.value); posX.value = x; runOnJS(onChange)(calcVal(x, trackW.value)); })
    .onChange(e => { const x = clampX(e.x, trackW.value); posX.value = x; runOnJS(onChange)(calcVal(x, trackW.value)); })
    .onEnd(() => {
      const snap = calcVal(posX.value, trackW.value);
      posX.value = withSpring(calcX(snap, trackW.value), { damping: 22, stiffness: 380, mass: 0.5 });
      runOnJS(onChange)(snap);
    });

  return (
    <View style={sl.root}>
      <Animated.View style={[sl.badge, badgeStyle, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[sl.badgeText, { color }]}>{value}/10</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <View style={sl.hitArea} onLayout={onLayout}>
          <View style={sl.trackBg} />
          <Animated.View style={[sl.trackFill, fillStyle, { backgroundColor: color }]} />
          <Animated.View style={[sl.thumb, thumbStyle, { backgroundColor: color, shadowColor: color }]}>
            <View style={sl.thumbDot} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={sl.dots}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[sl.dot, { backgroundColor: i < value ? color + '90' : 'rgba(255,255,255,0.12)' }]} />
        ))}
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  root:      { paddingTop: 32, paddingBottom: 4 },
  hitArea:   { height: 44, justifyContent: 'center', position: 'relative' },
  trackBg:   { position: 'absolute', left: HALF, right: HALF, height: TRACK_H, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  trackFill: { position: 'absolute', left: HALF, top: '50%', marginTop: -(TRACK_H / 2), height: TRACK_H, borderRadius: 3 },
  thumb:     { position: 'absolute', top: '50%', marginTop: -HALF, width: THUMB, height: THUMB, borderRadius: HALF, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 6 },
  thumbDot:  { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.4)' },
  badge:     { position: 'absolute', top: 0, width: 36, alignItems: 'center', paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dots:      { flexDirection: 'row', marginHorizontal: HALF, marginTop: 8, gap: 3 },
  dot:       { flex: 1, height: 3, borderRadius: 2 },
});

// ── Weekly Digest ─────────────────────────────────────────────────────────────
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function isSameWeek(dateStr: string, now: Date) {
  const d = new Date(dateStr), sw = new Date(now);
  sw.setDate(now.getDate() - now.getDay()); sw.setHours(0, 0, 0, 0);
  return d >= sw;
}
function WeeklyDigest({ checkIns }: { checkIns: any[] }) {
  const now  = new Date();
  const week = checkIns.filter(c => isSameWeek(c.createdAt, now));
  if (week.length < 2) return null;
  const avg = Math.round((week.reduce((s: number, c: any) => s + c.intensity, 0) / week.length) * 10) / 10;
  const emoCounts: Record<string, number> = {};
  for (const c of week) emoCounts[c.emotion] = (emoCounts[c.emotion] ?? 0) + 1;
  const topEmoId = Object.entries(emoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionId | undefined;
  const topEmo   = topEmoId ? getEmotion(topEmoId) : null;
  const label    = avg >= 7 ? 'great week ✨' : avg >= 5 ? 'solid week' : 'tough week';
  return (
    <View style={wd.card}>
      <View style={wd.row}>
        <Text style={wd.weekLabel}>this week</Text>
        <Text style={wd.moodLabel}>{label}</Text>
        <View style={wd.divider} />
        <Text style={[wd.val, { color: COLORS.accent }]}>{avg}/10</Text>
        <Text style={wd.sub}>avg</Text>
        {topEmo && (<><View style={wd.divider} /><Text style={[wd.val, { color: topEmo.color }]}>{topEmo.label}</Text><Text style={wd.sub}>felt</Text></>)}
      </View>
    </View>
  );
}
const wd = StyleSheet.create({
  card:      { marginHorizontal: 20, marginBottom: 4, backgroundColor: 'rgba(139,124,248,0.08)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(139,124,248,0.2)', paddingHorizontal: 16, paddingVertical: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.05, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' },
  moodLabel: { fontSize: 12, color: COLORS.accent, flex: 1 },
  divider:   { width: 0.5, height: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  val:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sub:       { fontSize: 10, color: COLORS.textDim },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const { addCheckIn, checkIns } = useVeilStore(s => ({ addCheckIn: s.addCheckIn, checkIns: s.checkIns }));
  const [step, setStep]           = useState<1 | 2>(1);
  const [sel, setSel]             = useState<EmotionId | null>(null);
  const [intensity, setInt]       = useState(5);
  const [trigs, setTrigs]         = useState<TriggerId[]>([]);
  const [otherActive, setOther]   = useState(false);
  const [otherText, setOtherText] = useState('');
  const [note, setNote]           = useState('');
  const [saved, setSaved]         = useState(false);

  const toggle = (id: TriggerId) =>
    setTrigs(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id]);

  const reset = () => {
    setSel(null); setInt(5); setTrigs([]); setOther(false);
    setOtherText(''); setNote(''); setStep(1);
  };

  const save = async () => {
    if (!sel) { Alert.alert('Choose an emotion', 'Tap a segment on the wheel first.'); return; }
    const parts = [otherActive && otherText ? `#${otherText}` : '', note].filter(Boolean);
    await addCheckIn(sel, intensity, trigs, parts.join(' · ').trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); reset(); }, 1400);
  };

  const emo      = sel ? getEmotion(sel) : null;
  const btnColor = saved ? COLORS.teal : emo?.color ?? COLORS.accent;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <View style={s.fill}>
          <View style={s.header}>
            <View>
              <Text style={s.title}>how are you feeling?</Text>
              <Text style={s.sub}>
                {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <View style={s.logo}>
              <Text style={{ fontSize: 16, color: COLORS.accent }}>◎</Text>
            </View>
          </View>

          <WeeklyDigest checkIns={checkIns} />

          <View style={s.wheelWrap}>
            <PlutchikWheel selected={sel} onSelect={setSel} size={250} />
          </View>

          <View style={s.sliderWrap}>
            <Text style={s.label}>intensity</Text>
            <IntensitySlider value={intensity} onChange={setInt} color={emo?.color ?? COLORS.accent} />
          </View>

          <View style={s.footer}>
            <TouchableOpacity
              onPress={() => { if (!sel) { Alert.alert('Choose an emotion'); return; } setStep(2); }}
              activeOpacity={0.85}
              style={[s.btn, { backgroundColor: emo?.color ?? COLORS.accent, opacity: sel ? 1 : 0.4 }]}
            >
              <Text style={s.btnText}>next  →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <View style={s.fill}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn} activeOpacity={0.7}>
              <Text style={s.backText}>←</Text>
            </TouchableOpacity>
            <View style={s.stepDots}>
              <View style={[s.stepDot, { backgroundColor: COLORS.textDim }]} />
              <View style={[s.stepDot, { backgroundColor: emo?.color ?? COLORS.accent }]} />
            </View>
            <View style={[s.emoChip, {
              backgroundColor: (emo?.color ?? COLORS.accent) + '22',
              borderColor:     (emo?.color ?? COLORS.accent) + '55',
            }]}>
              <Text style={[s.emoChipText, { color: emo?.color ?? COLORS.accent }]}>
                {emo?.label ?? ''}  ·  {intensity}/10
              </Text>
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
              <TouchableOpacity
                onPress={() => { setOther(o => !o); if (otherActive) setOtherText(''); }}
                style={[s.chip, otherActive && s.chipOn]}
              >
                <Text style={[s.chipText, otherActive && s.chipTextOn]}>
                  {otherActive && otherText ? otherText : 'other +'}
                </Text>
              </TouchableOpacity>
            </View>

            {otherActive && (
              <TextInput
                value={otherText}
                onChangeText={setOtherText}
                placeholder="describe your trigger..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                style={s.otherInput}
                autoFocus
                maxLength={40}
              />
            )}
          </View>

          <View style={s.section}>
            <Text style={s.label}>note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="what's happening inside..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={4}
              style={s.noteInput}
            />
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={save} activeOpacity={0.85}
              style={[s.btn, { backgroundColor: btnColor }]}>
              <Text style={s.btnText}>{saved ? '✓  saved' : 'lift the veil'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  fill:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:         { fontSize: 13, color: COLORS.textDim, marginTop: 3 },
  logo:        { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: 'rgba(139,124,248,0.3)', alignItems: 'center', justifyContent: 'center' },
  wheelWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sliderWrap:  { paddingHorizontal: 20, paddingBottom: 8 },
  footer:      { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  btn:         { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText:     { fontSize: 16, fontWeight: '600', color: '#0d0b14' },
  label:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 },
  // Step 2
  backBtn:     { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 18, color: COLORS.textMuted },
  stepDots:    { flexDirection: 'row', gap: 7, alignItems: 'center' },
  stepDot:     { width: 7, height: 7, borderRadius: 4 },
  emoChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  emoChipText: { fontSize: 13, fontWeight: '600' },
  section:     { paddingHorizontal: 20, marginTop: 20 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipOn:      { backgroundColor: 'rgba(139,124,248,0.2)', borderColor: 'rgba(139,124,248,0.5)' },
  chipText:    { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  chipTextOn:  { color: '#c4b8ff' },
  otherInput:  { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(139,124,248,0.4)', borderRadius: 12, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  noteInput:   { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, color: COLORS.text, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12, lineHeight: 22, textAlignVertical: 'top', minHeight: 90 },
});
