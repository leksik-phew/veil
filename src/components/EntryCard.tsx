import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getEmotion, getEmotionLabel } from '../constants/emotions';
import { useVeilStore } from '../store/useStore';
import { TRANSLATIONS } from '../i18n/translations';
import type { CheckIn } from '../types';

export default function EntryCard({ entry }: { entry: CheckIn }) {
  const t    = useVeilStore(s => s.theme);
  const lang = useVeilStore(s => s.lang);

  const emotion   = getEmotion(entry.emotion);
  const emoLabel  = getEmotionLabel(entry.emotion, lang);
  const trTriggers = TRANSLATIONS[lang].triggers;

  // Locale-aware date formatting
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const d       = new Date(entry.createdAt);
  const dateStr = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  // Translate known trigger IDs; leave custom #hashtag triggers as-is
  const triggerText = entry.triggers
    .map(id => (trTriggers as Record<string, string>)[id] ?? id)
    .join(', ');

  const scale     = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.975, { damping: 26, stiffness: 400, mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1,     { damping: 22, stiffness: 300, mass: 0.5 }); }}
    >
      <Animated.View style={[s.card, animStyle, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: emotion.color }]} />
          <View style={s.body}>
            <View style={s.head}>
              <Text style={[s.emo, { color: emotion.color }]}>{emoLabel}</Text>
              <Text style={[s.time, { color: t.textDim }]}>{dateStr} · {timeStr}</Text>
            </View>
            {entry.triggers.length > 0 && (
              <Text style={[s.trigger, { color: t.textMuted, backgroundColor: t.chip }]}>
                {triggerText}
              </Text>
            )}
            {entry.note.length > 0 && (
              <Text style={[s.note, { color: t.textMuted }]} numberOfLines={2}>{entry.note}</Text>
            )}
          </View>
        </View>
        <View style={[s.barTrack, { backgroundColor: t.border }]}>
          <View style={[s.barFill, { width: `${entry.intensity * 10}%` as any, backgroundColor: emotion.color + '80' }]} />
        </View>
        <Text style={[s.intensity, { color: t.textDim }]}>{entry.intensity}/10</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card:     { borderRadius: 14, borderWidth: 0.5, padding: 12, marginBottom: 8 },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  body:     { flex: 1 },
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  emo:      { fontSize: 14, fontWeight: '600' },
  time:     { fontSize: 11 },
  trigger:  { fontSize: 12, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4, overflow: 'hidden' },
  note:     { fontSize: 13, lineHeight: 18 },
  barTrack: { height: 3, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 2 },
  intensity:{ fontSize: 11, textAlign: 'right', marginTop: 3 },
});
