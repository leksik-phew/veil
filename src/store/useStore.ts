import { useEffect, useRef, useState } from 'react';
import {
  clearAllData,
  clearCheckIns,
  clearVoiceEntries,
  computeWeeklyStats,
  fetchCheckIns,
  fetchDailyMood,
  fetchThemeMode,
  fetchVoiceEntries,
  insertCheckIn,
  insertVoiceEntry,
  saveThemeMode,
} from '../db/queries';
import { getThemeColors, type ThemeColors } from '../constants/emotions';
import type { AudioFeatures, CheckIn, EmotionId, ThemeMode, TriggerId, VoiceEntry, WeeklyStats } from '../types';

interface VeilStore {
  checkIns:     CheckIn[];
  voiceEntries: VoiceEntry[];
  stats:        WeeklyStats | null;
  moodChart:    { day: string; avg: number }[];
  heatmapData:  { day: string; avg: number }[]; // 70 days for calendar heatmap
  themeMode:    ThemeMode;
  theme:        ThemeColors;
  loading:      boolean;
  loadAll:       () => Promise<void>;
  setThemeMode:  (mode: ThemeMode) => void;
  addCheckIn:    (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => Promise<void>;
  addVoiceEntry: (
    audioPath: string,
    emotion: EmotionId,
    modelEmotion: EmotionId,
    confidence: number,
    features: AudioFeatures,
    duration: number,
    modelVersion: string,
  ) => Promise<void>;
  resetCheckIns:     () => Promise<void>;
  resetVoiceEntries: () => Promise<void>;
  resetAllData:      () => Promise<void>;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let state: VeilStore = {
  checkIns: [], voiceEntries: [], stats: null, moodChart: [], heatmapData: [],
  themeMode: 'dark', theme: getThemeColors('dark'), loading: false,
  loadAll: async () => {}, setThemeMode: () => {},
  addCheckIn: async () => {}, addVoiceEntry: async () => {},
  resetCheckIns: async () => {}, resetVoiceEntries: async () => {}, resetAllData: async () => {},
};

function setState(patch: Partial<VeilStore>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

Object.assign(state, {
  setThemeMode: (mode: ThemeMode) => {
    setState({ themeMode: mode, theme: getThemeColors(mode) });
    saveThemeMode(mode).catch(e => console.warn('Could not save theme mode:', e));
  },
  loadAll: async () => {
    setState({ loading: true });
    const [checkIns, voiceEntries, stats, moodChart, heatmapData, themeMode] = await Promise.all([
      fetchCheckIns(200), fetchVoiceEntries(20), computeWeeklyStats(),
      fetchDailyMood(14), fetchDailyMood(70), fetchThemeMode(),
    ]);
    setState({
      checkIns, voiceEntries, stats, moodChart, heatmapData,
      themeMode, theme: getThemeColors(themeMode), loading: false,
    });
  },
  addCheckIn: async (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => {
    await insertCheckIn(emotion, intensity, triggers, note);
    await state.loadAll();
  },
  addVoiceEntry: async (
    audioPath: string,
    emotion: EmotionId,
    modelEmotion: EmotionId,
    confidence: number,
    features: AudioFeatures,
    duration: number,
    modelVersion: string,
  ) => {
    await insertVoiceEntry(audioPath, emotion, modelEmotion, confidence, features, duration, modelVersion);
    await state.loadAll();
  },
  resetCheckIns: async () => {
    await clearCheckIns();
    await state.loadAll();
  },
  resetVoiceEntries: async () => {
    await clearVoiceEntries();
    await state.loadAll();
  },
  resetAllData: async () => {
    await clearAllData();
    await state.loadAll();
  },
});

export function useVeilStore<T>(selector: (s: VeilStore) => T): T {
  const [, rerender] = useState(0);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useEffect(() => {
    const listener: Listener = () => rerender(n => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return selectorRef.current(state);
}
