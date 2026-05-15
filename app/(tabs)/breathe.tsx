import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolateColor, Easing,
} from 'react-native-reanimated';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'done';

const PHASES = [
  { id: 'inhale' as const, duration: 4 },
  { id: 'hold'   as const, duration: 7 },
  { id: 'exhale' as const, duration: 8 },
  { id: 'pause'  as const, duration: 2 },
];

const PHASE_IDX: Record<Phase, number> = {
  idle: 0, inhale: 1, hold: 2, exhale: 3, pause: 4, done: 5,
};
const IDX_INPUT   = [0, 1, 2, 3, 4, 5];
const RING_COLORS = [
  'rgba(78,205,196,0.35)',
  '#4ecdc4', '#FFD93D', '#8b7cf8',
  'rgba(180,180,180,0.4)', '#6BCB77',
];

const PRACTICES = [
  { name: '5-4-3-2-1 grounding',    desc: '5 things you can see...' },
  { name: 'progressive relaxation', desc: 'tension and release of muscle groups' },
  { name: 'body scan meditation',   desc: 'scan sensations from head to toe' },
];

const TEXT_COLORS = [
  'rgba(78,205,196,0.5)',
  '#4ecdc4', '#FFD93D', '#8b7cf8',
  'rgba(180,180,180,0.6)', '#6BCB77',
];

export default function BreatheScreen() {
  const t = useVeilStore(s => s.theme);

  const INNER_COLORS = [
    t.bg,
    t.teal + '28',
    '#FFD93D28',
    t.accent + '28',
    t.border,
    '#6BCB7728',
  ];

  const [phase, setPhase]   = useState<Phase>('idle');
  const [count, setCount]   = useState(0);
  const [cycles, setCycles] = useState(0);
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const piRef  = useRef(0);
  const cyRef  = useRef(0);

  const phaseProgress = useSharedValue(0);
  const scaleValue    = useSharedValue(1);
  const countOpacity  = useSharedValue(1);

  const animatePhase = (p: Phase) => {
    phaseProgress.value = withTiming(PHASE_IDX[p], { duration: 650, easing: Easing.inOut(Easing.quad) });
    scaleValue.value    = withTiming(
      p === 'inhale' || p === 'hold' ? 1.15 : 1,
      { duration: 900, easing: Easing.inOut(Easing.sin) },
    );
  };

  const ringStyle  = useAnimatedStyle(() => ({
    borderColor: interpolateColor(phaseProgress.value, IDX_INPUT, RING_COLORS),
  }));
  const innerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phaseProgress.value, IDX_INPUT, INNER_COLORS),
    transform: [{ scale: scaleValue.value }],
  }));
  const countColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(phaseProgress.value, IDX_INPUT, TEXT_COLORS),
  }));
  const countFadeStyle = useAnimatedStyle(() => ({ opacity: countOpacity.value }));

  const pulseCount = () => {
    countOpacity.value = withTiming(0.35, { duration: 80 }, () => {
      countOpacity.value = withTiming(1, { duration: 160 });
    });
  };

  const runPhase = (idx: number) => {
    const p = PHASES[idx];
    setPhase(p.id); setCount(p.duration); animatePhase(p.id);
    let rem = p.duration;
    intRef.current = setInterval(() => {
      rem--; setCount(rem); pulseCount();
      if (rem <= 0) {
        clearInterval(intRef.current!);
        const next = (idx + 1) % PHASES.length;
        if (next === 0) { cyRef.current++; setCycles(cyRef.current); }
        if (cyRef.current >= 3) { setPhase('done'); animatePhase('done'); return; }
        piRef.current = next; runPhase(next);
      }
    }, 1000);
  };

  const toggle = () => {
    if (phase !== 'idle' && phase !== 'done') {
      clearInterval(intRef.current!);
      setPhase('idle'); setCount(0); setCycles(0); cyRef.current = 0; animatePhase('idle');
      return;
    }
    piRef.current = 0; cyRef.current = 0; setCycles(0); runPhase(0);
  };

  useEffect(() => () => { clearInterval(intRef.current!); }, []);

  const active = phase !== 'idle' && phase !== 'done';

  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.header}>
          <Text style={[s.title, { color: t.text }]}>breathe</Text>
          <Text style={[s.sub, { color: t.textDim }]}>4-7-8 technique</Text>
        </View>

        <View style={s.circleArea}>
          <Pressable onPress={toggle} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
            <Animated.View style={[s.ring, ringStyle]}>
              <Animated.View style={[s.inner, innerStyle]}>
                {phase === 'idle' ? (
                  <Text style={[s.idleText, { color: t.textDim }]}>tap to{'\n'}begin</Text>
                ) : phase === 'done' ? (
                  <><Text style={[s.countText, { color: '#6BCB77' }]}>✓</Text>
                  <Text style={[s.phaseText, { color: t.textMuted }]}>done</Text></>
                ) : (
                  <><Animated.Text style={[s.countText, countColorStyle, countFadeStyle]}>{count}</Animated.Text>
                  <Text style={[s.phaseText, { color: t.textMuted }]}>{phase}</Text></>
                )}
              </Animated.View>
            </Animated.View>
          </Pressable>

          <View style={s.phaseRow}>
            {[{ id: 'inhale', n: 4, c: '#4ecdc4' }, { id: 'hold', n: 7, c: '#FFD93D' }, { id: 'exhale', n: 8, c: t.accent }].map(p => (
              <View key={p.id} style={s.phaseInfo}>
                <Text style={[s.phaseN, { color: phase === p.id ? p.c : t.textDim }]}>{p.n}s</Text>
                <Text style={[s.phaseName, { color: t.textDim }]}>{p.id}</Text>
              </View>
            ))}
          </View>

          {active && <Text style={[s.cycleText, { color: t.textMuted }]}>cycle {cycles + 1} / 3</Text>}
        </View>

        <View style={[s.infoCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[s.infoText, { color: t.textMuted }]}>
            Activates the parasympathetic nervous system · reduces anxiety in 2–3 cycles
          </Text>
        </View>

        <View style={s.practices}>
          <Text style={[s.practicesLabel, { color: t.textDim }]}>other practices</Text>
          {PRACTICES.map(p => (
            <View key={p.name} style={[s.practiceRow, { borderTopColor: t.border }]}>
              <View style={[s.practiceDot, { backgroundColor: t.accent + '66' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.practiceName, { color: t.text }]}>{p.name}</Text>
                <Text style={[s.practiceDesc, { color: t.textMuted }]}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </FadeScreen>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  title:          { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  sub:            { fontSize: 14, marginTop: 4 },
  circleArea:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  ring:           { width: 200, height: 200, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner:          { width: 156, height: 156, borderRadius: 78, alignItems: 'center', justifyContent: 'center' },
  countText:      { fontSize: 48, fontWeight: '300', lineHeight: 56 },
  phaseText:      { fontSize: 14, marginTop: 4 },
  idleText:       { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  phaseRow:       { flexDirection: 'row', gap: 36 },
  phaseInfo:      { alignItems: 'center', gap: 5 },
  phaseN:         { fontSize: 22, fontWeight: '600' },
  phaseName:      { fontSize: 11 },
  cycleText:      { fontSize: 14 },
  infoCard:       { marginHorizontal: 20, marginBottom: 16, borderRadius: 14, borderWidth: 0.5, padding: 14 },
  infoText:       { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  practices:      { paddingHorizontal: 20, paddingBottom: 16 },
  practicesLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 10 },
  practiceRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 0.5 },
  practiceDot:    { width: 8, height: 8, borderRadius: 4 },
  practiceName:   { fontSize: 14, marginBottom: 2 },
  practiceDesc:   { fontSize: 12 },
});
