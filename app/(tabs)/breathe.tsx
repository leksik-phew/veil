import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/emotions';

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'done';

const PHASES = [
  { id: 'inhale' as const, duration: 4 },
  { id: 'hold'   as const, duration: 7 },
  { id: 'exhale' as const, duration: 8 },
  { id: 'pause'  as const, duration: 2 },
];

const PHASE_COLOR: Record<string, string> = {
  inhale: '#4ecdc4', hold: '#FFD93D', exhale: COLORS.accent,
  pause:  'rgba(255,255,255,0.3)', idle: 'rgba(78,205,196,0.2)', done: '#6BCB77',
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
    Animated.timing(scale, {
      toValue: p.id === 'inhale' || p.id === 'hold' ? 1.15 : 1,
      duration: 900, useNativeDriver: true,
    }).start();
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

  const active    = phase !== 'idle' && phase !== 'done';
  const ringColor = PHASE_COLOR[phase] ?? COLORS.accent;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>breathe</Text>
        <Text style={s.sub}>4-7-8 technique</Text>
      </View>

      {/* Breathing circle — flex:1 */}
      <View style={s.circleArea}>
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

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.infoText}>
          Activates the parasympathetic nervous system · reduces anxiety in 2–3 cycles
        </Text>
      </View>

      {/* Practices */}
      <View style={s.practices}>
        <Text style={s.practicesLabel}>other practices</Text>
        {PRACTICES.map(p => (
          <View key={p.name} style={s.practiceRow}>
            <View style={s.practiceDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.practiceName}>{p.name}</Text>
              <Text style={s.practiceDesc}>{p.desc}</Text>
            </View>
          </View>
        ))}
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  title:          { fontSize: 26, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
  sub:            { fontSize: 14, color: COLORS.textDim, marginTop: 4 },
  circleArea:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  ring:           { width: 200, height: 200, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner:          { width: 156, height: 156, borderRadius: 78, alignItems: 'center', justifyContent: 'center' },
  count:          { fontSize: 48, fontWeight: '300', lineHeight: 56 },
  phaseText:      { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  idleText:       { fontSize: 14, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  phaseRow:       { flexDirection: 'row', gap: 36 },
  phaseInfo:      { alignItems: 'center', gap: 5 },
  phaseN:         { fontSize: 22, fontWeight: '600' },
  phaseName:      { fontSize: 11, color: COLORS.textDim },
  cycleText:      { fontSize: 14, color: COLORS.textMuted },
  infoCard:       { marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, padding: 14 },
  infoText:       { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, textAlign: 'center' },
  practices:      { paddingHorizontal: 20, paddingBottom: 16 },
  practicesLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  practiceRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  practiceDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,124,248,0.4)' },
  practiceName:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  practiceDesc:   { fontSize: 12, color: COLORS.textMuted },
});
