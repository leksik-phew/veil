/**
 * Veil Export / Import
 *
 * Export format (JSON, schemaVersion 2):
 * {
 *   veilBackup: true,
 *   schemaVersion: 2,
 *   exportedAt: ISO string,
 *   appVersion: "1.0.0",
 *   stats: { checkInsCount, voiceEntriesCount },
 *   settings: { themeMode, lang },
 *   checkIns: CheckIn[],
 *   voiceEntries: VoiceEntry[],   ← audioPath always ""
 *   fineTuningState: FineTuningState | null
 * }
 *
 * Import modes:
 *   - replace: clear all data first, then insert everything
 *   - merge:   insert only entries whose createdAt does not already exist
 *              (INSERT OR IGNORE with UNIQUE constraint on created_at)
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing    from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  fetchAllCheckInsForExport, fetchAllVoiceEntriesForExport,
  fetchThemeMode, fetchLang, loadFineTuningState,
  clearAllData, clearFineTuningState,
  insertCheckInRaw, insertVoiceEntryRaw,
  saveThemeMode, saveLang, saveFineTuningState,
} from './queries';
import type { CheckIn, FineTuningState, Lang, ThemeMode, VoiceEntry } from '../types';

// ─────────────────────────────────────────────────────────────────────────────

export const BACKUP_SCHEMA_VERSION = 2;
export const APP_VERSION           = '1.0.0';

export interface VeilBackupFile {
  veilBackup:      true;
  schemaVersion:   number;
  exportedAt:      string;
  appVersion:      string;
  stats: {
    checkInsCount:     number;
    voiceEntriesCount: number;
  };
  settings: {
    themeMode: ThemeMode;
    lang:      Lang;
  };
  checkIns:        CheckIn[];
  voiceEntries:    VoiceEntry[];
  fineTuningState: FineTuningState | null;
}

export type ImportMode = 'replace' | 'merge';

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function exportData(): Promise<void> {
  // Collect everything
  const [checkIns, voiceEntries, themeMode, lang, fineTuningState] = await Promise.all([
    fetchAllCheckInsForExport(),
    fetchAllVoiceEntriesForExport(),
    fetchThemeMode(),
    fetchLang(),
    loadFineTuningState(),
  ]);

  const backup: VeilBackupFile = {
    veilBackup:    true,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt:    new Date().toISOString(),
    appVersion:    APP_VERSION,
    stats: {
      checkInsCount:     checkIns.length,
      voiceEntriesCount: voiceEntries.length,
    },
    settings: { themeMode, lang },
    checkIns,
    voiceEntries,
    fineTuningState,
  };

  // Write to a temp file
  const date     = new Date().toISOString().slice(0, 10);           // YYYY-MM-DD
  const filename = `veil-backup-${date}.json`;
  const path     = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2), {
    encoding: 'utf8' as any,
  });

  // Share
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: `Veil backup — ${date}`,
    UTI: 'public.json',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT — pick file
// ─────────────────────────────────────────────────────────────────────────────

export async function pickBackupFile(): Promise<VeilBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const uri  = result.assets[0].uri;
  const text = await FileSystem.readAsStringAsync(uri, {
    encoding: 'utf8' as any,
  });

  const parsed = JSON.parse(text);
  return validateBackup(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT — apply
// ─────────────────────────────────────────────────────────────────────────────

export async function importData(
  file: VeilBackupFile,
  mode: ImportMode,
  includeSettings:     boolean,
  includeFineTuning:   boolean,
): Promise<void> {
  if (mode === 'replace') {
    // Wipe all entries (keeps settings unless we update them below)
    await clearAllData();
    if (includeFineTuning) await clearFineTuningState();

    // Insert all entries from backup
    for (const c of file.checkIns)     await insertCheckInRaw(c);
    for (const e of file.voiceEntries) await insertVoiceEntryRaw(e);
  } else {
    // Merge — INSERT OR IGNORE will skip existing created_at timestamps
    for (const c of file.checkIns)     await insertCheckInRaw(c);
    for (const e of file.voiceEntries) await insertVoiceEntryRaw(e);
  }

  if (includeSettings) {
    await saveThemeMode(file.settings.themeMode);
    await saveLang(file.settings.lang);
  }

  if (includeFineTuning && file.fineTuningState) {
    await saveFineTuningState(file.fineTuningState);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export function validateBackup(raw: unknown): VeilBackupFile {
  if (typeof raw !== 'object' || raw === null)     throw new Error('Not a valid JSON object');
  const obj = raw as Record<string, unknown>;
  if (obj['veilBackup'] !== true)                  throw new Error('Not a Veil backup file');
  if (typeof obj['schemaVersion'] !== 'number')    throw new Error('Missing schemaVersion');
  if (obj['schemaVersion'] > BACKUP_SCHEMA_VERSION)
    throw new Error(`Backup requires app version newer than ${APP_VERSION}`);
  if (!Array.isArray(obj['checkIns']))             throw new Error('Missing checkIns array');
  if (!Array.isArray(obj['voiceEntries']))         throw new Error('Missing voiceEntries array');
  if (typeof obj['settings'] !== 'object')         throw new Error('Missing settings');
  return raw as VeilBackupFile;
}
