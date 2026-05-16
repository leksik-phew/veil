import { useEffect, useRef, useState } from 'react';
import {
  clearAllData, clearCheckIns, clearVoiceEntries,
  computeWeeklyStats, fetchCheckIns, fetchDailyMood,
  fetchThemeMode, fetchVoiceEntries, insertCheckIn, insertVoiceEntry,
  saveThemeMode, saveLang, fetchLang,
  saveFineTuningState, loadFineTuningState, clearFineTuningState,
} from '../db/queries';
import {
  exportData as _exportData,
  importData as _importData,
  pickBackupFile,
  type VeilBackupFile,
  type ImportMode,
} from '../db/exportImport';
import { getThemeColors, type ThemeColors } from '../constants/emotions';
import {
  initModelFromState, applyConfirmation, defaultFineTuningState, resetModelToDefaults,
} from '../engine/localEmotionModel';
import type {
  AudioFeatures, CheckIn, EmotionId, FineTuningState,
  Lang, ThemeMode, TriggerId, VoiceEntry, WeeklyStats,
} from '../types';

interface VeilStore {
  checkIns:        CheckIn[];
  voiceEntries:    VoiceEntry[];
  stats:           WeeklyStats | null;
  moodChart:       { day: string; avg: number }[];
  heatmapData:     { day: string; avg: number }[];
  themeMode:       ThemeMode;
  theme:           ThemeColors;
  lang:            Lang;
  fineTuningState: FineTuningState;
  loading:         boolean;

  loadAll:           () => Promise<void>;
  setThemeMode:      (mode: ThemeMode) => void;
  setLang:           (lang: Lang) => void;
  addCheckIn:        (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => Promise<void>;
  addVoiceEntry:     (
    audioPath: string, emotion: EmotionId, modelEmotion: EmotionId,
    confidence: number, features: AudioFeatures, duration: number, modelVersion: string,
  ) => Promise<void>;
  resetCheckIns:     () => Promise<void>;
  resetVoiceEntries: () => Promise<void>;
  resetAllData:      () => Promise<void>;
  resetFineTuning:   () => Promise<void>;
  // Export / Import
  exportData:        () => Promise<void>;
  pickBackupFile:    () => Promise<VeilBackupFile | null>;
  importData:        (file: VeilBackupFile, mode: ImportMode, includeSettings: boolean, includeFineTuning: boolean) => Promise<void>;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const _default = defaultFineTuningState();

let state: VeilStore = {
  checkIns: [], voiceEntries: [], stats: null, moodChart: [], heatmapData: [],
  themeMode: 'dark', theme: getThemeColors('dark'),
  lang: 'en',
  fineTuningState: _default,
  loading: false,
  loadAll: async () => {}, setThemeMode: () => {}, setLang: () => {},
  addCheckIn: async () => {}, addVoiceEntry: async () => {},
  resetCheckIns: async () => {}, resetVoiceEntries: async () => {},
  resetAllData: async () => {}, resetFineTuning: async () => {},
  exportData: async () => {}, pickBackupFile: async () => null, importData: async () => {},
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

  setLang: (lang: Lang) => {
    setState({ lang });
    saveLang(lang).catch(e => console.warn('saveLang:', e));
  },

  loadAll: async () => {
    setState({ loading: true });
    const [
      checkIns, voiceEntries, stats, moodChart, heatmapData,
      themeMode, lang, savedFT,
    ] = await Promise.all([
      fetchCheckIns(200), fetchVoiceEntries(20), computeWeeklyStats(),
      fetchDailyMood(14), fetchDailyMood(70), fetchThemeMode(), fetchLang(),
      loadFineTuningState(),
    ]);

    const fineTuningState = savedFT ?? defaultFineTuningState();
    if (savedFT) initModelFromState(savedFT);

    setState({
      checkIns, voiceEntries, stats, moodChart, heatmapData,
      themeMode, theme: getThemeColors(themeMode),
      lang,
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
    await insertVoiceEntry(audioPath, emotion, modelEmotion, confidence, features, duration, modelVersion);
    const newFTState = applyConfirmation(features, emotion, modelEmotion, state.fineTuningState);
    await saveFineTuningState(newFTState);
    setState({ fineTuningState: newFTState });
    await state.loadAll();
  },

  resetCheckIns:     async () => { await clearCheckIns();   await state.loadAll(); },
  resetVoiceEntries: async () => { await clearVoiceEntries(); await state.loadAll(); },
  resetAllData:      async () => { await clearAllData(); await clearFineTuningState(); resetModelToDefaults(); setState({ fineTuningState: defaultFineTuningState() }); await state.loadAll(); },

  resetFineTuning: async () => {
    await clearFineTuningState();
    resetModelToDefaults();
    setState({ fineTuningState: defaultFineTuningState() });
  },

  // ── Export / Import ────────────────────────────────────────────────────────
  exportData: async () => {
    await _exportData();
  },

  pickBackupFile: async () => {
    return pickBackupFile();
  },

  importData: async (
    file: VeilBackupFile,
    mode: ImportMode,
    includeSettings:   boolean,
    includeFineTuning: boolean,
  ) => {
    await _importData(file, mode, includeSettings, includeFineTuning);

    // Immediately apply settings to in-memory state if included
    if (includeSettings) {
      setState({
        themeMode: file.settings.themeMode,
        theme:     getThemeColors(file.settings.themeMode),
        lang:      file.settings.lang,
      });
    }
    if (includeFineTuning && file.fineTuningState) {
      initModelFromState(file.fineTuningState);
      setState({ fineTuningState: file.fineTuningState });
    }

    // Reload all entries from DB
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

// Re-export types that settings.tsx needs
export type { VeilBackupFile, ImportMode };
