import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcrypt';

// ============================================================================
// SQLite Database — Singleton + Schema + Seed
// ============================================================================

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'bidman')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disabled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resume_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resume_filename TEXT NOT NULL,
      main_skills TEXT DEFAULT '',
      tailoring_instructions TEXT DEFAULT '',
      strict_truth_check INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, resume_filename)
    );

    CREATE TABLE IF NOT EXISTS job_search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_url TEXT NOT NULL,
      job_title TEXT NOT NULL,
      company TEXT NOT NULL,
      tech_stacks TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      job_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default admin if no admin exists
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(defaultPassword, 8);
    db.prepare(
      'INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)'
    ).run('admin', hash, 'admin', 'approved');
    console.log(`[db] Default admin created (username: admin, password: ${defaultPassword})`);
  }
}

// --- User types ---

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'bidman';
  status: 'pending' | 'approved' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export interface DbResumeAssignment {
  id: number;
  user_id: number;
  resume_filename: string;
  main_skills: string;
  tailoring_instructions: string;
  strict_truth_check: number;
  created_at: string;
}
