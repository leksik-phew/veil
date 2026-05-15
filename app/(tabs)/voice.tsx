import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS, EMOTIONS, getEmotion } from '../../src/constants/emotions';
import { dbToAmplitude, extractFeatures, classifyEmotion, featureDescription } from '../../src/engine/emotionEngine';
import type { EmotionId, AudioFeatures } from '../../src/types';

type Phase = 'idle' | 'recording' | 'processing' | 'done';

export default function VoiceScreen() {
  const { voiceEntries, addVoiceEntry } = useVeilStore(s => ({
    voiceEntries: s.voiceEntries, addVoiceEntry: s.addVoiceEntry,
  }));
  const [phase, setPhase]       = useState<Phase>('idle');
  const [secs, setSecs]         = useState(0);
  const [waveBars, setWaveBars] = useState<number[]>([]);
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState<{
    audioPath: string;
    duration: number;
    emotion: EmotionId;
    modelEmotion: EmotionId;
    confidence: number;
    features: AudioFeatures;
    desc: string;
    modelVersion: string;
  } | null>(null);
  const recRef     = useRef<Audio.Recording | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  const start = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permission required', 'Microphone access is needed.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true,
      });
      recRef.current   = recording;
      samplesRef.current = [];
      setPhase('recording'); setSecs(0); setResult(null); setSaving(false); setWaveBars([]);
      timerRef.current = setInterval(async () => {
        setSecs(s => s + 0.1);
        const st = await recording.getStatusAsync();
        if (st.isRecording && st.metering !== undefined) {
          const amp = dbToAmplitude(st.metering);
          samplesRef.current.push(amp);
          setWaveBars(prev => [...prev.slice(-28), amp]);
        }
      }, 100);
    } catch { Alert.alert('Error', 'Could not start recording.'); }
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
      const features           = extractFeatures(samplesRef.current);
      const { emotion, confidence, modelVersion } = classifyEmotion(features);
      setResult({
        audioPath: uri,
        duration,
        emotion,
        modelEmotion: emotion,
        confidence,
        features,
        desc: featureDescription(features),
        modelVersion,
      });
      setPhase('done');
    } catch (e) { console.error(e); setPhase('idle'); }
  };

  const chooseEmotion = (emotion: EmotionId) => {
    setResult(r => r ? { ...r, emotion } : r);
  };

  const saveVoiceResult = async () => {
    if (!result || saving) return;
    setSaving(true);
    await addVoiceEntry(
      result.audioPath,
      result.emotion,
      result.modelEmotion,
      result.confidence,
      result.features,
      result.duration,
      result.modelVersion,
    );
    setSaving(false);
    setResult(null);
    setPhase('idle');
  };

  const onMic    = () => { if (phase === 'idle' || phase === 'done') start(); else if (phase === 'recording') stop(); };
  const micColor  = phase === 'recording' ? '#FF6B6B' : COLORS.accent;
  const ringColor = phase === 'recording' ? 'rgba(255,107,107,0.3)' : 'rgba(139,124,248,0.25)';
  const secStr    = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>voice journal</Text>
        <Text style={s.sub}>tell me about your day</Text>
      </View>

      {/* Mic — flex:1 centre stage */}
      <View style={s.micArea}>
        <TouchableOpacity
          onPress={onMic}
          disabled={phase === 'processing'}
          style={[s.ring, { borderColor: ringColor }]}
          activeOpacity={0.85}
        >
          <View style={[s.micBtn, { backgroundColor: micColor }]}>
            {phase === 'processing'
              ? <ActivityIndicator color="#0d0b14" size="large" />
              : <Text style={s.micIcon}>{phase === 'recording' ? '◼' : '🎙'}</Text>}
          </View>
        </TouchableOpacity>

        {phase === 'recording' && (
          <>
            <View style={s.recRow}>
              <View style={s.recDot} />
              <Text style={s.recTime}>{secStr}</Text>
            </View>
            <View style={s.wave}>
              {(waveBars.length > 0 ? waveBars : Array(20).fill(0.1)).map((a, i) => (
                <View key={i} style={[s.waveBar, {
                  height: Math.max(4, a * 44),
                  opacity: 0.3 + (i / Math.max(waveBars.length, 1)) * 0.7,
                }]} />
              ))}
            </View>
          </>
        )}

        {phase === 'idle'       && <Text style={s.hint}>tap to start recording</Text>}
        {phase === 'processing' && <Text style={s.hint}>running local neural model...</Text>}

        {phase === 'done' && result && (
          <View style={s.resultCard}>
            <Text style={s.resultBadge}>
              {result.emotion === result.modelEmotion ? 'veil hears' : `model heard ${getEmotion(result.modelEmotion).label}`}
            </Text>
            <Text style={[s.resultEmo, { color: getEmotion(result.emotion).color }]}>
              {getEmotion(result.emotion).label}
            </Text>
            <Text style={s.resultDesc}>{result.desc}</Text>
            <View style={s.choiceGrid}>
              {EMOTIONS.map(e => {
                const active = e.id === result.emotion;
                return (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => chooseEmotion(e.id)}
                    activeOpacity={0.75}
                    style={[
                      s.choiceChip,
                      active && { backgroundColor: e.color + '24', borderColor: e.color + '80' },
                    ]}
                  >
                    <Text style={[s.choiceText, active && { color: e.color }]}>{e.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.pillRow}>
              {([
                ['confidence', `${Math.round(result.confidence * 100)}%`],
                ['energy',     `${Math.round(result.features.energy * 100)}%`],
                ['stability',  `${Math.round(result.features.stability * 100)}%`],
              ] as [string, string][]).map(([l, v]) => (
                <View key={l} style={s.pill}>
                  <Text style={s.pillLabel}>{l}</Text>
                  <Text style={s.pillVal}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={s.privacy}>{result.modelVersion} · on-device · 0 bytes to cloud</Text>
            <TouchableOpacity
              onPress={saveVoiceResult}
              disabled={saving}
              activeOpacity={0.85}
              style={[s.saveBtn, { backgroundColor: getEmotion(result.emotion).color, opacity: saving ? 0.6 : 1 }]}
            >
              <Text style={s.saveText}>{saving ? 'saving...' : 'save emotion'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent — fixed bottom */}
      {voiceEntries.length > 0 && (
        <View style={s.recent}>
          <Text style={s.recentLabel}>recent</Text>
          {voiceEntries.slice(0, 3).map(e => {
            const emo = getEmotion(e.detectedEmotion);
            return (
              <View key={e.id} style={s.entryRow}>
                <View style={[s.entryDot, { backgroundColor: emo.color }]} />
                <Text style={[s.entryEmo, { color: emo.color }]}>{emo.label}</Text>
                <Text style={s.entryMeta}>
                  {e.durationSeconds}s · {Math.round(e.confidence * 100)}%
                  {e.modelEmotion !== e.detectedEmotion ? ' · corrected' : ''}
                </Text>
                <Text style={s.entryTime}>
                  {new Date(e.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </View>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title:       { fontSize: 26, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
  sub:         { fontSize: 14, color: COLORS.textDim, marginTop: 4 },
  micArea:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  ring:        { width: 150, height: 150, borderRadius: 75, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  micBtn:      { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  micIcon:     { fontSize: 42 },
  recRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recDot:      { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF6B6B' },
  recTime:     { fontSize: 15, color: COLORS.textMuted },
  wave:        { flexDirection: 'row', alignItems: 'center', gap: 3, height: 50, minWidth: 130 },
  waveBar:     { width: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  hint:        { fontSize: 14, color: COLORS.textDim },
  resultCard:  { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 0.5, borderColor: COLORS.border, padding: 22, alignItems: 'center', width: '85%', gap: 8 },
  resultBadge: { fontSize: 12, color: COLORS.textMuted },
  resultEmo:   { fontSize: 26, fontWeight: '700' },
  resultDesc:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  choiceGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 4 },
  choiceChip:  { borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.04)' },
  choiceText:  { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  pillRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  pill:        { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  pillLabel:   { fontSize: 10, color: COLORS.textDim },
  pillVal:     { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  privacy:     { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  saveBtn:     { marginTop: 6, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22 },
  saveText:    { fontSize: 14, fontWeight: '700', color: '#0d0b14' },
  recent:      { paddingHorizontal: 20, paddingBottom: 16 },
  recentLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  entryRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  entryDot:    { width: 8, height: 8, borderRadius: 4 },
  entryEmo:    { fontSize: 14, fontWeight: '600', flex: 1 },
  entryMeta:   { fontSize: 12, color: COLORS.textMuted },
  entryTime:   { fontSize: 12, color: COLORS.textDim },
});
