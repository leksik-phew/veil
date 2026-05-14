import { useEffect, useRef, useState } from 'react';
import {
  computeWeeklyStats,
  fetchCheckIns,
  fetchDailyMood,
  fetchVoiceEntries,
  insertCheckIn,
  insertVoiceEntry,
} from '../db/queries';
import type { AudioFeatures, CheckIn, EmotionId, TriggerId, VoiceEntry, WeeklyStats } from '../types';

interface VeilStore {
  checkIns:     CheckIn[];
  voiceEntries: VoiceEntry[];
  stats:        WeeklyStats | null;
  moodChart:    { day: string; avg: number }[];
  loading:      boolean;
  loadAll:       () => Promise<void>;
  addCheckIn:    (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => Promise<void>;
  addVoiceEntry: (audioPath: string, emotion: EmotionId, confidence: number, features: AudioFeatures, duration: number) => Promise<void>;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let state: VeilStore = {
  checkIns: [], voiceEntries: [], stats: null, moodChart: [], loading: false,
  loadAll: async () => {}, addCheckIn: async () => {}, addVoiceEntry: async () => {},
};

function setState(patch: Partial<VeilStore>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

Object.assign(state, {
  loadAll: async () => {
    setState({ loading: true });
    const [checkIns, voiceEntries, stats, moodChart] = await Promise.all([
      fetchCheckIns(50), fetchVoiceEntries(20), computeWeeklyStats(), fetchDailyMood(14),
    ]);
    setState({ checkIns, voiceEntries, stats, moodChart, loading: false });
  },
  addCheckIn: async (emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string) => {
    await insertCheckIn(emotion, intensity, triggers, note);
    await state.loadAll();
  },
  addVoiceEntry: async (audioPath: string, emotion: EmotionId, confidence: number, features: AudioFeatures, duration: number) => {
    await insertVoiceEntry(audioPath, emotion, confidence, features, duration);
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