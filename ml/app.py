"""Local research API. Start with: python -m uvicorn app:app --port 8765"""

import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from counter_notes.job import snapshot, start
from counter_notes.pipeline import run_job
from counter_notes.store import connect, load_env

app = FastAPI(title="Counter Notes research")


@app.middleware("http")
async def require_password(request, call_next):
    load_env()
    expected = os.environ.get("COUNTER_NOTES_PASSCODE", "").strip()
    header = request.headers.get("x-counter-notes-passcode", "")
    if not expected or header != expected:
        return JSONResponse(status_code=401, content={"error": "Passcode required.", "code": "PASSCODE"})
    return await call_next(request)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/check-link")
def check_link(body: dict | None = None):
    from counter_notes.collect import check_pasted_page

    payload = body or {}
    return check_pasted_page(payload.get("url") or "", payload.get("number") or "", payload.get("claim") or "")


def _rescore(body, restore):
    from counter_notes.pipeline import rescore_saved_lists

    payload = body or {}
    video_id = str(payload.get("videoId") or "").strip()
    topic_id = payload.get("topicId")
    if not video_id or not topic_id:
        return JSONResponse(status_code=400, content={"error": "Name the video and the topic."})
    db = connect()
    try:
        rescore_saved_lists(db, int(topic_id), video_id, restore=restore)
        return {"ok": True}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})
    finally:
        db.close()


@app.post("/ignore")
def ignore_winner(body: dict | None = None):
    return _rescore(body, False)


@app.post("/restore")
def restore_winner(body: dict | None = None):
    return _rescore(body, True)


@app.get("/status")
def research_status():
    return snapshot()


@app.post("/run")
def run_now(body: dict | None = None):
    topic_id = None
    if isinstance(body, dict) and body.get("topicId"):
        topic_id = int(body["topicId"])
    return start(topic_id, lambda chosen: run_job(topic_id=chosen))
