import sqlite3
import os
from contextlib import contextmanager

_default_db = os.path.join(os.path.dirname(__file__), "mlb.db")
DB_PATH     = os.getenv("DB_PATH", _default_db)
TURSO_URL   = os.getenv("TURSO_DATABASE_URL", "")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

_USE_TURSO = bool(TURSO_URL)

if _USE_TURSO:
    import libsql_experimental as libsql


def _row_factory(cursor, row):
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


def _connect():
    if _USE_TURSO:
        conn = libsql.connect(DB_PATH, sync_url=TURSO_URL, auth_token=TURSO_TOKEN)
        conn.sync()
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = _row_factory
    return conn


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()
    conn = _connect()
    for stmt in schema.split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()
    if _USE_TURSO:
        conn.sync()
    conn.close()


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
        if _USE_TURSO:
            conn.sync()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
