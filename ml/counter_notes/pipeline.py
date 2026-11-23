"""One research pass. It never invents a number."""

import json
import os
import re
import urllib.parse
from datetime import datetime, timezone

from .collect import (
    _same_channel_name,
    collect_channel_uploads,
    gather_media,
    live_evidence,
    live_media,
    live_youtube,
    parse_channel_ref,
    prove_store_counts,
)
from .core import (
    MIN_NICHE_VIDEOS,
    VIDEO_COST,
    Quota,
    cluster_titles,
    compile_dossier,
    domain_of,
    claim_phrase,
    year_near,
    features_of,
    filter_news,
    comment_themes,
    historical_figures,
    list_notes,
    winner_public,
    is_production_metadata,
    next_post_ids,
    same_topic_videos,
    score_lookalikes,
    sec_decision,
    title_vectors,
    train_outlier_model,
    verify_detail,
)
from .store import cache_fresh, cache_get, cache_put, connect, ignore_video, ignored_ids, ignored_public, load_env, log, quota_used, read_niche, restore_video, save_dossier, save_videos, set_quota


def _today():
    return datetime.now(timezone.utc).date().isoformat()


def _patterns(videos, ignored=None):
    if not videos:
        if not os.environ.get("YOUTUBE_API_KEY", "").strip():
            return "YouTube Data API key is not set. No lookalike videos were fetched."
        return "Not enough lookalike videos yet."
    scored = score_lookalikes(videos, ignored=ignored)
    rows = []
    for video in scored["outliers"]:
        rows.append({
            "score": video["score"],
            "features": features_of(video),
            "title": video.get("title") or "",
        })
    trained = train_outlier_model(rows)
    channels = scored.get("channels") or []
    titles = [video.get("title") or "" for video in videos if video.get("title")]
    clusters = {"warning": "Not enough titles to cluster."}
    if len(titles) >= 2:
        try:
            clusters = cluster_titles(titles, title_vectors(titles))
            if not clusters.get("warning"):
                method = "embeddings" if os.environ.get("COUNTER_NOTES_EMBEDDINGS", "").strip() == "1" else "TF-IDF"
                clusters = {**clusters, "method": method}
        except Exception as exc:
            clusters = {"warning": "Title clustering was skipped: " + type(exc).__name__ + "."}
    parts = []
    if channels:
        parts.append(
            "Sample size: "
            + ", ".join((item.get("name") or "Channel") + " " + str(item.get("sample") or 0) for item in channels)
            + "."
        )
    warning = trained.get("warning") or ""
    if channels and warning.startswith("The sample is "):
        warning = ""
    elif not channels and videos:
        warning = "The sample is " + str(len(videos)) + " videos. A score needs " + str(MIN_NICHE_VIDEOS) + " niche videos."
    if warning:
        parts.append(warning)
    if trained.get("metrics"):
        parts.append("Cross-validated accuracy " + format(trained["metrics"]["accuracy_mean"], ".2f") + ".")
    if trained.get("importance"):
        top = trained["importance"][0]
        parts.append("Strongest feature: " + top["feature"] + ".")
    outliers = [row["title"] for row in rows if row["score"] >= 1][:3]
    if outliers:
        parts.append("Outlier titles: " + "; ".join(outliers) + ".")
    if clusters.get("method"):
        parts.append("Titles clustered with " + clusters["method"] + ".")
    elif clusters.get("warning"):
        parts.append(clusters["warning"])
    return " ".join(parts) or "Not enough lookalike videos yet."


def _lookalikes(videos, brand="", ignored=None):
    return score_lookalikes(videos, brand, ignored=ignored)


def _announce(topic):
    from counter_notes.job import note_topic

    note_topic(_field(topic, "short", "") or _field(topic, "title", ""))


def _field(row, name, fallback=""):
    try:
        value = row[name]
    except (KeyError, IndexError):
        return fallback
    return value if value is not None else fallback


def _keywords(topic):
    raw = str(_field(topic, "keywords", "") or "")
    parts = [item.strip() for item in raw.replace(";", ",").split(",")]
    return [item for item in parts if item][:6]


def _snippet(kind, url, text, name, date="", source_url=""):
    return {
        "kind": kind,
        "url": url or "",
        "domain": domain_of(url or ""),
        "date": date or "",
        "text": text or "",
        "name": name or kind,
        "source_url": source_url or "",
    }


def _report_item(kind, rows, note=""):
    items = []
    for row in rows or []:
        if row.get("url") or row.get("text"):
            items.append({
                "url": row.get("url") or "",
                "name": row.get("name") or kind,
                "date": row.get("date") or "",
                "text": (row.get("text") or "")[:240],
            })
    return {"kind": kind, "count": len(items), "note": note, "items": items}


def _rows_from(payload):
    if isinstance(payload, dict) and "rows" in payload:
        return {
            "rows": payload.get("rows") or [],
            "blocked": int(payload.get("blocked") or 0),
            "failed": int(payload.get("failed") or 0),
            "failures": payload.get("failures") or [],
        }
    if isinstance(payload, list):
        return {"rows": payload, "blocked": 0, "failed": 0, "failures": []}
    return {"rows": [], "blocked": 0, "failed": 0, "failures": []}


def _fetch_note(payload, prefix):
    note = prefix + " Blocked by robots.txt: " + str(payload["blocked"]) + ". Failed: " + str(payload["failed"]) + "."
    reasons = payload.get("failures") or []
    if reasons:
        note += " " + "; ".join(reasons[:6]) + "."
    return note


def _call(transport, request):
    try:
        return transport(request)
    except Exception as exc:
        return {"error": str(exc)}


def gather_for_topic(topic, transport, gdelt_cache=None):
    brand = (str(_field(topic, "short", "") or _field(topic, "title", "")).strip())
    keywords = _keywords(topic)
    resolution = _call(transport, {"kind": "resolve", "q": brand})
    if not isinstance(resolution, dict):
        resolution = {"chosen": None, "reason": "Entity lookup returned nothing.", "rejected": []}
    chosen = resolution.get("chosen") or None
    reason = resolution.get("reason") or "No business or brand matched."
    rejected = resolution.get("rejected") or []
    if rejected:
        reason += " Rejected: " + "; ".join(
            (item.get("label") or "entity") + " " + (item.get("id") or "") + " (" + (item.get("reason") or "rejected") + ")"
            for item in rejected[:5]
        ) + "."
    report = [_report_item(
        "entity",
        [{"url": "https://www.wikidata.org/wiki/" + chosen["id"], "name": chosen.get("label") or brand, "text": reason}] if chosen else [],
        reason,
    )]
    snippets = []
    if not chosen:
        report.append(_report_item("wikipedia", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("references", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("sec", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("gdelt", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("official", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("fred", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("worldbank", [], "Not queried. The entity was not resolved."))
        report.append(_report_item("rss", [], "Not queried. The entity was not resolved."))
        return snippets, report, brand, [], []
    article = _call(transport, {"kind": "wikipedia.article", "title": chosen.get("wikipedia") or ""})
    if not isinstance(article, dict):
        article = {}
    if article.get("error"):
        report.append(_report_item("wikipedia", [], "Wikipedia request failed (" + str(article.get("error")) + ")."))
    elif article.get("disambiguation"):
        report.append(_report_item("wikipedia", [], "Rejected. The Wikipedia page is a disambiguation page."))
    elif article.get("extract"):
        wiki_url = "https://en.wikipedia.org/wiki/" + urllib.parse.quote((article.get("title") or chosen.get("wikipedia") or "").replace(" ", "_"))
        snippets.append(_snippet("wikipedia", wiki_url, article.get("extract") or "", "Wikipedia"))
        report.append(_report_item("wikipedia", snippets[-1:], article.get("title") or ""))
        links = [url for url in (article.get("links") or []) if url.startswith("http")]
        references = _rows_from(_call(transport, {"kind": "references", "urls": links[:12]}))
        for row in references["rows"]:
            snippets.append(_snippet(row.get("kind") or "reference", row.get("url"), row.get("text"), row.get("name") or "Reference"))
        report.append(_report_item("references", references["rows"], _fetch_note(references, "Cited pages.")))
    else:
        report.append(_report_item("wikipedia", [], "No English Wikipedia article on the resolved entity."))
    decision = sec_decision(chosen)
    if decision == "search":
        ticker = chosen.get("ticker") or brand
        filings = _call(transport, {"kind": "sec", "q": ticker})
        filings = filings if isinstance(filings, list) else []
        for row in filings:
            snippets.append(_snippet("sec", row.get("url"), row.get("text"), row.get("name") or "SEC EDGAR", row.get("date") or ""))
        report.append(_report_item("sec", filings))
    else:
        report.append(_report_item("sec", [], decision))
    gdelt_key = "gdelt:" + brand.lower()
    cached_news = gdelt_cache.get(gdelt_key) if gdelt_cache else None
    if cached_news is not None:
        news_payload = cached_news
    else:
        news_payload = _call(transport, {"kind": "gdelt", "q": brand, "keywords": keywords})
        if gdelt_cache and isinstance(news_payload, dict) and not news_payload.get("error"):
            gdelt_cache.put(gdelt_key, news_payload)
    if isinstance(news_payload, dict):
        news = news_payload.get("items") or []
        news_error = news_payload.get("error") or ""
    else:
        news = news_payload if isinstance(news_payload, list) else []
        news_error = ""
    terms = []
    for phrase in keywords:
        terms.append(phrase)
        terms.extend(word for word in phrase.split() if len(word) > 3)
    kept, dropped = filter_news(news, brand, terms)
    for row in kept:
        snippets.append(_snippet("gdelt", row.get("url"), row.get("text") or row.get("title"), row.get("name") or "GDELT", row.get("date") or ""))
    gdelt_note = "Dropped " + str(dropped) + "."
    if news_error:
        gdelt_note = news_error + " " + gdelt_note
    elif cached_news is not None:
        gdelt_note = "Cached for 24 hours. " + gdelt_note
    elif not news:
        gdelt_note = "GDELT returned no articles. " + gdelt_note
    report.append(_report_item("gdelt", kept, gdelt_note))
    rss_payload = _call(transport, {"kind": "rss", "q": brand})
    rss_items = []
    publishers = []
    if isinstance(rss_payload, dict):
        rss_items = rss_payload.get("items") or []
        publishers = rss_payload.get("publishers") or []
    if publishers:
        for item in publishers:
            if item.get("blocked"):
                note = item.get("error") or "robots.txt does not allow this feed."
            elif item.get("error"):
                note = item["error"]
            else:
                note = "Read " + str(item.get("feed") or 0) + " stories, kept " + str(item.get("matched") or 0) + " that name the brand."
            report.append(_report_item(item.get("name") or "rss", [row for row in rss_items if row.get("name") == item.get("name")], note))
    else:
        report.append(_report_item("rss", [], "Publisher feeds were not read."))
    official = _rows_from(_call(transport, {"kind": "official", "website": chosen.get("website") or ""}))
    for row in official["rows"]:
        snippets.append(_snippet("official", row.get("url"), row.get("text"), row.get("name") or "Company site"))
    if chosen.get("website"):
        official_note = "Tried " + chosen.get("website") + ". " + _fetch_note(official, "Company press and investor pages.")
    else:
        official_note = "No official website on the entity."
    report.append(_report_item("official", official["rows"], official_note))
    fred_key = os.environ.get("FRED_API_KEY", "").strip()
    if fred_key:
        fred_rows = _call(transport, {"kind": "fred", "q": brand})
        fred_rows = fred_rows if isinstance(fred_rows, list) else []
        for row in fred_rows:
            snippets.append(_snippet("fred", row.get("url"), row.get("text"), row.get("name") or "FRED", row.get("date") or ""))
        report.append(_report_item("fred", fred_rows))
    else:
        report.append(_report_item("fred", [], "Skipped. FRED_API_KEY is not set."))
    report.append(_report_item("worldbank", [], "No topic indicator was queried."))
    return snippets, report, brand, rss_items, publishers


def research_topic(db, topic, transport, media_transport, videos=None, gdelt_cache=None):
    brand = (str(_field(topic, "short", "") or _field(topic, "title", "")).strip())
    snippets, report, brand, rss_items, publishers = gather_for_topic(topic, transport, gdelt_cache)
    retrieved = _today()
    findings = db.execute(
        "SELECT id, number_text, label, hold, source_url FROM findings WHERE topic_id = ?",
        (topic["id"],),
    ).fetchall()
    rows = []
    for finding in findings:
        if is_production_metadata(finding["label"]):
            continue
        number = finding["number_text"]
        status, matches = verify_detail(number, snippets, finding["label"] or "")
        packed = [{
            "sentence": item.get("sentence") or "",
            "url": item.get("url") or "",
            "name": item.get("name") or "",
            "retrieved": retrieved,
            "kind": item.get("kind") or "",
        } for item in matches]
        if status.startswith("Verified") and packed:
            best = packed[0]
            db.execute(
                "UPDATE findings SET hold = 0, source_url = ?, source_name = ?, source_date = ? WHERE id = ?",
                (best["url"], best.get("name") or "", retrieved, finding["id"]),
            )
        sentence = packed[0]["sentence"] if packed else ""
        phrase = claim_phrase(number, finding["label"] or "", sentence) if sentence else ""
        if status.startswith("Verified") and packed and phrase:
            db.execute("UPDATE findings SET label = ? WHERE id = ?", (phrase, finding["id"]))
        rows.append({
            "number": number,
            "status": status,
            "matches": packed,
            "claim": phrase,
            "year": year_near(number, sentence),
            "url": packed[0]["url"] if packed else "",
            "date": retrieved if packed else "",
            "snippet": sentence,
            "name": packed[0]["name"] if packed else "",
            "retrieved": retrieved if packed else "",
        })
    media = gather_media(brand or topic["title"], media_transport)
    db.execute("DELETE FROM topic_evidence WHERE topic_id = ?", (topic["id"],))
    db.execute("DELETE FROM topic_media WHERE topic_id = ?", (topic["id"],))
    for row in rows:
        for match in row.get("matches") or []:
            if match.get("url") and match.get("sentence"):
                db.execute(
                    "INSERT INTO topic_evidence (topic_id, number_text, url, evidence_date, snippet, kind, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (topic["id"], row["number"], match["url"], match.get("retrieved") or "", match["sentence"], match.get("name") or "", row["status"]),
                )
    for item in media:
        db.execute(
            "INSERT INTO topic_media (topic_id, title, url, kind, license, attribution) VALUES (?, ?, ?, ?, ?, ?)",
            (topic["id"], item["title"], item["url"], item["kind"], item["license"], item["attribution"]),
        )
    stored = list(videos) if videos is not None else [dict(item) for item in db.execute("SELECT * FROM lookalike_videos").fetchall()]
    brand_name = str(brand or "").strip()
    lookalikes = _lookalikes(stored, brand_name, ignored_ids(db))
    same_topic = same_topic_videos(stored, brand_name)
    lookalikes["same_topic"] = same_topic
    lookalikes["comment_lines"] = comment_themes(same_topic[:3])
    lookalikes["news_feeds"] = list(publishers or [])
    candidates, stats = prove_store_counts(
        rss_items,
        brand_name,
        limit=0,
        cache_get=lambda key: cache_get(db, key),
        cache_put=lambda key, payload: cache_put(db, key, payload),
    )
    lookalikes["store_candidates"] = candidates
    lookalikes["store_stats"] = stats
    dossier = compile_dossier(topic["title"], rows, _patterns(stored, ignored_ids(db)), media, report, lookalikes, historical_figures(snippets))
    save_dossier(db, topic["id"], dossier)
    db.commit()
    return dossier


def _topic_fields(db):
    columns = {row[1] for row in db.execute("PRAGMA table_info(topics)").fetchall()}
    fields = ["id", "title", "short"]
    if "keywords" in columns:
        fields.append("keywords")
    return ", ".join(fields)


def _load_topics(db, topic_id):
    fields = _topic_fields(db)
    if topic_id:
        return db.execute("SELECT " + fields + " FROM topics WHERE id = ?", (int(topic_id),)).fetchall()
    days = {}
    row = db.execute("SELECT value FROM config WHERE key = 'days'").fetchone()
    if row and row["value"]:
        try:
            days = json.loads(row["value"])
        except json.JSONDecodeError:
            days = {}
    ids = next_post_ids(days, 4)
    if not ids:
        return []
    found = db.execute(
        "SELECT " + fields + " FROM topics WHERE id IN (" + ",".join("?" for _ in ids) + ")",
        ids,
    ).fetchall()
    by_id = {item["id"]: item for item in found}
    return [by_id[item] for item in ids if item in by_id]


def _save_channel_ids(db, lines, videos):
    found = {}
    for video in videos or []:
        title = (video.get("channel_title") or "").strip()
        channel_id = video.get("channel_id") or ""
        if title and channel_id:
            found[title.lower()] = (title, channel_id)
    updated = []
    changed = False
    for raw in lines or []:
        ref = parse_channel_ref(raw) or {}
        if ref.get("channel_id"):
            name = ref.get("name") or ""
            updated.append(((name + " | " + ref["channel_id"]).strip()) if name else ref["channel_id"])
            continue
        name = ref.get("name") or str(raw).strip()
        match = None
        for title, pair in found.items():
            if _same_channel_name(title, name):
                match = pair
                break
        if match:
            updated.append(match[0] + " | " + match[1])
            changed = True
        else:
            updated.append(str(raw))
    if changed:
        db.execute(
            "INSERT INTO config (key, value) VALUES ('niche_channels', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (json.dumps(updated),),
        )
        db.commit()


def _saved_sample(db, channel_ids, fresh, limit=200):
    """Keep the cached videos for each channel and overlay the newest page."""
    by_id = {}
    ids = [item for item in channel_ids or [] if item]
    if ids:
        query = (
            "SELECT video_id, channel_id, channel_title, title, description, views, duration_seconds, published_at "
            "FROM lookalike_videos WHERE channel_id IN (" + ",".join("?" for _ in ids) + ")"
        )
        grouped = {}
        for row in db.execute(query, ids):
            item = {
                "video_id": row["video_id"],
                "channel_id": row["channel_id"],
                "channel_title": row["channel_title"] or "",
                "title": row["title"] or "",
                "description": row["description"] or "",
                "views": row["views"] or 0,
                "duration_seconds": row["duration_seconds"] or 0,
                "published_at": row["published_at"] or "",
            }
            grouped.setdefault(item["channel_id"], []).append(item)
        for items in grouped.values():
            items.sort(key=lambda item: item.get("published_at") or "", reverse=True)
            for item in items[:limit]:
                by_id[item["video_id"]] = item
    for video in fresh or []:
        video_id = video.get("video_id")
        if not video_id:
            continue
        current = by_id.get(video_id)
        if current:
            for key, value in video.items():
                if value not in (None, ""):
                    current[key] = value
        else:
            by_id[video_id] = dict(video)
    return list(by_id.values())


def rescore_saved_lists(db, topic_id, video_id=None, restore=False):
    """Rebuild the top 10 from cached videos. This does not call YouTube."""
    if video_id and restore:
        restore_video(db, video_id)
    elif video_id:
        ignore_video(db, video_id)
    topic = db.execute("SELECT id, short, title FROM topics WHERE id = ?", (int(topic_id),)).fetchone()
    if topic is None:
        raise ValueError("Unknown topic.")
    brand = str(topic["short"] or topic["title"] or "").strip()
    niche = read_niche(db)
    channel_ids = []
    for link in niche.get("channels") or []:
        ref = parse_channel_ref(link)
        if ref.get("channel_id"):
            channel_ids.append(ref["channel_id"])
    videos = _saved_sample(db, channel_ids, [])
    lookalikes = score_lookalikes(videos, brand, ignored=ignored_ids(db))
    row = db.execute("SELECT body FROM dossiers WHERE topic_id = ?", (int(topic_id),)).fetchone()
    body = json.loads(row["body"]) if row else {}
    text = body.get("text") or ""
    block = list_notes(lookalikes)
    start = text.find("Top big winners:")
    end = text.find("\nSame topic videos:")
    if start >= 0 and end > start:
        text = text[:start] + block + text[end:]
    else:
        text = (text + "\n" + block).strip()
    fresh = _patterns(videos, ignored_ids(db))
    titles = re.search(r"Outlier titles: .*?\.", fresh or "")
    if titles and "Outlier titles:" in text:
        text = re.sub(r"Outlier titles: .*?\.", titles.group(0), text, count=1)
    if titles and "Outlier titles:" in (body.get("patterns") or ""):
        body["patterns"] = re.sub(r"Outlier titles: .*?\.", titles.group(0), body["patterns"], count=1)
    body["text"] = text
    body["winners"] = [winner_public(item) for item in lookalikes.get("outliers") or []]
    body["sameTopicWinners"] = [winner_public(item) for item in lookalikes.get("same_topic_winners") or []]
    body["tooSmall"] = [winner_public(item) for item in lookalikes.get("too_small") or []]
    body["ignored"] = ignored_public(db)
    save_dossier(db, int(topic_id), body)
    return body


def run_job(db=None, evidence_transport=None, media_transport=None, youtube_transport=None, day=None, topic_id=None):
    load_env()
    own = db is None
    db = db or connect()
    try:
        day = day or _today()
        niche = read_niche(db)
        quota = Quota(used=quota_used(db, day))
        cache = {}
        topics = _load_topics(db, topic_id)
        if topics:
            _announce(topics[0])
        channels = [ref for ref in (parse_channel_ref(link) for link in (niche.get("channels") or [])) if ref]
        channel_note = "Setup channel links"
        videos = []
        if channels and os.environ.get("YOUTUBE_API_KEY", "").strip():
            if not quota.allow(VIDEO_COST):
                log(db, "youtube", "Stopped before the quota guard. Used " + str(quota.used) + ".")
            else:
                def remember(key):
                    cached = cache_get(db, key)
                    if cached is not None:
                        cache[key] = cached
                for channel in channels:
                    if channel.get("name") and not channel.get("channel_id") and not channel.get("handle"):
                        remember("youtube.name.v3:" + channel["name"].strip().lower())
                        local_ids = []
                        for row in db.execute("SELECT DISTINCT channel_id, channel_title FROM lookalike_videos"):
                            if row["channel_id"] and _same_channel_name(row["channel_title"], channel["name"]):
                                local_ids.append(row["channel_id"])
                        cache["youtube.local:" + channel["name"].strip().lower()] = local_ids
                        continue
                    identity = (channel.get("channel_id") or channel.get("handle") or "").lower()
                    if not identity:
                        continue
                    remember("youtube.channel:" + identity)
                before_pull = quota.used

                def lookup(key):
                    if key in cache:
                        return cache[key]
                    found = cache_get(db, key)
                    if found is not None:
                        cache[key] = found
                    return found

                videos, stopped = collect_channel_uploads(
                    channels,
                    quota,
                    youtube_transport or live_youtube,
                    cache,
                    video_cache_get=lookup,
                    refresh_pages=1,
                )
                _save_channel_ids(db, niche.get("channels") or [], videos)
                for key, payload in cache.items():
                    if key in ("youtube.misses", "youtube.resolved", "youtube.upload_totals") or not isinstance(key, str) or not key.startswith("youtube."):
                        continue
                    if key.startswith("youtube.playlist_pages") or key.startswith("youtube.video_calls") or key.startswith("youtube.cached_videos"):
                        continue
                    cache_put(db, key, payload)
                save_videos(db, videos)
                channel_ids = [item.get("channel_id") for item in channels if item.get("channel_id")]
                videos = _saved_sample(db, channel_ids, videos)
                set_quota(db, day, quota.used)
                misses = ", ".join(cache.get("youtube.misses") or [])
                resolved = "; ".join(cache.get("youtube.resolved") or [])
                named = [item.get("name") for item in channels if item.get("name") and not item.get("channel_id") and not item.get("handle")]
                search_note = " Name search skipped. Saved channel IDs were used." if not named else " Name search used for " + ", ".join(named) + "."
                totals = []
                for item in (cache.get("youtube.upload_totals") or {}).values():
                    if item.get("more"):
                        totals.append((item.get("name") or "Channel") + " at least " + str(item.get("on_page") or 0) + ", more pages exist")
                    else:
                        totals.append((item.get("name") or "Channel") + " " + str(item.get("on_page") or 0) + " uploads")
                log(
                    db,
                    "youtube",
                    channel_note
                    + ". Daily refresh. Newest page only for "
                    + str(len(cache.get("youtube.upload_totals") or {}))
                    + " channels. Playlist calls "
                    + str(cache.get("youtube.playlist_pages") or 0)
                    + ". Video calls "
                    + str(cache.get("youtube.video_calls") or 0)
                    + ". Cached videos "
                    + str(cache.get("youtube.cached_videos") or 0)
                    + ". This pull used "
                    + str(quota.used - before_pull)
                    + ". Quota used "
                    + str(quota.used)
                    + "."
                    + (" Stopped before the quota guard." if stopped else "")
                    + search_note
                    + ((" Uploads: " + "; ".join(totals) + ".") if totals else "")
                    + ((" Unresolved: " + misses + ".") if misses else "")
                    + ((" Resolved: " + resolved + ".") if resolved else ""),
                )
        elif channels:
            log(db, "youtube", "YouTube Data API key is not set. Skipped lookalike uploads.")
        else:
            log(db, "youtube", "Setup has no lookalike channel links. No uploads were pulled.")
        if videos and os.environ.get("YOUTUBE_API_KEY", "").strip():
            comment_transport = youtube_transport or live_youtube
            by_id = {video.get("video_id"): video for video in videos if video.get("video_id")}
            read_comments = 0
            comment_calls = 0
            fetched = set()
            before_comments = quota.used

            def pull_comments(video):
                nonlocal read_comments, comment_calls
                video_id = video.get("video_id")
                if not video_id or video_id in fetched:
                    return
                fetched.add(video_id)
                comment_key = "youtube.comments:" + video_id
                cached = cache.get(comment_key)
                if cached is None:
                    cached = cache_get(db, comment_key)
                if isinstance(cached, dict) and "comments" in cached:
                    video["comments"] = list(cached.get("comments") or [])
                    cache[comment_key] = cached
                    read_comments += len(video["comments"])
                    return
                if not quota.allow(VIDEO_COST):
                    video["comments"] = []
                    return
                try:
                    payload = comment_transport({"kind": "youtube.comments", "video_id": video_id}) or {}
                except Exception:
                    payload = {"comments": []}
                quota.spend(VIDEO_COST)
                comment_calls += 1
                video["comments"] = list(payload.get("comments") or [])
                packed = {"comments": video["comments"]}
                cache[comment_key] = packed
                cache_put(db, comment_key, packed)
                read_comments += len(video["comments"])

            for topic in topics:
                brand_name = str(_field(topic, "short", "") or _field(topic, "title", "")).strip()
                same_topic = same_topic_videos(videos, brand_name)
                for item in same_topic[:3]:
                    video = by_id.get(item.get("video_id"))
                    if video:
                        pull_comments(video)
            set_quota(db, day, quota.used)
            log(db, "youtube", "Read up to 100 comments on the 3 same-topic videos with the most views. Comment lines kept: " + str(read_comments) + ". Comment calls " + str(comment_calls) + ". This comment pull used " + str(quota.used - before_comments) + ". Quota used " + str(quota.used) + ".")
        evidence = evidence_transport or live_evidence
        media = media_transport or live_media

        class GdeltCache:
            def get(self, key):
                return cache_fresh(db, key, 24)

            def put(self, key, payload):
                cache_put(db, key, payload)

        gdelt_cache = GdeltCache()
        written = 0
        for topic in topics:
            _announce(topic)
            research_topic(db, topic, evidence, media, videos, gdelt_cache)
            written += 1
        scope = "the open topic" if topic_id else "the next topics to post"
        log(db, "dossier", "Wrote " + str(written) + " dossiers for " + scope + ".")
        return {"ok": True, "topics": written, "quota": quota.used, "topic_ids": [topic["id"] for topic in topics]}
    finally:
        if own:
            db.close()
