"""Research storage. The Node API owns the database. This module only calls that API."""

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class Row(dict):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return dict.__getitem__(self, key)


class _Result:
    def __init__(self, rows):
        self._rows = [Row(row) for row in rows or []]

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)

    def __iter__(self):
        return iter(self._rows)


def _call(sql, args, mode):
    load_env()
    password = os.environ.get("COUNTER_NOTES_PASSCODE", "").strip()
    url = os.environ.get("COUNTER_NOTES_API", "http://127.0.0.1:5174/api/internal/sql")
    payload = json.dumps({"sql": sql, "args": list(args or []), "mode": mode}).encode("utf-8")
    request = urllib.request.Request(url, data=payload, headers={
        "content-type": "application/json",
        "x-counter-notes-passcode": password,
    })
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        try:
            message = json.loads(detail).get("error") or "The database rejected that."
        except json.JSONDecodeError:
            message = "The database rejected that."
        raise RuntimeError(message) from None


class RemoteDb:
    def execute(self, sql, params=()):
        text = " ".join(str(sql).split())
        head = text[:12].lower()
        if head.startswith("select") or head.startswith("pragma") or head.startswith("with"):
            data = _call(text, params, "all")
            return _Result(data.get("rows") or [])
        _call(text, params, "run")
        return _Result([])

    def executescript(self, script):
        _call(script, [], "exec")

    def commit(self):
        return None

    def close(self):
        return None


def connect(path=None):
    if path:
        raise RuntimeError("The research service does not open a database file.")
    return RemoteDb()


def ensure(db):
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS dossiers (
          topic_id INTEGER PRIMARY KEY,
          body TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS research_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          at TEXT NOT NULL,
          job TEXT NOT NULL,
          detail TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS research_cache (
          cache_key TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          fetched_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS research_quota (
          day TEXT PRIMARY KEY,
          units INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS lookalike_videos (
          video_id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          views INTEGER NOT NULL,
          duration_seconds INTEGER,
          published_at TEXT,
          thumbnail_url TEXT,
          comment_count INTEGER,
          channel_title TEXT,
          fetched_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS topic_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id INTEGER NOT NULL,
          number_text TEXT NOT NULL,
          url TEXT NOT NULL,
          evidence_date TEXT,
          snippet TEXT NOT NULL,
          kind TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS topic_media (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          kind TEXT NOT NULL,
          license TEXT NOT NULL,
          attribution TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ignored_videos (
          video_id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL
        );
        """
    )
    columns = {row[1] for row in db.execute("PRAGMA table_info(lookalike_videos)").fetchall()}
    if columns and "channel_title" not in columns:
        db.execute("ALTER TABLE lookalike_videos ADD COLUMN channel_title TEXT")
    if columns and "description" not in columns:
        db.execute("ALTER TABLE lookalike_videos ADD COLUMN description TEXT")
    db.execute("INSERT INTO config (key, value) VALUES ('niche_keywords', '[]') ON CONFLICT(key) DO NOTHING")
    db.execute("INSERT INTO config (key, value) VALUES ('niche_channels', '[]') ON CONFLICT(key) DO NOTHING")
    db.commit()


def get_config(db, key, fallback=""):
    row = db.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else fallback


def read_niche(db):
    return {
        "keywords": json.loads(get_config(db, "niche_keywords", "[]") or "[]"),
        "channels": json.loads(get_config(db, "niche_channels", "[]") or "[]"),
    }


def log(db, job, detail):
    stamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    db.execute("INSERT INTO research_log (at, job, detail) VALUES (?, ?, ?)", (stamp, job, detail))
    db.commit()


def quota_used(db, day):
    row = db.execute("SELECT units FROM research_quota WHERE day = ?", (day,)).fetchone()
    return int(row["units"]) if row else 0


def set_quota(db, day, units):
    db.execute(
        "INSERT INTO research_quota (day, units) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET units = excluded.units",
        (day, int(units)),
    )
    db.commit()


def cache_get(db, key):
    row = db.execute("SELECT payload FROM research_cache WHERE cache_key = ?", (key,)).fetchone()
    return json.loads(row["payload"]) if row else None


def cache_fresh(db, key, hours=24):
    row = db.execute("SELECT payload, fetched_at FROM research_cache WHERE cache_key = ?", (key,)).fetchone()
    if not row:
        return None
    try:
        fetched = datetime.fromisoformat(row["fetched_at"].replace("Z", "+00:00"))
    except ValueError:
        return None
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - fetched
    if age.total_seconds() > hours * 3600:
        return None
    return json.loads(row["payload"])


def cache_put(db, key, payload):
    stamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    db.execute(
        "INSERT INTO research_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at",
        (key, json.dumps(payload), stamp),
    )
    db.commit()


def save_videos(db, videos):
    stamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    for video in videos:
        db.execute(
            """
            INSERT INTO lookalike_videos (
              video_id, channel_id, title, views, duration_seconds, published_at, thumbnail_url, comment_count, channel_title, description, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(video_id) DO UPDATE SET
              title = excluded.title,
              views = excluded.views,
              duration_seconds = excluded.duration_seconds,
              published_at = excluded.published_at,
              thumbnail_url = excluded.thumbnail_url,
              comment_count = excluded.comment_count,
              channel_title = excluded.channel_title,
              description = excluded.description,
              fetched_at = excluded.fetched_at
            """,
            (
                video["video_id"],
                video["channel_id"],
                video["title"],
                int(video.get("views") or 0),
                video.get("duration_seconds"),
                video.get("published_at"),
                video.get("thumbnail_url") or "",
                video.get("comment_count"),
                video.get("channel_title") or "",
                video.get("description") or "",
                stamp,
            ),
        )
    db.commit()


def ignored_ids(db):
    return {row["video_id"] for row in db.execute("SELECT video_id FROM ignored_videos")}


def ignore_video(db, video_id):
    video_id = (video_id or "").strip()
    if not video_id:
        return
    stamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    db.execute(
        "INSERT INTO ignored_videos (video_id, created_at) VALUES (?, ?) ON CONFLICT(video_id) DO NOTHING",
        (video_id, stamp),
    )
    db.commit()


def restore_video(db, video_id):
    video_id = (video_id or "").strip()
    if not video_id:
        return
    db.execute("DELETE FROM ignored_videos WHERE video_id = ?", (video_id,))
    db.commit()


def ignored_public(db):
    rows = []
    for row in db.execute("SELECT video_id FROM ignored_videos ORDER BY created_at"):
        video = db.execute(
            "SELECT title, channel_title FROM lookalike_videos WHERE video_id = ?",
            (row["video_id"],),
        ).fetchone()
        rows.append({
            "videoId": row["video_id"],
            "title": video["title"] if video and video["title"] else row["video_id"],
            "channel": video["channel_title"] if video and video["channel_title"] else "",
        })
    return rows


def save_dossier(db, topic_id, body):
    stamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    db.execute(
        "INSERT INTO dossiers (topic_id, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(topic_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at",
        (topic_id, json.dumps(body), stamp),
    )
    db.commit()
