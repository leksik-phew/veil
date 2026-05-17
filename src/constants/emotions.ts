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
  card:           'rgba(20,15,35,0.07)',
  border:         'rgba(20,15,35,0.14)',
  accent:         '#6c5dd3',
  accentDim:      'rgba(108,93,211,0.12)',
  teal:           '#1a9e96',
  text:           'rgba(20,15,35,0.92)',
  textMuted:      'rgba(20,15,35,0.62)',
  textDim:        'rgba(20,15,35,0.42)',
  input:          '#e8e4dc',
  chip:           'rgba(20,15,35,0.09)',
  chipActive:     'rgba(108,93,211,0.18)',
  chipBorderActive:'rgba(108,93,211,0.60)',
  chipTextActive: '#6c5dd3',
  textOnAccent:   '#ffffff',
  wheelCenter:    '#ede9e2',
  danger:         '#b32020',
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

// Darker readable versions for use as TEXT on light backgrounds.
// The original pastel colors (joy: #FFD93D, anticipation: #FFEAA7, etc.)
// are invisible on the #f5f1eb background.
const EMOTION_TEXT_COLORS_LIGHT: Record<EmotionId, string> = {
  joy:          '#7a5800',   // dark amber
  trust:        '#1a6b2a',   // dark green
  fear:         '#0a6460',   // dark teal
  surprise:     '#0a52a0',   // dark blue
  sadness:      '#4232b0',   // dark purple
  disgust:      '#a00e50',   // dark pink/magenta
  anger:        '#a01818',   // dark red
  anticipation: '#6e4e00',   // dark gold
};

/**
 * Returns the emotion color safe for use as text.
 * On dark theme: original vibrant color.
 * On light theme: a darker, high-contrast variant.
 */
export function getEmotionColorForText(id: EmotionId, isLight: boolean): string {
  if (!isLight) return getEmotion(id).color;
  return EMOTION_TEXT_COLORS_LIGHT[id] ?? getEmotion(id).color;
}
