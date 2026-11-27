import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def resolve_db_dir() -> str:
    preferred = os.path.join(BASE_DIR, 'database')
    try:
        os.makedirs(preferred, exist_ok=True)
        probe = os.path.join(preferred, '.write_probe')
        with open(probe, 'w', encoding='utf-8') as f:
            f.write('ok')
        os.remove(probe)
        return preferred
    except Exception:
        fallback = '/tmp/borah_database'
        os.makedirs(fallback, exist_ok=True)
        return fallback


DB_DIR = resolve_db_dir()
SQLITE_V2_PATH = os.path.join(DB_DIR, 'borah_v2.sqlite')
LEGACY_JSON_PATH = os.path.join(DB_DIR, 'borah_store.json')
LEGACY_SQLITE_PATH = os.path.join(DB_DIR, 'borah.sqlite')
UPLOAD_DIR = os.path.join(DB_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_database_uri() -> str:
    env_uri = os.environ.get('DATABASE_URL', '').strip()
    if env_uri:
        if env_uri.startswith('postgres://'):
            env_uri = 'postgresql://' + env_uri[len('postgres://'):]
        return env_uri
    return f'sqlite:///{SQLITE_V2_PATH}'
