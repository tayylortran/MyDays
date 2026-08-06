import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Opens the database once, creating the tables the first time.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('mydays.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS circles (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL,
      sort       INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hangouts (
      id         TEXT PRIMARY KEY NOT NULL,
      date       TEXT NOT NULL,
      title      TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      circle_id  TEXT NOT NULL REFERENCES circles(id),
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id         TEXT PRIMARY KEY NOT NULL,
      hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
      uri        TEXT NOT NULL,
      thumb_uri  TEXT,
      sort       INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

      CREATE TABLE IF NOT EXISTS day_faces (
      date       TEXT PRIMARY KEY NOT NULL,
      photo_id   TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hangouts_date  ON hangouts(date);
    CREATE INDEX IF NOT EXISTS idx_photos_hangout ON photos(hangout_id);
  `);
  return db;
}