export type EmotionId =
  | 'joy' | 'trust' | 'fear' | 'surprise'
  | 'sadness' | 'disgust' | 'anger' | 'anticipation';

export interface Emotion {
  id: EmotionId;
  label: string;
  color: string;
  angle: number;
}

export type TriggerId =
  | 'work' | 'relationships' | 'sleep' | 'health'
  | 'exercise' | 'money' | 'loneliness' | 'success';

export type ThemeMode = 'dark' | 'light';

export interface CheckIn {
  id: number;
  emotion: EmotionId;
  intensity: number;
  triggers: TriggerId[];
  note: string;
  createdAt: string;
}

export interface VoiceEntry {
  id: number;
  audioPath: string;
  detectedEmotion: EmotionId;
  modelEmotion: EmotionId;
  confidence: number;
  energy: number;
  variance: number;
  tempo: number;
  peakRatio: number;
  dynamicRange: number;
  attack: number;
  silenceRatio: number;
  stability: number;
  modelVersion: string;
  durationSeconds: number;
  createdAt: string;
}

export interface AudioFeatures {
  energy: number;
  variance: number;
  tempo: number;
  peakRatio: number;
  dynamicRange: number;
  attack: number;
  silenceRatio: number;
  stability: number;
}

export interface WeeklyStats {
  totalEntries: number;
  streak: number;
  topEmotion: EmotionId | null;
  topTrigger: TriggerId | null;
  averageIntensity: number;
}
