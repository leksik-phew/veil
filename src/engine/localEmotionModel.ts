import type { AudioFeatures, EmotionId, FineTuningState } from '../types';

type EmotionModelOutput = {
  emotion: EmotionId;
  confidence: number;
  probabilities: Record<EmotionId, number>;
  modelVersion: string;
};

type EmotionPrototype = {
  id: EmotionId;
  center: number[];
  weights: number[];
  bias: number;
};

export const MODEL_VERSION = 'veil-audio-prototype-net-v2';

export const EMOTION_ORDER: EmotionId[] = [
  'joy', 'trust', 'fear', 'surprise',
  'sadness', 'disgust', 'anger', 'anticipation',
];

// Feature order for input vector:
// [arousal, valenceProxy, energy, variance, tempo, peakRatio,
//  dynamicRange, attack, silenceRatio, stability]
const PROTOTYPES: EmotionPrototype[] = [
  { id: 'joy',          center: [0.72, 0.78, 0.62, 0.42, 0.58, 0.48, 0.48, 0.42, 0.10, 0.62], weights: [1.35, 1.55, 0.72, 0.72, 0.92, 0.42, 0.44, 0.48, 1.08, 1.05], bias: 0.05 },
  { id: 'trust',        center: [0.38, 0.82, 0.42, 0.18, 0.22, 0.34, 0.20, 0.16, 0.14, 0.84], weights: [1.15, 1.75, 0.66, 1.0,  0.86, 0.34, 0.66, 0.72, 0.82, 1.45], bias: 0.02 },
  { id: 'fear',         center: [0.76, 0.18, 0.44, 0.76, 0.78, 0.24, 0.66, 0.72, 0.28, 0.18], weights: [1.35, 1.42, 0.46, 1.45, 1.25, 0.36, 1.0,  1.15, 0.72, 1.0 ], bias: 0.03 },
  { id: 'surprise',     center: [0.78, 0.50, 0.58, 0.70, 0.68, 0.32, 0.72, 0.86, 0.20, 0.24], weights: [1.38, 0.42, 0.56, 1.28, 1.0,  0.38, 1.32, 1.45, 0.62, 0.82], bias: 0.01 },
  { id: 'sadness',      center: [0.20, 0.22, 0.22, 0.20, 0.16, 0.22, 0.18, 0.12, 0.52, 0.58], weights: [1.6,  1.45, 1.15, 0.88, 1.15, 0.42, 0.72, 0.86, 1.28, 0.72], bias: 0.04 },
  { id: 'disgust',      center: [0.36, 0.16, 0.34, 0.52, 0.32, 0.30, 0.48, 0.32, 0.36, 0.30], weights: [1.0,  1.55, 0.56, 1.22, 0.82, 0.42, 0.96, 0.66, 0.86, 0.72], bias: -0.01 },
  { id: 'anger',        center: [0.88, 0.12, 0.82, 0.46, 0.58, 0.74, 0.56, 0.68, 0.06, 0.30], weights: [1.72, 1.72, 1.22, 0.72, 0.92, 1.32, 0.66, 1.05, 1.15, 0.88], bias: 0.12 },
  { id: 'anticipation', center: [0.66, 0.58, 0.52, 0.38, 0.72, 0.58, 0.42, 0.48, 0.14, 0.48], weights: [1.2,  0.88, 0.62, 0.58, 1.38, 0.98, 0.62, 0.72, 0.72, 0.58], bias: -0.04 },
];

// ── Mutable prototype centers (fine-tuned at runtime) ────────────────────────
// Starts as a deep copy of PROTOTYPES defaults. Updated by applyConfirmation().
let currentCenters: Record<EmotionId, number[]> = Object.fromEntries(
  PROTOTYPES.map(p => [p.id, [...p.center]])
) as Record<EmotionId, number[]>;

// ── Fine-tuning hyperparameters ───────────────────────────────────────────────
const BASE_LR_CONFIRM   = 0.12;  // learning rate for confirmed (correct) prediction
const BASE_LR_CORRECT   = 0.16;  // learning rate for pulling correct prototype
const PUSH_LR           = 0.040; // rate for pushing wrong prototype away
const LR_DECAY          = 0.060; // how fast lr decays with more examples
const MIN_LR            = 0.015; // minimum learning rate (never fully stops)

function learningRate(baseLR: number, count: number): number {
  return Math.max(MIN_LR, baseLR / (1 + count * LR_DECAY));
}

// ── Public: initialise model from persisted fine-tuning state ────────────────
export function initModelFromState(state: FineTuningState): void {
  // Only apply if the state was built on the same base model version
  if (state.baseModelVersion !== MODEL_VERSION) return;
  for (const eid of EMOTION_ORDER) {
    const center = state.centers[eid];
    if (center && center.length === 10) {
      currentCenters[eid] = [...center];
    }
  }
}

// ── Public: reset fine-tuning back to bundled defaults ───────────────────────
export function resetModelToDefaults(): void {
  currentCenters = Object.fromEntries(
    PROTOTYPES.map(p => [p.id, [...p.center]])
  ) as Record<EmotionId, number[]>;
}

// ── Public: apply one voice confirmation and return the new state ─────────────
export function applyConfirmation(
  features: AudioFeatures,
  confirmedEmotion: EmotionId,
  modelEmotion: EmotionId,
  prevState: FineTuningState,
): FineTuningState {
  const input    = buildModelInput(features);
  const centers  = deepCopyCenters(prevState.centers);
  const counts   = { ...prevState.counts };
  const wasCorrect = confirmedEmotion === modelEmotion;

  if (wasCorrect) {
    // Model was right — pull its prototype toward this voice sample
    const count = counts[confirmedEmotion] ?? 0;
    const lr    = learningRate(BASE_LR_CONFIRM, count);
    centers[confirmedEmotion] = emaUpdate(centers[confirmedEmotion], input, lr);
    counts[confirmedEmotion]  = count + 1;

  } else {
    // Model was wrong — correct + wrong prototype updates
    const cCount = counts[confirmedEmotion] ?? 0;
    const lr_c   = learningRate(BASE_LR_CORRECT, cCount);
    centers[confirmedEmotion] = emaUpdate(centers[confirmedEmotion], input, lr_c);
    counts[confirmedEmotion]  = cCount + 1;

    // Gently push the wrong prototype away from this input
    centers[modelEmotion] = pushAway(centers[modelEmotion], input, PUSH_LR);
  }

  // Apply the updated centers to the in-memory model immediately
  for (const eid of EMOTION_ORDER) {
    currentCenters[eid] = [...centers[eid]];
  }

  return {
    centers,
    counts,
    totalConfirmations: prevState.totalConfirmations + 1,
    baseModelVersion:   MODEL_VERSION,
    lastUpdated:        new Date().toISOString(),
  };
}

// ── Public: default state (no fine-tuning yet) ────────────────────────────────
export function defaultFineTuningState(): FineTuningState {
  return {
    centers: Object.fromEntries(
      PROTOTYPES.map(p => [p.id, [...p.center]])
    ) as Record<EmotionId, number[]>,
    counts: Object.fromEntries(
      EMOTION_ORDER.map(e => [e, 0])
    ) as Record<EmotionId, number>,
    totalConfirmations: 0,
    baseModelVersion:   MODEL_VERSION,
    lastUpdated:        null,
  };
}

// ── Classification (uses currentCenters, which may be fine-tuned) ─────────────
export function classifyEmotionWithLocalModel(features: AudioFeatures): EmotionModelOutput {
  const input  = buildModelInput(features);
  const logits = PROTOTYPES.map(p => prototypeLogit(input, p, currentCenters[p.id]));
  const adjusted = applyAcousticEvidence(logits, input);
  const probs    = softmax(adjusted, 0.68);
  const ranked   = probs
    .map((p, i) => ({ emotion: EMOTION_ORDER[i], p }))
    .sort((a, b) => b.p - a.p);
  const margin     = ranked[0].p - ranked[1].p;
  const confidence = clamp(0.42 + margin * 0.92 + ranked[0].p * 0.18, 0.42, 0.92);

  return {
    emotion: ranked[0].emotion,
    confidence,
    probabilities: EMOTION_ORDER.reduce((acc, emotion, i) => {
      acc[emotion] = probs[i]; return acc;
    }, {} as Record<EmotionId, number>),
    modelVersion: MODEL_VERSION,
  };
}

export function getLocalEmotionModelVersion(): string {
  return MODEL_VERSION;
}

// ── Feature engineering (exported for fine-tuning input construction) ─────────
export function buildModelInput(f: AudioFeatures): number[] {
  const energy       = clamp(f.energy);
  const variance     = clamp(f.variance);
  const tempo        = clamp(f.tempo);
  const peakRatio    = clamp(f.peakRatio);
  const dynamicRange = clamp(f.dynamicRange);
  const attack       = clamp(f.attack);
  const silenceRatio = clamp(f.silenceRatio);
  const stability    = clamp(f.stability);

  const arousal = clamp(
    energy * 0.34 + variance * 0.20 + tempo * 0.18 +
    attack * 0.16 + peakRatio * 0.12 - silenceRatio * 0.18,
  );
  const valenceProxy = clamp(
    stability * 0.38 + (1 - silenceRatio) * 0.20 +
    (1 - Math.abs(energy - 0.56)) * 0.18 +
    (1 - Math.abs(tempo - 0.5)) * 0.12 +
    peakRatio * 0.12 - dynamicRange * 0.18,
  );

  return [arousal, valenceProxy, energy, variance, tempo,
          peakRatio, dynamicRange, attack, silenceRatio, stability];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// Prototype distance logit — uses supplied center (may be fine-tuned)
function prototypeLogit(
  input: number[],
  prototype: EmotionPrototype,
  center: number[],
): number {
  const distance = input.reduce((sum, v, i) => {
    const diff = v - center[i];
    return sum + prototype.weights[i] * diff * diff;
  }, 0);
  return prototype.bias - distance;
}

function applyAcousticEvidence(logits: number[], input: number[]): number[] {
  const [arousal, valenceProxy, energy, variance, tempo,
         peakRatio, dynamicRange, attack, silenceRatio, stability] = input;
  const adjusted = [...logits];
  const idx = (e: EmotionId) => EMOTION_ORDER.indexOf(e);

  adjusted[idx('anger')]        += high(energy, 0.62) * high(peakRatio, 0.48) * high(attack, 0.42) * low(stability, 0.48) * 3.2;
  adjusted[idx('fear')]         += high(variance, 0.52) * high(tempo, 0.52) * low(stability, 0.42) * 0.95;
  adjusted[idx('surprise')]     += high(dynamicRange, 0.48) * high(attack, 0.55) * 0.75;
  adjusted[idx('sadness')]      += low(arousal, 0.38) * high(silenceRatio, 0.32) * low(energy, 0.34) * 1.15;
  adjusted[idx('trust')]        += high(stability, 0.68) * low(arousal, 0.52) * high(valenceProxy, 0.64) * 0.85;
  adjusted[idx('joy')]          += high(valenceProxy, 0.6) * high(arousal, 0.48) * high(stability, 0.42) * 0.72;
  adjusted[idx('anticipation')] += high(tempo, 0.58) * high(peakRatio, 0.42) * high(valenceProxy, 0.48) * high(stability, 0.34) * 0.48;
  adjusted[idx('anticipation')] -= high(attack, 0.44) * low(stability, 0.45) * 0.72;
  adjusted[idx('disgust')]      += low(valenceProxy, 0.34) * high(variance, 0.36) * low(arousal, 0.58) * 0.62;

  return adjusted;
}

// Exponential moving average update: new = (1-lr)*old + lr*target
function emaUpdate(center: number[], input: number[], lr: number): number[] {
  return center.map((c, i) => clamp(c * (1 - lr) + input[i] * lr));
}

// Push center away from input: new = old - lr*(input-old) = (1+lr)*old - lr*input
function pushAway(center: number[], input: number[], lr: number): number[] {
  return center.map((c, i) => clamp(c * (1 + lr) - input[i] * lr));
}

function deepCopyCenters(
  centers: Record<EmotionId, number[]>
): Record<EmotionId, number[]> {
  return Object.fromEntries(
    EMOTION_ORDER.map(e => [e, [...(centers[e] ?? [])]])
  ) as Record<EmotionId, number[]>;
}

function high(value: number, threshold: number): number {
  return clamp((value - threshold) / Math.max(1 - threshold, 0.001));
}

function low(value: number, threshold: number): number {
  return clamp((threshold - value) / Math.max(threshold, 0.001));
}

function softmax(values: number[], temperature = 1): number[] {
  const max  = Math.max(...values);
  const exps = values.map(v => Math.exp((v - max) / temperature));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
