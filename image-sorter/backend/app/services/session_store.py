"""Persistent session store backed by SQLite."""

from __future__ import annotations

from datetime import timedelta
import logging
import os
from pathlib import Path
import sqlite3
import threading
from typing import Optional

from app.models.schemas import ProcessingSession, SessionStatus, utc_now

logger = logging.getLogger(__name__)

SESSION_TTL_HOURS = 2
DEFAULT_DB_PATH = (
    Path(__file__).parent.parent.parent / "temp_storage" / "session_store.sqlite3"
)
DB_PATH = Path(os.environ.get("IMAGE_SORTER_SESSION_DB", DEFAULT_DB_PATH))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _initialize() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_updated_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _session_to_record(session: ProcessingSession) -> tuple[str, str, str, str, str]:
    return (
        session.session_id,
        session.status.value,
        session.created_at.isoformat(),
        session.last_updated_at.isoformat(),
        session.model_dump_json(),
    )


def _row_to_session(row: sqlite3.Row | None) -> Optional[ProcessingSession]:
    if row is None:
        return None
    return ProcessingSession.model_validate_json(row["payload_json"])


def create_session(session: ProcessingSession) -> ProcessingSession:
    with _lock, _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions
            (session_id, status, created_at, last_updated_at, payload_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            _session_to_record(session),
        )
        conn.commit()
    logger.info("Session created: %s", session.session_id)
    return session


def get_session(session_id: str) -> Optional[ProcessingSession]:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT payload_json FROM sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return _row_to_session(row)


def update_session(session: ProcessingSession) -> None:
    session.last_updated_at = utc_now()
    with _lock, _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions
            (session_id, status, created_at, last_updated_at, payload_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            _session_to_record(session),
        )
        conn.commit()


def delete_session(session_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
    logger.info("Session deleted: %s", session_id)


def get_expired_sessions() -> list[str]:
    cutoff = (utc_now() - timedelta(hours=SESSION_TTL_HOURS)).isoformat()
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT session_id FROM sessions WHERE last_updated_at < ?",
            (cutoff,),
        ).fetchall()
    return [row["session_id"] for row in rows]


def list_sessions_by_status(status: SessionStatus) -> list[ProcessingSession]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT payload_json FROM sessions WHERE status = ? ORDER BY created_at ASC",
            (status.value,),
        ).fetchall()
    sessions: list[ProcessingSession] = []
    for row in rows:
        session = _row_to_session(row)
        if session is not None:
            sessions.append(session)
    return sessions


def expire_session(session_id: str) -> None:
    session = get_session(session_id)
    if not session:
        return
    session.status = SessionStatus.EXPIRED
    update_session(session)


def reset_store() -> None:
    """Test helper to clear the persistent session store."""
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM sessions")
        conn.commit()


_initialize()
