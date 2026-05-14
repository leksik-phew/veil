import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/emotions';

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'done';

const PHASES = [
  { id: 'inhale' as const, duration: 4 },
  { id: 'hold'   as const, duration: 7 },
  { id: 'exhale' as const, duration: 8 },
  { id: 'pause'  as const, duration: 2 },
];

const COLOR: Record<string, string> = {
  inhale: '#4ecdc4', hold: '#FFD93D', exhale: COLORS.accent,
  pause: 'rgba(255,255,255,0.3)', idle: 'rgba(78,205,196,0.25)', done: '#6BCB77',
};

const PRACTICES = [
  { name: '5-4-3-2-1 grounding',    desc: '5 things you can see...' },
  { name: 'progressive relaxation', desc: 'tension and release of muscle groups' },
  { name: 'body scan meditation',   desc: 'scan sensations from head to toe' },
];

export default function BreatheScreen() {
  const [phase, setPhase]   = useState<Phase>('idle');
  const [count, setCount]   = useState(0);
  const [cycles, setCycles] = useState(0);
  const scale  = useRef(new Animated.Value(1)).current;
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const piRef  = useRef(0);
  const cyRef  = useRef(0);

  const runPhase = (idx: number) => {
    const p = PHASES[idx];
    setPhase(p.id); setCount(p.duration);
    Animated.timing(scale, { toValue: p.id === 'inhale' || p.id === 'hold' ? 1.2 : 1, duration: 1000, useNativeDriver: true }).start();
    let rem = p.duration;
    intRef.current = setInterval(() => {
      rem--; setCount(rem);
      if (rem <= 0) {
        clearInterval(intRef.current!);
        const next = (idx + 1) % PHASES.length;
        if (next === 0) { cyRef.current++; setCycles(cyRef.current); }
        if (cyRef.current >= 3) { setPhase('done'); return; }
        piRef.current = next; runPhase(next);
      }
    }, 1000);
  };

  const toggle = () => {
    if (phase !== 'idle' && phase !== 'done') {
      clearInterval(intRef.current!);
      setPhase('idle'); setCount(0); setCycles(0); cyRef.current = 0; scale.setValue(1);
      return;
    }
    piRef.current = 0; cyRef.current = 0; setCycles(0); runPhase(0);
  };

  useEffect(() => () => { clearInterval(intRef.current!); }, []);

  const active = phase !== 'idle' && phase !== 'done';
  const ringColor = COLOR[phase] ?? COLORS.accent;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>breathe</Text>
          <Text style={s.sub}>4-7-8 technique</Text>
        </View>

        <View style={s.area}>
          <TouchableOpacity onPress={toggle} activeOpacity={0.9}>
            <View style={[s.ring, { borderColor: ringColor }]}>
              <Animated.View style={[s.inner, { backgroundColor: ringColor + '18', transform: [{ scale }] }]}>
                {phase === 'idle'
                  ? <Text style={s.idleText}>tap to{'\n'}begin</Text>
                  : phase === 'done'
                  ? <><Text style={[s.count, { color: '#6BCB77' }]}>✓</Text><Text style={s.phaseText}>done</Text></>
                  : <><Text style={[s.count, { color: ringColor }]}>{count}</Text><Text style={s.phaseText}>{phase}</Text></>
                }
              </Animated.View>
            </View>
          </TouchableOpacity>

          <View style={s.phaseRow}>
            {[{ id: 'inhale', n: 4, c: '#4ecdc4' }, { id: 'hold', n: 7, c: '#FFD93D' }, { id: 'exhale', n: 8, c: COLORS.accent }].map(p => (
              <View key={p.id} style={s.phaseInfo}>
                <Text style={[s.phaseN, { color: phase === p.id ? p.c : 'rgba(255,255,255,0.2)' }]}>{p.n}s</Text>
                <Text style={s.phaseName}>{p.id}</Text>
              </View>
            ))}
          </View>

          {active && <Text style={s.cycleText}>cycle {cycles + 1} / 3</Text>}
        </View>

        <View style={[s.card, s.mx]}>
          <Text style={s.infoText}>The 4-7-8 technique activates the parasympathetic nervous system and reduces anxiety within 2–3 cycles</Text>
        </View>

        <View style={s.mx}>
          <Text style={s.label}>other practices</Text>
          {PRACTICES.map(p => (
            <View key={p.name} style={[s.card, s.practiceRow]}>
              <View style={s.practiceDot} />
              <View><Text style={s.practiceName}>{p.name}</Text><Text style={s.practiceDesc}>{p.desc}</Text></View>
            </View>
          ))}
        </View>
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
  area:        { alignItems: 'center', paddingVertical: 32, gap: 24 },
  ring:        { width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner:       { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  count:       { fontSize: 42, fontWeight: '300', lineHeight: 50 },
  phaseText:   { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  idleText:    { fontSize: 13, color: COLORS.textDim, textAlign: 'center', lineHeight: 20 },
  phaseRow:    { flexDirection: 'row', gap: 32 },
  phaseInfo:   { alignItems: 'center', gap: 4 },
  phaseN:      { fontSize: 22, fontWeight: '600' },
  phaseName:   { fontSize: 11, color: COLORS.textDim },
  cycleText:   { fontSize: 13, color: COLORS.textMuted },
  mx:          { marginHorizontal: 20, marginBottom: 12 },
  label:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  card:        { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, padding: 14 },
  infoText:    { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, textAlign: 'center' },
  practiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
  practiceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,124,248,0.4)' },
  practiceName:{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  practiceDesc:{ fontSize: 12, color: COLORS.textMuted },
});
