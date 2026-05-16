import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, LayoutChangeEvent,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, runOnJS,
  withSpring, withTiming, interpolate,
} from 'react-native-reanimated';
import PlutchikWheel from '../../src/components/PlutchikWheel';
import { FadeScreen } from '../../src/components/FadeScreen';
import { TRIGGERS, getEmotion, getEmotionLabel } from '../../src/constants/emotions';
import { useVeilStore } from '../../src/store/useStore';
import { TRANSLATIONS } from '../../src/i18n/translations';
import type { EmotionId, TriggerId } from '../../src/types';

function PressBtn({ onPress, style, textStyle, label, disabled = false }: {
  onPress: () => void; style: any; textStyle: any; label: string; disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 20, stiffness: 300, mass: 0.7 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 18, stiffness: 260, mass: 0.7 }); }}
      onPress={onPress} disabled={disabled}
    >
      <Animated.View style={[style, anim]}>
        <Text style={textStyle}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function AnimChip({ active, onPress, label, t }: {
  active: boolean; onPress: () => void; label: string; t: any;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 22, stiffness: 380, mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 300, mass: 0.5 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
          backgroundColor: active ? t.chipActive : t.chip,
          borderColor:     active ? t.chipBorderActive : t.border,
        }, anim,
      ]}>
        <Text style={{ fontSize: 14, color: active ? t.chipTextActive : t.textMuted }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────
const THUMB = 28, HALF = 14, TRACK_H = 5;
function calcX(v: number, w: number)   { 'worklet'; return HALF + ((v - 1) / 9) * (w - THUMB); }
function calcVal(x: number, w: number) { 'worklet'; return Math.round(Math.min(10, Math.max(1, 1 + ((x - HALF) / Math.max(w - THUMB, 1)) * 9))); }
function clampX(x: number, w: number)  { 'worklet'; return Math.min(Math.max(x, HALF), w - HALF); }

function IntensitySlider({ value, onChange, color, t }: {
  value: number; onChange: (v: number) => void; color: string; t: any;
}) {
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
    <View style={{ paddingTop: 32, paddingBottom: 4 }}>
      <Animated.View style={[sl.badge, badgeStyle, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[sl.badgeText, { color }]}>{value}/10</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <View style={sl.hitArea} onLayout={onLayout}>
          <View style={[sl.trackBg, { backgroundColor: t.border }]} />
          <Animated.View style={[sl.trackFill, fillStyle, { backgroundColor: color }]} />
          <Animated.View style={[sl.thumb, thumbStyle, { backgroundColor: color, shadowColor: color }]}>
            <View style={[sl.thumbDot, { backgroundColor: t.textOnAccent + '66' }]} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={sl.dots}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[sl.dot, { backgroundColor: i < value ? color + '90' : t.border }]} />
        ))}
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  hitArea:   { height: 44, justifyContent: 'center', position: 'relative' },
  trackBg:   { position: 'absolute', left: HALF, right: HALF, height: TRACK_H, borderRadius: 3 },
  trackFill: { position: 'absolute', left: HALF, top: '50%', marginTop: -(TRACK_H / 2), height: TRACK_H, borderRadius: 3 },
  thumb:     { position: 'absolute', top: '50%', marginTop: -HALF, width: THUMB, height: THUMB, borderRadius: HALF, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 6 },
  thumbDot:  { width: 9, height: 9, borderRadius: 5 },
  badge:     { position: 'absolute', top: 0, width: 36, alignItems: 'center', paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dots:      { flexDirection: 'row', marginHorizontal: HALF, marginTop: 8, gap: 3 },
  dot:       { flex: 1, height: 3, borderRadius: 2 },
});

// ── Weekly digest ─────────────────────────────────────────────────────────────
function isSameWeek(dateStr: string, now: Date) {
  const d = new Date(dateStr), sw = new Date(now);
  sw.setDate(now.getDate() - now.getDay()); sw.setHours(0, 0, 0, 0);
  return d >= sw;
}

function WeeklyDigest({ checkIns, t, lang }: { checkIns: any[]; t: any; lang: string }) {
  const tr   = TRANSLATIONS[lang as 'en' | 'ru'].checkin;
  const now  = new Date();
  const week = checkIns.filter(c => isSameWeek(c.createdAt, now));
  if (week.length < 2) return null;
  const avg = Math.round((week.reduce((s: number, c: any) => s + c.intensity, 0) / week.length) * 10) / 10;
  const emoCounts: Record<string, number> = {};
  for (const c of week) emoCounts[c.emotion] = (emoCounts[c.emotion] ?? 0) + 1;
  const topEmoId = Object.entries(emoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionId | undefined;
  const topEmo   = topEmoId ? getEmotion(topEmoId) : null;
  const label    = avg >= 7 ? tr.greatWeek : avg >= 5 ? tr.solidWeek : tr.toughWeek;
  return (
    <View style={[wd.card, { backgroundColor: t.accentDim, borderColor: t.chipBorderActive }]}>
      <View style={wd.row}>
        <Text style={[wd.weekLabel, { color: t.textDim }]}>{tr.weekLabel}</Text>
        <Text style={[wd.moodLabel, { color: t.accent }]}>{label}</Text>
        <View style={[wd.divider, { backgroundColor: t.border }]} />
        <Text style={[wd.val, { color: t.accent }]}>{avg}/10</Text>
        <Text style={[wd.sub, { color: t.textDim }]}>{tr.avg}</Text>
        {topEmo && (<>
          <View style={[wd.divider, { backgroundColor: t.border }]} />
          <Text style={[wd.val, { color: topEmo.color }]}>
            {getEmotionLabel(topEmo.id, lang as 'en' | 'ru')}
          </Text>
          <Text style={[wd.sub, { color: t.textDim }]}>{tr.felt}</Text>
        </>)}
      </View>
    </View>
  );
}
const wd = StyleSheet.create({
  card:      { marginHorizontal: 20, marginBottom: 4, borderRadius: 14, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.05, textTransform: 'uppercase' },
  moodLabel: { fontSize: 12, flex: 1 },
  divider:   { width: 0.5, height: 20 },
  val:       { fontSize: 15, fontWeight: '600' },
  sub:       { fontSize: 10 },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const { addCheckIn, checkIns, t, lang } = useVeilStore(s => ({
    addCheckIn: s.addCheckIn, checkIns: s.checkIns, t: s.theme, lang: s.lang,
  }));
  const tr = TRANSLATIONS[lang].checkin;
  const trTriggers = TRANSLATIONS[lang].triggers;

  const [step, setStep]           = useState<1 | 2>(1);
  const [sel, setSel]             = useState<EmotionId | null>(null);
  const [intensity, setInt]       = useState(5);
  const [trigs, setTrigs]         = useState<TriggerId[]>([]);
  const [otherActive, setOther]   = useState(false);
  const [otherText, setOtherText] = useState('');
  const [note, setNote]           = useState('');
  const [saved, setSaved]         = useState(false);

  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const transitionTo = (nextStep: 1 | 2) => {
    RNAnimated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const otherAnim = useSharedValue(0);
  useEffect(() => {
    otherAnim.value = withSpring(otherActive ? 1 : 0, { damping: 20, stiffness: 260, mass: 0.6 });
  }, [otherActive]);
  const otherStyle = useAnimatedStyle(() => ({
    opacity:   otherAnim.value,
    transform: [{ translateY: interpolate(otherAnim.value, [0, 1], [-8, 0]) }],
  }));

  const toggle = (id: TriggerId) =>
    setTrigs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const reset = () => {
    setSel(null); setInt(5); setTrigs([]); setOther(false); setOtherText(''); setNote('');
  };

  const save = async () => {
    if (!sel) { Alert.alert(tr.chooseEmotion, tr.chooseTip); return; }
    const parts = [otherActive && otherText ? `#${otherText}` : '', note].filter(Boolean);
    await addCheckIn(sel, intensity, trigs, parts.join(' · ').trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); reset(); transitionTo(1); }, 1400);
  };

  const emo      = sel ? getEmotion(sel) : null;
  const btnColor = saved ? t.teal : emo?.color ?? t.accent;

  // Date locale
  const dateLocale = lang === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <RNAnimated.View style={[s.fill, { opacity: fadeAnim }]}>

          {step === 1 && (
            <View style={s.fill}>
              <View style={s.header}>
                <View>
                  <Text style={[s.title, { color: t.text }]}>{tr.title}</Text>
                  <Text style={[s.sub, { color: t.textDim }]}>
                    {new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
                <View style={[s.logo, { backgroundColor: t.accentDim, borderColor: t.chipBorderActive }]}>
                  <Text style={{ fontSize: 16, color: t.accent }}>◎</Text>
                </View>
              </View>

              <WeeklyDigest checkIns={checkIns} t={t} lang={lang} />

              <View style={s.wheelWrap}>
                <PlutchikWheel selected={sel} onSelect={setSel} size={250} />
              </View>

              <View style={s.sliderWrap}>
                <Text style={[s.label, { color: t.textDim }]}>{tr.intensity}</Text>
                <IntensitySlider value={intensity} onChange={setInt} color={emo?.color ?? t.accent} t={t} />
              </View>

              <View style={s.footer}>
                <PressBtn
                  onPress={() => { if (!sel) { Alert.alert(tr.chooseEmotion); return; } transitionTo(2); }}
                  style={[s.btn, { backgroundColor: emo?.color ?? t.accent, opacity: sel ? 1 : 0.4 }]}
                  textStyle={[s.btnText, { color: t.textOnAccent }]}
                  label={tr.next} disabled={!sel}
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={s.fill}>
              <View style={s.header}>
                <Pressable onPress={() => transitionTo(1)}
                  style={({ pressed }) => [s.backBtn, { backgroundColor: t.chip, opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[s.backText, { color: t.textMuted }]}>←</Text>
                </Pressable>
                <View style={s.stepDots}>
                  <View style={[s.stepDot, { backgroundColor: t.textDim }]} />
                  <View style={[s.stepDot, { backgroundColor: emo?.color ?? t.accent }]} />
                </View>
                <View style={[s.emoChip, {
                  backgroundColor: (emo?.color ?? t.accent) + '22',
                  borderColor:     (emo?.color ?? t.accent) + '55',
                }]}>
                  <Text style={[s.emoChipText, { color: emo?.color ?? t.accent }]}>
                    {emo ? getEmotionLabel(emo.id, lang) : ''}  ·  {intensity}/10
                  </Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={[s.label, { color: t.textDim }]}>{tr.whatTriggered}</Text>
                <View style={s.chips}>
                  {TRIGGERS.map(tr2 => (
                    <AnimChip key={tr2.id} active={trigs.includes(tr2.id)}
                      onPress={() => toggle(tr2.id)}
                      label={trTriggers[tr2.id]} t={t} />
                  ))}
                  <AnimChip
                    active={otherActive}
                    onPress={() => { setOther(o => !o); if (otherActive) setOtherText(''); }}
                    label={otherActive && otherText ? otherText : tr.otherChip}
                    t={t}
                  />
                </View>
                {otherActive && (
                  <Animated.View style={otherStyle}>
                    <TextInput
                      value={otherText} onChangeText={setOtherText}
                      placeholder={tr.otherPlaceholder}
                      placeholderTextColor={t.textDim}
                      style={[s.otherInput, { backgroundColor: t.input, borderColor: t.accent + '66', color: t.text }]}
                      autoFocus maxLength={40}
                    />
                  </Animated.View>
                )}
              </View>

              <View style={s.section}>
                <Text style={[s.label, { color: t.textDim }]}>{tr.note}</Text>
                <TextInput
                  value={note} onChangeText={setNote}
                  placeholder={tr.notePlaceholder}
                  placeholderTextColor={t.textDim}
                  multiline numberOfLines={4}
                  style={[s.noteInput, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
                />
              </View>

              <View style={s.footer}>
                <PressBtn
                  onPress={save}
                  style={[s.btn, { backgroundColor: btnColor }]}
                  textStyle={[s.btnText, { color: t.textOnAccent }]}
                  label={saved ? tr.saved : tr.liftTheVeil}
                />
              </View>
            </View>
          )}

        </RNAnimated.View>
      </SafeAreaView>
    </FadeScreen>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  fill:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
  sub:         { fontSize: 13, marginTop: 3 },
  logo:        { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wheelWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sliderWrap:  { paddingHorizontal: 20, paddingBottom: 8 },
  footer:      { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  btn:         { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText:     { fontSize: 16, fontWeight: '600' },
  label:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 18 },
  stepDots:    { flexDirection: 'row', gap: 7, alignItems: 'center' },
  stepDot:     { width: 7, height: 7, borderRadius: 4 },
  emoChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  emoChipText: { fontSize: 13, fontWeight: '600' },
  section:     { paddingHorizontal: 20, marginTop: 20 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  otherInput:  { marginTop: 12, borderWidth: 1, borderRadius: 12, fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  noteInput:   { borderWidth: 1, borderRadius: 14, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12, lineHeight: 22, textAlignVertical: 'top', minHeight: 90 },
});
