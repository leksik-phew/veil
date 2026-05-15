import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getEmotion, COLORS } from '../constants/emotions';
import type { CheckIn } from '../types';

export default function EntryCard({ entry }: { entry: CheckIn }) {
  const emotion = getEmotion(entry.emotion);
  const d       = new Date(entry.createdAt);
  const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

  const scale    = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.975, { damping: 26, stiffness: 400, mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1,     { damping: 22, stiffness: 300, mass: 0.5 }); }}
    >
      <Animated.View style={[s.card, animStyle]}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: emotion.color }]} />
          <View style={s.body}>
            <View style={s.head}>
              <Text style={[s.emo, { color: emotion.color }]}>{emotion.label}</Text>
              <Text style={s.time}>{dateStr} · {timeStr}</Text>
            </View>
            {entry.triggers.length > 0 && (
              <Text style={s.trigger}>{entry.triggers.join(', ')}</Text>
            )}
            {entry.note.length > 0 && (
              <Text style={s.note} numberOfLines={2}>{entry.note}</Text>
            )}
          </View>
        </View>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${entry.intensity * 10}%` as any, backgroundColor: emotion.color + '80' }]} />
        </View>
        <Text style={s.intensity}>{entry.intensity}/10</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card:     { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  body:     { flex: 1 },
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  emo:      { fontSize: 14, fontWeight: '600' },
  time:     { fontSize: 11, color: COLORS.textDim },
  trigger:  { fontSize: 12, color: COLORS.textMuted, backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4, overflow: 'hidden' },
  note:     { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  barTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 2 },
  intensity:{ fontSize: 11, color: COLORS.textDim, textAlign: 'right', marginTop: 3 },
});
