import { useEffect, useRef, useState } from 'react';
import {
  clearAllData, clearCheckIns, clearVoiceEntries,
  computeWeeklyStats, fetchCheckIns, fetchDailyMood,
  fetchThemeMode, fetchVoiceEntries, insertCheckIn, insertVoiceEntry,
  saveThemeMode, saveFineTuningState, loadFineTuningState, clearFineTuningState,
} from '../db/queries';
import { getThemeColors, type ThemeColors } from '../constants/emotions';
import {
  initModelFromState, applyConfirmation, defaultFineTuningState, resetModelToDefaults,
} from '../engine/localEmotionModel';
import type {
  AudioFeatures, CheckIn, EmotionId, FineTuningState,
  ThemeMode, TriggerId, VoiceEntry, WeeklyStats,
} from '../types';

interface VeilStore {
  checkIns:         CheckIn[];
  voiceEntries:     VoiceEntry[];
  stats:            WeeklyStats | null;
  moodChart:        { day: string; avg: number }[];
  heatmapData:      { day: string; avg: number }[];
  themeMode:        ThemeMode;
  theme:            ThemeColors;
  fineTuningState:  FineTuningState;
  loading:          boolean;

  loadAll:           () => Promise<void>;
  setThemeMode:      (mode: ThemeMode) => void;
  addCheckIn:        (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => Promise<void>;
  addVoiceEntry:     (
    audioPath: string, emotion: EmotionId, modelEmotion: EmotionId,
    confidence: number, features: AudioFeatures, duration: number, modelVersion: string,
  ) => Promise<void>;
  resetCheckIns:     () => Promise<void>;
  resetVoiceEntries: () => Promise<void>;
  resetAllData:      () => Promise<void>;
  resetFineTuning:   () => Promise<void>;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const _default = defaultFineTuningState();

let state: VeilStore = {
  checkIns: [], voiceEntries: [], stats: null, moodChart: [], heatmapData: [],
  themeMode: 'dark', theme: getThemeColors('dark'),
  fineTuningState: _default,
  loading: false,
  loadAll: async () => {}, setThemeMode: () => {},
  addCheckIn: async () => {}, addVoiceEntry: async () => {},
  resetCheckIns: async () => {}, resetVoiceEntries: async () => {},
  resetAllData: async () => {}, resetFineTuning: async () => {},
};

function setState(patch: Partial<VeilStore>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

Object.assign(state, {
  setThemeMode: (mode: ThemeMode) => {
    setState({ themeMode: mode, theme: getThemeColors(mode) });
    saveThemeMode(mode).catch(e => console.warn('saveThemeMode:', e));
  },

  loadAll: async () => {
    setState({ loading: true });
    const [
      checkIns, voiceEntries, stats, moodChart, heatmapData,
      themeMode, savedFT,
    ] = await Promise.all([
      fetchCheckIns(200), fetchVoiceEntries(20), computeWeeklyStats(),
      fetchDailyMood(14), fetchDailyMood(70), fetchThemeMode(),
      loadFineTuningState(),
    ]);

    // Apply persisted fine-tuning to the in-memory model
    const fineTuningState = savedFT ?? defaultFineTuningState();
    if (savedFT) initModelFromState(savedFT);

    setState({
      checkIns, voiceEntries, stats, moodChart, heatmapData,
      themeMode, theme: getThemeColors(themeMode),
      fineTuningState, loading: false,
    });
  },

  addCheckIn: async (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => {
    await insertCheckIn(emotion, intensity, triggers, note);
    await state.loadAll();
  },

  addVoiceEntry: async (
    audioPath: string, emotion: EmotionId, modelEmotion: EmotionId,
    confidence: number, features: AudioFeatures, duration: number, modelVersion: string,
  ) => {
    // 1. Persist the voice entry
    await insertVoiceEntry(audioPath, emotion, modelEmotion, confidence, features, duration, modelVersion);

    // 2. Fine-tune the prototype model with this confirmed label
    const newFTState = applyConfirmation(
      features, emotion, modelEmotion, state.fineTuningState,
    );

    // 3. Persist the updated fine-tuning state
    await saveFineTuningState(newFTState);

    // 4. Update store + reload entries
    setState({ fineTuningState: newFTState });
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

  resetFineTuning: async () => {
    await clearFineTuningState();
    resetModelToDefaults();
    const fresh = defaultFineTuningState();
    setState({ fineTuningState: fresh });
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
