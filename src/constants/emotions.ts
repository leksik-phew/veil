import type { Emotion, EmotionId, TriggerId } from '../types';

export const EMOTIONS: Emotion[] = [
  { id: 'joy',          label: 'joy',          color: '#FFD93D', angle: 0   },
  { id: 'trust',        label: 'trust',        color: '#6BCB77', angle: 45  },
  { id: 'fear',         label: 'fear',         color: '#4ECDC4', angle: 90  },
  { id: 'surprise',     label: 'surprise',     color: '#74B9FF', angle: 135 },
  { id: 'sadness',      label: 'sadness',      color: '#A29BFE', angle: 180 },
  { id: 'disgust',      label: 'disgust',      color: '#FD79A8', angle: 225 },
  { id: 'anger',        label: 'anger',        color: '#FF6B6B', angle: 270 },
  { id: 'anticipation', label: 'anticipation', color: '#FFEAA7', angle: 315 },
];

export const TRIGGERS: { id: TriggerId; label: string }[] = [
  { id: 'work',          label: 'work'          },
  { id: 'relationships', label: 'relationships' },
  { id: 'sleep',         label: 'sleep'         },
  { id: 'health',        label: 'health'        },
  { id: 'exercise',      label: 'exercise'      },
  { id: 'money',         label: 'money'         },
  { id: 'loneliness',    label: 'loneliness'    },
  { id: 'success',       label: 'success'       },
];

export const getEmotion = (id: EmotionId): Emotion =>
  EMOTIONS.find(e => e.id === id) ?? EMOTIONS[0];

export const COLORS = {
  bg:        '#0d0b14',
  card:      'rgba(255,255,255,0.04)',
  border:    'rgba(255,255,255,0.08)',
  accent:    '#8b7cf8',
  accentDim: 'rgba(139,124,248,0.15)',
  teal:      '#4ecdc4',
  text:      'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim:   'rgba(255,255,255,0.25)',
} as const;
