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
      model_emotion    TEXT    NOT NULL DEFAULT '',
      confidence       REAL    NOT NULL DEFAULT 0,
      energy           REAL    NOT NULL DEFAULT 0,
      variance         REAL    NOT NULL DEFAULT 0,
      tempo            REAL    NOT NULL DEFAULT 0,
      peak_ratio       REAL    NOT NULL DEFAULT 0,
      dynamic_range    REAL    NOT NULL DEFAULT 0,
      attack           REAL    NOT NULL DEFAULT 0,
      silence_ratio    REAL    NOT NULL DEFAULT 0,
      stability        REAL    NOT NULL DEFAULT 0,
      model_version    TEXT    NOT NULL DEFAULT 'legacy',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_voice_created    ON voice_entries(created_at DESC);

    CREATE TABLE IF NOT EXISTS model_finetune (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  const columns = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(voice_entries)`);
  const names = new Set(columns.map(c => c.name));
  if (!names.has('peak_ratio')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN peak_ratio REAL NOT NULL DEFAULT 0;`);
  }
  if (!names.has('model_emotion')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN model_emotion TEXT NOT NULL DEFAULT '';`);
  }
  if (!names.has('dynamic_range')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN dynamic_range REAL NOT NULL DEFAULT 0;`);
  }
  if (!names.has('attack')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN attack REAL NOT NULL DEFAULT 0;`);
  }
  if (!names.has('silence_ratio')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN silence_ratio REAL NOT NULL DEFAULT 0;`);
  }
  if (!names.has('stability')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN stability REAL NOT NULL DEFAULT 0;`);
  }
  if (!names.has('model_version')) {
    await _db.execAsync(`ALTER TABLE voice_entries ADD COLUMN model_version TEXT NOT NULL DEFAULT 'legacy';`);
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialised — call initDatabase() first');
  return _db;
}
