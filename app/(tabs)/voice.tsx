import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withSequence,
  interpolate, Easing,
} from 'react-native-reanimated';
import { FadeScreen } from '../../src/components/FadeScreen';
import { Audio } from 'expo-av';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS, EMOTIONS, getEmotion } from '../../src/constants/emotions';
import {
  dbToAmplitude, extractFeatures, classifyEmotion, featureDescription,
} from '../../src/engine/emotionEngine';
import type { EmotionId, AudioFeatures } from '../../src/types';

type Phase = 'idle' | 'recording' | 'processing' | 'done';

// ── Animated choice chip ──────────────────────────────────────────────────────
function ChoiceChip({ label, active, color, onPress }: {
  label: string; active: boolean; color: string; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.90, { damping: 20, stiffness: 380, mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 18, stiffness: 300, mass: 0.5 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        cc.chip,
        active && { backgroundColor: color + '24', borderColor: color + '80' },
        anim,
      ]}>
        <Text style={[cc.text, active && { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
const cc = StyleSheet.create({
  chip: { borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.04)' },
  text: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
});

// ── Animated save button ──────────────────────────────────────────────────────
function SaveBtn({ onPress, label, color, disabled }: {
  onPress: () => void; label: string; color: string; disabled: boolean;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 20, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 18, stiffness: 260 }); }}
      onPress={onPress} disabled={disabled}
    >
      <Animated.View style={[s.saveBtn, { backgroundColor: color, opacity: disabled ? 0.6 : 1 }, anim]}>
        <Text style={s.saveText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function VoiceScreen() {
  const { voiceEntries, addVoiceEntry } = useVeilStore(s => ({
    voiceEntries: s.voiceEntries, addVoiceEntry: s.addVoiceEntry,
  }));

  const [phase, setPhase]       = useState<Phase>('idle');
  const [secs, setSecs]         = useState(0);
  const [waveBars, setWaveBars] = useState<number[]>([]);
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState<{
    audioPath: string; duration: number;
    emotion: EmotionId; modelEmotion: EmotionId;
    confidence: number; features: any;
    desc: string; modelVersion: string;
  } | null>(null);

  const recRef     = useRef<Audio.Recording | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  // ── Result card entrance ─────────────────────────────────────────────────────
  const resultAnim = useSharedValue(0);
  useEffect(() => {
    if (phase === 'done') {
      resultAnim.value = 0;
      resultAnim.value = withSpring(1, { damping: 18, stiffness: 160, mass: 0.9 });
    } else {
      resultAnim.value = withTiming(0, { duration: 100 });
    }
  }, [phase]);
  const resultStyle = useAnimatedStyle(() => ({
    opacity:   resultAnim.value,
    transform: [{ translateY: interpolate(resultAnim.value, [0, 1], [28, 0]) }],
  }));

  // ── Mic ring pulse — withRepeat (no recursive callbacks) ─────────────────────
  const ringScale = useSharedValue(1);
  useEffect(() => {
    if (phase === 'recording') {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,   // infinite
        false // don't reverse (sequence already goes up then down)
      );
    } else {
      ringScale.value = withSpring(1, { damping: 18, stiffness: 250 });
    }
  }, [phase]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }] }));

  // ── Recording ────────────────────────────────────────────────────────────────
  const start = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow microphone access in Settings.');
        return;
      }

      // Configure audio session before creating the recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:    true,
        playsInSilentModeIOS:  true,
        staysActiveInBackground: false,
        shouldDuckAndroid:     true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension:       '.m4a',
            outputFormat:    Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder:    Audio.AndroidAudioEncoder.AAC,
            sampleRate:      44100,
            numberOfChannels: 1,
            bitRate:         128000,
          },
          ios: {
            extension:          '.m4a',
            outputFormat:       Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality:       Audio.IOSAudioQuality.MEDIUM,
            sampleRate:         44100,
            numberOfChannels:   1,
            bitRate:            128000,
            linearPCMBitDepth:  16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat:   false,
          },
          web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
          isMeteringEnabled: true,
        }
      );

      recRef.current   = recording;
      samplesRef.current = [];
      setPhase('recording'); setSecs(0); setResult(null); setSaving(false); setWaveBars([]);

      timerRef.current = setInterval(async () => {
        setSecs(prev => prev + 0.1);
        try {
          const st = await recording.getStatusAsync();
          if (st.isRecording && st.metering !== undefined) {
            const amp = dbToAmplitude(st.metering);
            samplesRef.current.push(amp);
            setWaveBars(prev => [...prev.slice(-28), amp]);
          }
        } catch { /* metering polling error — ignore */ }
      }, 100);

    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Could not start recording', String(err));
    }
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

      // Small delay so the UI shows "processing"
      await new Promise(r => setTimeout(r, 350));

      const features = extractFeatures(samplesRef.current);
      const { emotion, confidence, modelVersion } = classifyEmotion(features) as any;

      setResult({
        audioPath: uri, duration,
        emotion, modelEmotion: emotion,
        confidence, features,
        desc: featureDescription(features),
        modelVersion: modelVersion ?? 'veil-engine-v1',
      });
      setPhase('done');
    } catch (err) {
      console.error('Recording stop error:', err);
      setPhase('idle');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current!);
      if (recRef.current) {
        recRef.current.stopAndUnloadAsync().catch(() => {});
        recRef.current = null;
      }
    };
  }, []);

  const chooseEmotion    = (eid: EmotionId) => setResult(r => r ? { ...r, emotion: eid } : r);
  const saveVoiceResult  = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await addVoiceEntry(
        result.audioPath, result.emotion, result.modelEmotion,
        result.confidence, result.features, result.duration,
        result.modelVersion,
      );
    } finally {
      setSaving(false); setResult(null); setPhase('idle');
    }
  };

  const onMic     = () => { if (phase === 'idle' || phase === 'done') start(); else if (phase === 'recording') stop(); };
  const micColor   = phase === 'recording' ? '#FF6B6B' : COLORS.accent;
  const ringBorder = phase === 'recording' ? 'rgba(255,107,107,0.35)' : 'rgba(139,124,248,0.28)';
  const secStr     = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  return (
    <FadeScreen>
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>voice journal</Text>
        <Text style={s.sub}>tell me about your day</Text>
      </View>

      <View style={s.micArea}>
        {/* Ring with scale pulse */}
        <Pressable onPress={onMic} disabled={phase === 'processing'}>
          <Animated.View style={[s.ring, { borderColor: ringBorder }, ringStyle]}>
            <View style={[s.micBtn, { backgroundColor: micColor }]}>
              {phase === 'processing'
                ? <ActivityIndicator color="#0d0b14" size="large" />
                : <Text style={s.micIcon}>{phase === 'recording' ? '◼' : '🎙'}</Text>}
            </View>
          </Animated.View>
        </Pressable>

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

        {/* Result card with slide-up entrance */}
        {phase === 'done' && result && (
          <Animated.View style={[s.resultCard, resultStyle]}>
            <Text style={s.resultBadge}>
              {result.emotion === result.modelEmotion
                ? 'veil hears'
                : `model heard ${getEmotion(result.modelEmotion).label}`}
            </Text>
            <Text style={[s.resultEmo, { color: getEmotion(result.emotion).color }]}>
              {getEmotion(result.emotion).label}
            </Text>
            <Text style={s.resultDesc}>{result.desc}</Text>

            <View style={s.choiceGrid}>
              {EMOTIONS.map(e => (
                <ChoiceChip
                  key={e.id} label={e.label}
                  active={e.id === result.emotion}
                  color={e.color}
                  onPress={() => chooseEmotion(e.id)}
                />
              ))}
            </View>

            <View style={s.pillRow}>
              {([
                ['confidence', `${Math.round(result.confidence * 100)}%`],
                ['energy',     `${Math.round((result.features.energy ?? 0) * 100)}%`],
                ['stability',  `${Math.round((result.features.stability ?? result.features.variance ?? 0) * 100)}%`],
              ] as [string, string][]).map(([l, v]) => (
                <View key={l} style={s.pill}>
                  <Text style={s.pillLabel}>{l}</Text>
                  <Text style={s.pillVal}>{v}</Text>
                </View>
              ))}
            </View>

            <Text style={s.privacy}>{result.modelVersion} · on-device · 0 bytes to cloud</Text>

            <SaveBtn
              onPress={saveVoiceResult}
              label={saving ? 'saving...' : 'save emotion'}
              color={getEmotion(result.emotion).color}
              disabled={saving}
            />
          </Animated.View>
        )}
      </View>

      {/* Recent entries */}
      {voiceEntries.length > 0 && (
        <View style={s.recent}>
          <Text style={s.recentLabel}>recent</Text>
          {voiceEntries.slice(0, 3).map(e => {
            const emo = getEmotion(e.detectedEmotion);
            const corrected = (e as any).modelEmotion && (e as any).modelEmotion !== e.detectedEmotion;
            return (
              <View key={e.id} style={s.entryRow}>
                <View style={[s.entryDot, { backgroundColor: emo.color }]} />
                <Text style={[s.entryEmo, { color: emo.color }]}>{emo.label}</Text>
                <Text style={s.entryMeta}>
                  {e.durationSeconds}s · {Math.round(e.confidence * 100)}%
                  {corrected ? ' · corrected' : ''}
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
    </FadeScreen>
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
  pillRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  pill:        { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  pillLabel:   { fontSize: 10, color: COLORS.textDim },
  pillVal:     { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  privacy:     { fontSize: 11, color: COLORS.textDim },
  saveBtn:     { marginTop: 4, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22 },
  saveText:    { fontSize: 14, fontWeight: '700', color: '#0d0b14' },
  recent:      { paddingHorizontal: 20, paddingBottom: 16 },
  recentLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.07, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 },
  entryRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  entryDot:    { width: 8, height: 8, borderRadius: 4 },
  entryEmo:    { fontSize: 14, fontWeight: '600', flex: 1 },
  entryMeta:   { fontSize: 12, color: COLORS.textMuted },
  entryTime:   { fontSize: 12, color: COLORS.textDim },
});
