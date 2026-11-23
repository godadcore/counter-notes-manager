"""One research job at a time. The HTTP call returns before the job finishes."""

import threading

_lock = threading.Lock()
_job = {
    "running": False,
    "topicName": "",
    "error": "",
    "done": False,
    "topics": 0,
    "id": 0,
}


def note_topic(name):
    with _lock:
        _job["topicName"] = str(name or "").strip()


def snapshot():
    with _lock:
        return dict(_job)


def start(topic_id, runner):
    with _lock:
        if _job["running"]:
            current = dict(_job)
            current["started"] = False
            return current
        _job["id"] += 1
        _job["running"] = True
        _job["topicName"] = ""
        _job["error"] = ""
        _job["done"] = False
        _job["topics"] = 0
        current = dict(_job)
    current["started"] = True

    def work():
        try:
            result = runner(topic_id)
            with _lock:
                _job["topics"] = int((result or {}).get("topics") or 0)
                _job["error"] = ""
                _job["done"] = True
        except Exception as exc:
            with _lock:
                _job["error"] = str(exc)
                _job["done"] = True
                _job["topics"] = 0
        finally:
            with _lock:
                _job["running"] = False
                _job["topicName"] = ""

    threading.Thread(target=work, daemon=True).start()
    return current
