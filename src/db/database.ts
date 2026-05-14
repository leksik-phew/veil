import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('veil.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS checkins (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      emotion     TEXT    NOT NULL,
      intensity   INTEGER NOT NULL DEFAULT 5,
      triggers    TEXT    NOT NULL DEFAULT '[]',
      note        TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS voice_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      audio_path       TEXT    NOT NULL DEFAULT '',
      detected_emotion TEXT    NOT NULL,
      confidence       REAL    NOT NULL DEFAULT 0,
      energy           REAL    NOT NULL DEFAULT 0,
      variance         REAL    NOT NULL DEFAULT 0,
      tempo            REAL    NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_voice_created    ON voice_entries(created_at DESC);
  `);
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialised — call initDatabase() first');
  return _db;
}
