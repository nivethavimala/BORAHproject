import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { User } from './db';

const DB_DIR = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const SQLITE_DB_PATH = path.join(DB_DIR, 'borah.sqlite');

let sqlDbInstance: Database | null = null;
let initPromise: Promise<void> | null = null;

function saveDbToDisk() {
  if (!sqlDbInstance) return;
  try {
    const data = sqlDbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(SQLITE_DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite DB to file:', err);
  }
}

// Initialize SQLite connection via WebAssembly sql.js (portable, zero-glibc dependency)
export async function initSqlDatabase(): Promise<void> {
  if (sqlDbInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const SQL = await initSqlJs();
      if (fs.existsSync(SQLITE_DB_PATH)) {
        try {
          const fileBuffer = fs.readFileSync(SQLITE_DB_PATH);
          sqlDbInstance = new SQL.Database(fileBuffer);
          console.log(`Connected to existing SQL database at ${SQLITE_DB_PATH}`);
        } catch (e) {
          console.warn('Could not read existing SQL file, creating fresh DB:', e);
          sqlDbInstance = new SQL.Database();
        }
      } else {
        sqlDbInstance = new SQL.Database();
        console.log(`Created new SQL database at ${SQLITE_DB_PATH}`);
      }

      // 1. Users Table
      sqlDbInstance.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          profile_photo TEXT,
          is_verified INTEGER DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. User Signins Table (Logs every login event)
      sqlDbInstance.run(`
        CREATE TABLE IF NOT EXISTS user_signins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          signin_time TEXT NOT NULL,
          status TEXT NOT NULL,
          user_agent TEXT
        );
      `);

      // Create index on email for quick lookup
      sqlDbInstance.run(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);

      saveDbToDisk();
    } catch (err) {
      console.error('Failed to initialize SQL database:', err);
      throw err;
    }
  })();

  return initPromise;
}

// SQL Query helper functions

export async function sqlInsertUser(user: User): Promise<void> {
  if (!sqlDbInstance) await initSqlDatabase();
  if (!sqlDbInstance) throw new Error('SQL Database not initialized');

  const query = `
    INSERT OR REPLACE INTO users (
      id, name, email, password_hash, profile_photo, is_verified, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  sqlDbInstance.run(query, [
    user.id,
    user.name,
    user.email.toLowerCase().trim(),
    user.password_hash,
    user.profile_photo || null,
    user.is_verified ? 1 : 0,
    user.is_active ? 1 : 0,
    user.created_at,
    user.updated_at,
  ]);

  saveDbToDisk();
}

export async function sqlRecordSignin(
  userId: string,
  email: string,
  status: string,
  userAgent?: string
): Promise<number> {
  if (!sqlDbInstance) await initSqlDatabase();
  if (!sqlDbInstance) return 0;

  const now = new Date().toISOString();
  sqlDbInstance.run(
    `INSERT INTO user_signins (user_id, email, signin_time, status, user_agent) VALUES (?, ?, ?, ?, ?)`,
    [userId, email.toLowerCase().trim(), now, status, userAgent || 'Web Client']
  );

  // Also update updated_at for existing users
  try {
    sqlDbInstance.run(`UPDATE users SET updated_at = ? WHERE id = ?`, [now, userId]);
  } catch {
    // Ignore if not a registered user id (e.g. 'unregistered')
  }

  saveDbToDisk();
  return 1;
}

export async function sqlGetUserByEmail(email: string): Promise<User | null> {
  if (!sqlDbInstance) await initSqlDatabase();
  if (!sqlDbInstance) return null;

  const stmt = sqlDbInstance.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`);
  stmt.bind([email.trim()]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash,
      profile_photo: row.profile_photo || undefined,
      is_verified: !!row.is_verified,
      is_active: !!row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  stmt.free();
  return null;
}

export async function sqlGetUserSignins(userId: string): Promise<any[]> {
  if (!sqlDbInstance) await initSqlDatabase();
  if (!sqlDbInstance) return [];

  const stmt = sqlDbInstance.prepare(
    `SELECT * FROM user_signins WHERE user_id = ? ORDER BY signin_time DESC LIMIT 50`
  );
  stmt.bind([userId]);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export async function sqlGetTotalUsersCount(): Promise<number> {
  if (!sqlDbInstance) await initSqlDatabase();
  if (!sqlDbInstance) return 0;

  const res = sqlDbInstance.exec(`SELECT COUNT(*) as count FROM users`);
  if (res.length > 0 && res[0].values.length > 0) {
    return Number(res[0].values[0][0]) || 0;
  }
  return 0;
}
