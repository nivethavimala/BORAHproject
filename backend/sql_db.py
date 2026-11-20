import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_DIR = os.path.join(BASE_DIR, 'database')
SQLITE_DB_PATH = os.path.join(DB_DIR, 'borah.sqlite')

_sql_lock = threading.RLock()
_initialized = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _get_conn() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_sql_database() -> None:
    global _initialized
    with _sql_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """
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
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_signins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    signin_time TEXT NOT NULL,
                    status TEXT NOT NULL,
                    user_agent TEXT
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                """
            )
            conn.commit()
            _initialized = True
        finally:
            conn.close()


def sql_insert_user(user: Dict[str, Any]) -> None:
    if not _initialized:
        init_sql_database()
    with _sql_lock:
        conn = _get_conn()
        try:
            conn.execute(
                """
                INSERT OR REPLACE INTO users (
                    id, name, email, password_hash, profile_photo,
                    is_verified, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user['id'],
                    user['name'],
                    user['email'].lower().strip(),
                    user['password_hash'],
                    user.get('profile_photo'),
                    1 if user.get('is_verified', True) else 0,
                    1 if user.get('is_active', True) else 0,
                    user['created_at'],
                    user['updated_at'],
                ),
            )
            conn.commit()
        finally:
            conn.close()


def sql_record_signin(
    user_id: str, email: str, status: str, user_agent: Optional[str] = None
) -> int:
    if not _initialized:
        init_sql_database()
    now = _now_iso()
    with _sql_lock:
        conn = _get_conn()
        try:
            conn.execute(
                """
                INSERT INTO user_signins (user_id, email, signin_time, status, user_agent)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, (email or '').lower().strip(), now, status, user_agent or 'Web Client'),
            )
            try:
                conn.execute('UPDATE users SET updated_at = ? WHERE id = ?', (now, user_id))
            except Exception:
                pass
            conn.commit()
            return 1
        finally:
            conn.close()


def sql_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not _initialized:
        init_sql_database()
    with _sql_lock:
        conn = _get_conn()
        try:
            row = conn.execute(
                'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
                ((email or '').strip(),),
            ).fetchone()
            if not row:
                return None
            return {
                'id': row['id'],
                'name': row['name'],
                'email': row['email'],
                'password_hash': row['password_hash'],
                'profile_photo': row['profile_photo'] or None,
                'is_verified': bool(row['is_verified']),
                'is_active': bool(row['is_active']),
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
            }
        finally:
            conn.close()


def sql_get_user_signins(user_id: str) -> List[Dict[str, Any]]:
    if not _initialized:
        init_sql_database()
    with _sql_lock:
        conn = _get_conn()
        try:
            rows = conn.execute(
                'SELECT * FROM user_signins WHERE user_id = ? ORDER BY signin_time DESC LIMIT 50',
                (user_id,),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def sql_get_total_users_count() -> int:
    if not _initialized:
        init_sql_database()
    with _sql_lock:
        conn = _get_conn()
        try:
            row = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()
            return int(row['count']) if row else 0
        finally:
            conn.close()
