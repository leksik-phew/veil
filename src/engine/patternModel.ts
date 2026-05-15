import { getEmotion } from '../constants/emotions';
import type { CheckIn, EmotionId, VoiceEntry } from '../types';

export type NeuralPattern = {
  label: string;
  value: number;
  color: string;
  trigger: string;
  emotion: EmotionId;
};

type PatternEntry = {
  emotion: EmotionId;
  intensity: number;
  triggers: string[];
  createdAt: string;
};

type PatternFeatures = {
  support: number;
  lift: number;
  intensityDelta: number;
  recency: number;
  consistency: number;
  reliability: number;
};

const MODEL_VERSION = 'veil-pattern-bayes-net-v2';
const WEIGHTS = [0.72, 1.28, 0.58, 0.5, 0.8, 1.1];
const BIAS = -1.42;

export function buildNeuralPatterns(checkIns: CheckIn[], voiceEntries: VoiceEntry[] = [], limit = 4): NeuralPattern[] {
  const allEntries = buildPatternEntries(checkIns, voiceEntries);
  if (allEntries.length < 3) return [];

  const globalEmotionCounts = countEmotions(allEntries);
  const triggerBuckets = new Map<string, PatternEntry[]>();
  for (const entry of allEntries) {
    for (const trigger of entry.triggers) {
      const bucket = triggerBuckets.get(trigger) ?? [];
      bucket.push(entry);
      triggerBuckets.set(trigger, bucket);
    }
  }

  const candidates: NeuralPattern[] = [];
  for (const [trigger, entries] of triggerBuckets.entries()) {
    if (entries.length < 2) continue;
    const emotionCounts = countEmotions(entries);
    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionId | undefined;
    if (!topEmotion) continue;

    const features = extractPatternFeatures(entries, allEntries, topEmotion, globalEmotionCounts);
    const emotion = getEmotion(topEmotion);
    candidates.push({
      label: `${trigger} -> ${emotion.label}`,
      value: scorePattern(features),
      color: emotion.color,
      trigger,
      emotion: topEmotion,
    });
  }

  return candidates.sort((a, b) => b.value - a.value).slice(0, limit);
}

export function getPatternModelVersion() {
  return MODEL_VERSION;
}

function extractPatternFeatures(
  entries: PatternEntry[],
  allEntries: PatternEntry[],
  topEmotion: EmotionId,
  globalEmotionCounts: Record<string, number>,
): PatternFeatures {
  const triggerEmotionCount = entries.filter(e => e.emotion === topEmotion).length;
  const triggerRate = smoothedRate(triggerEmotionCount, entries.length, 1, 2);
  const baseRate = (globalEmotionCounts[topEmotion] ?? 0) / Math.max(allEntries.length, 1);
  const lift = triggerRate / Math.max(baseRate, 0.05);
  const avgIntensity = entries.reduce((sum, e) => sum + e.intensity, 0) / Math.max(entries.length, 1);
  const globalAvgIntensity = allEntries.reduce((sum, e) => sum + e.intensity, 0) / Math.max(allEntries.length, 1);
  const newest = entries.reduce((max, e) => Math.max(max, new Date(e.createdAt).getTime()), 0);
  const ageDays = Math.max(0, (Date.now() - newest) / 86400000);
  const reliability = Math.sqrt(entries.length / (entries.length + 6));

  return {
    support: clamp(Math.log1p(entries.length) / Math.log1p(Math.max(allEntries.length, 2))),
    lift: clamp((lift - 0.75) / 2.25),
    intensityDelta: clamp((avgIntensity - globalAvgIntensity + 4) / 8),
    recency: Math.exp(-ageDays / 21),
    consistency: clamp(triggerRate),
    reliability,
  };
}

function scorePattern(features: PatternFeatures) {
  const x = [
    features.support,
    features.lift,
    features.intensityDelta,
    features.recency,
    features.consistency,
    features.reliability,
  ];
  const logit = x.reduce((sum, v, i) => sum + v * WEIGHTS[i], BIAS);
  return clamp(0.25 + sigmoid(logit) * 0.68, 0.25, 0.93);
}

function buildPatternEntries(checkIns: CheckIn[], voiceEntries: VoiceEntry[]): PatternEntry[] {
  return [
    ...checkIns.map(entry => ({
      emotion: entry.emotion,
      intensity: entry.intensity,
      triggers: [...entry.triggers],
      createdAt: entry.createdAt,
    })),
    ...voiceEntries.map(entry => ({
      emotion: entry.detectedEmotion,
      intensity: voicePatternIntensity(entry),
      triggers: ['voice journal'],
      createdAt: entry.createdAt,
    })),
  ];
}

export function voicePatternIntensity(entry: VoiceEntry) {
  const arousal = clamp(
    entry.energy * 0.38 +
    entry.variance * 0.18 +
    entry.tempo * 0.14 +
    entry.attack * 0.16 +
    entry.peakRatio * 0.14 -
    entry.silenceRatio * 0.12,
  );
  return 1 + arousal * 9;
}

function countEmotions(entries: PatternEntry[]) {
  const counts: Record<string, number> = {};
  for (const entry of entries) counts[entry.emotion] = (counts[entry.emotion] ?? 0) + 1;
  return counts;
}

function sigmoid(v: number) {
  return 1 / (1 + Math.exp(-v));
}

function smoothedRate(successes: number, total: number, priorSuccesses: number, priorTotal: number) {
  return (successes + priorSuccesses) / Math.max(total + priorTotal, 1);
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
