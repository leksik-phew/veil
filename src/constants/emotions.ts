import type { Emotion, EmotionId, ThemeMode, TriggerId } from '../types';

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

export type ThemeColors = {
  bg:             string;
  card:           string;
  border:         string;
  accent:         string;
  accentDim:      string;
  teal:           string;
  text:           string;
  textMuted:      string;
  textDim:        string;
  input:          string;
  chip:           string;
  chipActive:     string;      // active chip background
  chipBorderActive: string;    // active chip border
  chipTextActive: string;      // text inside active chip
  textOnAccent:   string;      // text on accent-color button
  wheelCenter:    string;      // PlutchikWheel center fill
  danger:         string;
};

export const DARK_COLORS: ThemeColors = {
  bg:             '#0d0b14',
  card:           'rgba(255,255,255,0.04)',
  border:         'rgba(255,255,255,0.08)',
  accent:         '#8b7cf8',
  accentDim:      'rgba(139,124,248,0.15)',
  teal:           '#4ecdc4',
  text:           'rgba(255,255,255,0.92)',
  textMuted:      'rgba(255,255,255,0.45)',
  textDim:        'rgba(255,255,255,0.25)',
  input:          'rgba(255,255,255,0.04)',
  chip:           'rgba(255,255,255,0.05)',
  chipActive:     'rgba(139,124,248,0.20)',
  chipBorderActive:'rgba(139,124,248,0.50)',
  chipTextActive: '#c4b8ff',
  textOnAccent:   '#0d0b14',
  wheelCenter:    '#1a1625',
  danger:         '#FF6B6B',
};

export const LIGHT_COLORS: ThemeColors = {
  bg:             '#f5f1eb',
  card:           'rgba(20,15,35,0.055)',
  border:         'rgba(20,15,35,0.10)',
  accent:         '#6c5dd3',
  accentDim:      'rgba(108,93,211,0.13)',
  teal:           '#1a9e96',
  text:           'rgba(20,15,35,0.92)',
  textMuted:      'rgba(20,15,35,0.55)',
  textDim:        'rgba(20,15,35,0.32)',
  input:          'rgba(20,15,35,0.055)',
  chip:           'rgba(20,15,35,0.07)',
  chipActive:     'rgba(108,93,211,0.14)',
  chipBorderActive:'rgba(108,93,211,0.45)',
  chipTextActive: '#6c5dd3',
  textOnAccent:   '#ffffff',
  wheelCenter:    '#ede9e2',
  danger:         '#cc4040',
};

export const getThemeColors = (mode: ThemeMode): ThemeColors =>
  mode === 'light' ? LIGHT_COLORS : DARK_COLORS;

// Static fallback — use only in components that can't call useVeilStore
export const COLORS = DARK_COLORS;

// Localised emotion label — use inside a React component
import { TRANSLATIONS } from '../i18n/translations';
import type { Lang } from '../i18n/translations';
export function getEmotionLabel(id: EmotionId, lang: Lang): string {
  return TRANSLATIONS[lang].emotions[id];
}
