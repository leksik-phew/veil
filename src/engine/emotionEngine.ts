/**
 * Veil Emotion Engine — standalone, zero-dependency classifier.
 *
 * Pipeline:
 *  1. expo-av records audio with isMeteringEnabled: true
 *  2. Every 100ms, amplitude (dBFS) is sampled
 *  3. extractFeatures() computes 4 signal features
 *  4. classifyEmotion() maps features → Russell valence-arousal → Plutchik emotion
 */

import type { AudioFeatures, EmotionId } from '../types';
import { EMOTIONS } from '../constants/emotions';

/** Convert dBFS (-60..0) to amplitude (0..1) */
export function dbToAmplitude(db: number): number {
  return (Math.max(-60, Math.min(0, db)) + 60) / 60;
}

/** Extract signal features from amplitude sample array (0..1) */
export function extractFeatures(samples: number[]): AudioFeatures {
  if (samples.length === 0) return { energy: 0, variance: 0, tempo: 0, peakRatio: 0 };

  const energy = samples.reduce((a, b) => a + b, 0) / samples.length;

  const variance = Math.sqrt(
    samples.map(s => (s - energy) ** 2).reduce((a, b) => a + b, 0) / samples.length,
  );

  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < energy) !== (samples[i] < energy)) crossings++;
  }
  const tempo = Math.min(1, crossings / (samples.length * 0.5));

  const peak = Math.max(...samples);
  const peakRatio = samples.filter(s => s > peak * 0.7).length / samples.length;

  return {
    energy:    clamp(energy),
    variance:  clamp(variance * 3),
    tempo:     clamp(tempo),
    peakRatio: clamp(peakRatio),
  };
}

/** Classify emotion from audio features using valence-arousal heuristics */
export function classifyEmotion(f: AudioFeatures): { emotion: EmotionId; confidence: number } {
  const scores: { id: EmotionId; score: number }[] = [
    { id: 'joy',          score: f.energy * 0.4 + f.tempo * 0.35 + f.variance * 0.25 },
    { id: 'anticipation', score: f.energy * 0.3 + f.peakRatio * 0.4 + f.tempo * 0.3 },
    { id: 'anger',        score: f.energy * 0.45 + f.peakRatio * 0.35 + (1 - f.variance) * 0.2 },
    { id: 'fear',         score: f.variance * 0.4 + f.tempo * 0.35 + (1 - f.peakRatio) * 0.25 },
    { id: 'surprise',     score: f.variance * 0.5 + f.tempo * 0.3 + f.energy * 0.2 },
    { id: 'sadness',      score: (1 - f.energy) * 0.4 + (1 - f.tempo) * 0.35 + (1 - f.variance) * 0.25 },
    { id: 'disgust',      score: (1 - f.energy) * 0.35 + (1 - f.tempo) * 0.3 + f.variance * 0.35 },
    { id: 'trust',        score: (1 - Math.abs(f.energy - 0.45)) * 0.4 + (1 - f.tempo) * 0.3 + (1 - f.variance) * 0.3 },
  ];

  const max = Math.max(...scores.map(s => s.score));
  const exps = scores.map(s => ({ ...s, e: Math.exp((s.score - max) * 5) }));
  const sum = exps.reduce((a, b) => a + b.e, 0);
  const probs = exps.map(s => ({ id: s.id, p: s.e / sum })).sort((a, b) => b.p - a.p);

  const confidence = clamp(0.55 + (probs[0].p - probs[1].p) * 0.4, 0.55, 0.95);
  return { emotion: probs[0].id as EmotionId, confidence };
}

export function featureDescription(f: AudioFeatures): string {
  const parts: string[] = [];
  if (f.energy > 0.6)       parts.push('high energy');
  else if (f.energy < 0.3)  parts.push('low energy');
  if (f.tempo > 0.6)        parts.push('fast pace');
  else if (f.tempo < 0.3)   parts.push('slow pace');
  if (f.variance > 0.5)     parts.push('expressive tone');
  else if (f.variance < 0.2) parts.push('steady tone');
  return parts.join(' · ') || 'neutral delivery';
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
