import { getDb } from './database';
import type { CheckIn, VoiceEntry, EmotionId, TriggerId, WeeklyStats, AudioFeatures, ThemeMode } from '../types';

export async function insertCheckIn(
  emotion: EmotionId, intensity: number, triggers: TriggerId[], note: string,
): Promise<number> {
  const r = await getDb().runAsync(
    `INSERT INTO checkins (emotion, intensity, triggers, note) VALUES (?,?,?,?)`,
    emotion, intensity, JSON.stringify(triggers), note,
  );
  return r.lastInsertRowId;
}

export async function fetchCheckIns(limit = 50): Promise<CheckIn[]> {
  const rows = await getDb().getAllAsync<{
    id: number; emotion: string; intensity: number;
    triggers: string; note: string; created_at: string;
  }>(`SELECT * FROM checkins ORDER BY created_at DESC LIMIT ?`, limit);

  return rows.map(r => ({
    id: r.id, emotion: r.emotion as EmotionId, intensity: r.intensity,
    triggers: JSON.parse(r.triggers) as TriggerId[],
    note: r.note, createdAt: r.created_at,
  }));
}

export async function fetchDailyMood(days = 14): Promise<{ day: string; avg: number }[]> {
  return getDb().getAllAsync<{ day: string; avg: number }>(
    `SELECT date(created_at) as day, AVG(intensity) as avg
     FROM checkins WHERE created_at >= datetime('now','localtime',?)
     GROUP BY day ORDER BY day ASC`,
    `-${days} days`,
  );
}

export async function insertVoiceEntry(
  audioPath: string, detectedEmotion: EmotionId, modelEmotion: EmotionId, confidence: number,
  features: AudioFeatures, durationSeconds: number, modelVersion: string,
): Promise<number> {
  const r = await getDb().runAsync(
    `INSERT INTO voice_entries (
       audio_path,detected_emotion,model_emotion,confidence,energy,variance,tempo,peak_ratio,
       dynamic_range,attack,silence_ratio,stability,model_version,duration_seconds
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    audioPath, detectedEmotion, modelEmotion, confidence,
    features.energy, features.variance, features.tempo, features.peakRatio,
    features.dynamicRange, features.attack, features.silenceRatio, features.stability,
    modelVersion, durationSeconds,
  );
  return r.lastInsertRowId;
}

export async function fetchVoiceEntries(limit = 20): Promise<VoiceEntry[]> {
  const rows = await getDb().getAllAsync<{
    id: number; audio_path: string; detected_emotion: string; model_emotion: string;
    confidence: number; energy: number; variance: number;
    tempo: number; peak_ratio: number; dynamic_range: number;
    attack: number; silence_ratio: number; stability: number;
    model_version: string;
    duration_seconds: number; created_at: string;
  }>(`SELECT * FROM voice_entries ORDER BY created_at DESC LIMIT ?`, limit);

  return rows.map(r => ({
    id: r.id, audioPath: r.audio_path,
    detectedEmotion: r.detected_emotion as EmotionId,
    modelEmotion: (r.model_emotion || r.detected_emotion) as EmotionId,
    confidence: r.confidence, energy: r.energy,
    variance: r.variance, tempo: r.tempo,
    peakRatio: r.peak_ratio ?? 0,
    dynamicRange: r.dynamic_range ?? 0,
    attack: r.attack ?? 0,
    silenceRatio: r.silence_ratio ?? 0,
    stability: r.stability ?? 0,
    modelVersion: r.model_version ?? 'legacy',
    durationSeconds: r.duration_seconds, createdAt: r.created_at,
  }));
}

export async function clearCheckIns(): Promise<void> {
  await getDb().runAsync(`DELETE FROM checkins`);
}

export async function clearVoiceEntries(): Promise<void> {
  await getDb().runAsync(`DELETE FROM voice_entries`);
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM checkins`);
    await db.runAsync(`DELETE FROM voice_entries`);
  });
}

export async function fetchThemeMode(): Promise<ThemeMode> {
  const row = await getDb().getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'theme_mode'`,
  );
  return row?.value === 'light' ? 'light' : 'dark';
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('theme_mode', ?, datetime('now','localtime'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    mode,
  );
}

export async function computeWeeklyStats(): Promise<WeeklyStats> {
  const db = getDb();
  const countRow  = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) as total FROM checkins`);
  const topEmoRow = await db.getFirstAsync<{ emotion: string }>(
    `SELECT emotion FROM checkins GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 1`,
  );
  const avgRow = await db.getFirstAsync<{ avg: number }>(
    `SELECT AVG(intensity) as avg FROM checkins WHERE created_at >= datetime('now','localtime','-7 days')`,
  );

  // streak
  const days = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(created_at) as day FROM checkins ORDER BY day DESC`,
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days.length; i++) {
    const exp = new Date(today);
    exp.setDate(today.getDate() - i);
    if (days[i].day === exp.toISOString().slice(0, 10)) streak++;
    else break;
  }

  // top trigger
  const tRows = await db.getAllAsync<{ triggers: string }>(
    `SELECT triggers FROM checkins WHERE created_at >= datetime('now','localtime','-30 days')`,
  );
  const counts: Record<string, number> = {};
  for (const r of tRows)
    for (const t of JSON.parse(r.triggers) as string[])
      counts[t] = (counts[t] ?? 0) + 1;
  const topTrigger = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalEntries:     countRow?.total ?? 0,
    streak,
    topEmotion:       (topEmoRow?.emotion as EmotionId) ?? null,
    topTrigger:       (topTrigger as TriggerId) ?? null,
    averageIntensity: Math.round((avgRow?.avg ?? 0) * 10) / 10,
  };
}
