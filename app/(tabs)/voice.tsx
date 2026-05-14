import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS, getEmotion } from '../../src/constants/emotions';
import { dbToAmplitude, extractFeatures, classifyEmotion, featureDescription } from '../../src/engine/emotionEngine';
import type { EmotionId, AudioFeatures } from '../../src/types';

type Phase = 'idle' | 'recording' | 'processing' | 'done';

export default function VoiceScreen() {
  const { voiceEntries, addVoiceEntry } = useVeilStore(s => ({ voiceEntries: s.voiceEntries, addVoiceEntry: s.addVoiceEntry }));
  const [phase, setPhase]   = useState<Phase>('idle');
  const [secs, setSecs]     = useState(0);
  const [result, setResult] = useState<{ emotion: EmotionId; confidence: number; features: AudioFeatures; desc: string } | null>(null);
  const recRef     = useRef<Audio.Recording | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  const start = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permission required', 'Microphone access is needed.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({ ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true });
      recRef.current = recording;
      samplesRef.current = [];
      setPhase('recording'); setSecs(0); setResult(null);
      timerRef.current = setInterval(async () => {
        setSecs(s => s + 0.1);
        const st = await recording.getStatusAsync();
        if (st.isRecording && st.metering !== undefined)
          samplesRef.current.push(dbToAmplitude(st.metering));
      }, 100);
    } catch (e) { Alert.alert('Error', 'Could not start recording.'); }
  };

  const stop = async () => {
    if (!recRef.current) return;
    clearInterval(timerRef.current!);
    setPhase('processing');
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri      = recRef.current.getURI() ?? '';
      const duration = Math.round(secs);
      recRef.current = null;
      await new Promise(r => setTimeout(r, 400));
      const features  = extractFeatures(samplesRef.current);
      const { emotion, confidence } = classifyEmotion(features);
      setResult({ emotion, confidence, features, desc: featureDescription(features) });
      setPhase('done');
      await addVoiceEntry(uri, emotion, confidence, features, duration);
    } catch (e) { console.error(e); setPhase('idle'); }
  };

  const onMic = () => { if (phase === 'idle' || phase === 'done') start(); else if (phase === 'recording') stop(); };
  const micColor  = phase === 'recording' ? '#FF6B6B' : COLORS.accent;
  const ringColor = phase === 'recording' ? 'rgba(255,107,107,0.3)' : 'rgba(139,124,248,0.25)';
  const secStr = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>voice journal</Text>
          <Text style={s.sub}>tell me about your day</Text>
        </View>

        <View style={s.micArea}>
          <TouchableOpacity onPress={onMic} disabled={phase === 'processing'} style={[s.ring, { borderColor: ringColor }]} activeOpacity={0.85}>
            <View style={[s.micBtn, { backgroundColor: micColor }]}>
              {phase === 'processing' ? <ActivityIndicator color="#0d0b14" size="large" /> : <Text style={s.micIcon}>{phase === 'recording' ? '◼' : '🎙'}</Text>}
            </View>
          </TouchableOpacity>

          {phase === 'recording' && (
            <><View style={s.recRow}><View style={s.recDot} /><Text style={s.recTime}>{secStr}</Text></View>
            <View style={s.wave}>{samplesRef.current.slice(-20).map((a, i) => <View key={i} style={[s.waveBar, { height: Math.max(4, a * 36) }]} />)}</View></>
          )}
          {phase === 'idle'       && <Text style={s.hint}>tap to start recording</Text>}
          {phase === 'processing' && <Text style={s.hint}>analyzing your voice...</Text>}

          {phase === 'done' && result && (
            <View style={s.resultCard}>
              <Text style={s.resultBadge}>veil hears</Text>
              <Text style={[s.resultEmo, { color: getEmotion(result.emotion).color }]}>{getEmotion(result.emotion).label}</Text>
              <Text style={s.resultDesc}>{result.desc}</Text>
              <View style={s.pillRow}>
                {[['confidence', `${Math.round(result.confidence * 100)}%`], ['energy', `${Math.round(result.features.energy * 100)}%`], ['variance', `${Math.round(result.features.variance * 100)}%`]].map(([l, v]) => (
                  <View key={l} style={s.pill}><Text style={s.pillLabel}>{l}</Text><Text style={s.pillVal}>{v}</Text></View>
                ))}
              </View>
              <Text style={s.privacy}>on-device · 0 bytes to cloud</Text>
            </View>
          )}
        </View>

        {voiceEntries.length > 0 && (
          <View style={s.mx}>
            <Text style={s.label}>recent</Text>
            {voiceEntries.slice(0, 5).map(e => {
              const emo = getEmotion(e.detectedEmotion);
              return (
                <View key={e.id} style={s.entryRow}>
                  <View style={[s.entryDot, { backgroundColor: emo.color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.entryHead}><Text style={[s.entryEmo, { color: emo.color }]}>{emo.label}</Text><Text style={s.entryTime}>{new Date(e.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                    <Text style={s.entryMeta}>{e.durationSeconds}s · {Math.round(e.confidence * 100)}% confidence</Text>
                  </View>
                </View>
              );
            })}
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
  micArea:     { alignItems: 'center', paddingVertical: 32, gap: 20 },
  ring:        { width: 130, height: 130, borderRadius: 65, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  micBtn:      { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  micIcon:     { fontSize: 36 },
  recRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' },
  recTime:     { fontSize: 14, color: COLORS.textMuted },
  wave:        { flexDirection: 'row', alignItems: 'center', gap: 3, height: 40, minWidth: 100 },
  waveBar:     { width: 4, borderRadius: 2, backgroundColor: COLORS.accent, opacity: 0.8 },
  hint:        { fontSize: 13, color: COLORS.textDim },
  resultCard:  { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.border, padding: 20, alignItems: 'center', width: '85%', gap: 8 },
  resultBadge: { fontSize: 12, color: COLORS.textMuted },
  resultEmo:   { fontSize: 22, fontWeight: '700' },
  resultDesc:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  pillRow:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill:        { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  pillLabel:   { fontSize: 10, color: COLORS.textDim },
  pillVal:     { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 1 },
  privacy:     { fontSize: 11, color: COLORS.textDim, marginTop: 4 },
  mx:          { paddingHorizontal: 20, marginTop: 8 },
  label:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  entryRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  entryDot:    { width: 8, height: 8, borderRadius: 4 },
  entryHead:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  entryEmo:    { fontSize: 13, fontWeight: '600' },
  entryTime:   { fontSize: 11, color: COLORS.textDim },
  entryMeta:   { fontSize: 12, color: COLORS.textMuted },
});
