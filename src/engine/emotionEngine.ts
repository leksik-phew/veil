/**
 * Veil Emotion Engine — standalone local neural classifier.
 *
 * Pipeline:
 *  1. expo-av records audio with isMeteringEnabled: true
 *  2. Every 100ms, amplitude (dBFS) is sampled
 *  3. extractFeatures() computes amplitude and dynamics features
 *  4. classifyEmotion() runs an embedded neural model on-device
 */

import type { AudioFeatures, EmotionId } from '../types';
import { classifyEmotionWithLocalModel, getLocalEmotionModelVersion } from './localEmotionModel';

/** Convert dBFS (-60..0) to amplitude (0..1) */
export function dbToAmplitude(db: number): number {
  return (Math.max(-60, Math.min(0, db)) + 60) / 60;
}

/** Extract signal features from amplitude sample array (0..1) */
export function extractFeatures(samples: number[]): AudioFeatures {
  const clean = samples.filter(Number.isFinite).map(s => clamp(s));
  if (clean.length === 0) {
    return {
      energy: 0,
      variance: 0,
      tempo: 0,
      peakRatio: 0,
      dynamicRange: 0,
      attack: 0,
      silenceRatio: 1,
      stability: 0,
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const p10 = percentile(sorted, 0.1);
  const p50 = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  const energy = clean.reduce((a, b) => a + b, 0) / clean.length;

  const variance = Math.sqrt(
    clean.map(s => (s - energy) ** 2).reduce((a, b) => a + b, 0) / clean.length,
  );

  let crossings = 0;
  let positiveDelta = 0;
  let totalDelta = 0;
  for (let i = 1; i < clean.length; i++) {
    if ((clean[i - 1] < p50) !== (clean[i] < p50)) crossings++;
    const delta = clean[i] - clean[i - 1];
    if (delta > 0) positiveDelta += delta;
    totalDelta += Math.abs(delta);
  }

  const tempo = Math.min(1, (crossings / Math.max(clean.length - 1, 1)) * 2.4);
  const peak = Math.max(...clean);
  const peakThreshold = Math.max(p90 * 0.86, peak * 0.62, 0.08);
  const peakRatio = clean.filter(s => s >= peakThreshold).length / clean.length;
  const silenceThreshold = Math.max(0.06, p50 * 0.42);
  const silenceRatio = clean.filter(s => s <= silenceThreshold).length / clean.length;
  const dynamicRange = clamp((p90 - p10) * 2.4);
  const attack = clamp((positiveDelta / Math.max(clean.length - 1, 1)) * 9);
  const instability = clamp(variance * 2.2 + totalDelta / Math.max(clean.length - 1, 1) * 4);

  return {
    energy:    clamp(energy),
    variance:  clamp(variance * 2.8),
    tempo:     clamp(tempo),
    peakRatio: clamp(peakRatio),
    dynamicRange,
    attack,
    silenceRatio: clamp(silenceRatio),
    stability: clamp(1 - instability),
  };
}

/** Classify emotion from audio features using the bundled on-device model */
export function classifyEmotion(f: AudioFeatures): {
  emotion: EmotionId;
  confidence: number;
  probabilities: Record<EmotionId, number>;
  modelVersion: string;
} {
  return classifyEmotionWithLocalModel(f);
}

export function emotionModelVersion() {
  return getLocalEmotionModelVersion();
}

export function featureDescription(f: AudioFeatures): string {
  const parts: string[] = [];
  if (f.energy > 0.6)       parts.push('high energy');
  else if (f.energy < 0.3)  parts.push('low energy');
  if (f.tempo > 0.6)        parts.push('fast pace');
  else if (f.tempo < 0.3)   parts.push('slow pace');
  if (f.variance > 0.5)     parts.push('expressive tone');
  else if (f.variance < 0.2) parts.push('steady tone');
  if (f.silenceRatio > 0.35) parts.push('long pauses');
  if (f.attack > 0.55)       parts.push('sharp changes');
  return parts.join(' · ') || 'neutral delivery';
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const mix = idx - lo;
  return sorted[lo] * (1 - mix) + sorted[hi] * mix;
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
