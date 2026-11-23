"""Free official APIs only. No Google or YouTube page scraping."""

import base64
import html
import json
import os
import re
import time
import zlib
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

from .core import (
    SEARCH_COST,
    VIDEO_COST,
    business_news_story,
    choose_entity,
    domain_of,
    gdelt_pause,
    parse_duration,
    parse_wikidata_entity,
    store_count_candidates,
)

USER_AGENT = "CounterNotesResearch/0.1 (local research; no scrape)"
UPLOAD_LIMIT = 200
UPLOAD_PAGE = 50
SKIP_HOSTS = ("youtube.com", "youtu.be", "google.com", "googlevideo.com", "webcache.googleusercontent.com")
_ROBOTS = {}


_LAST_GDELT = {"at": 0.0}


def _gdelt_items(data):
    if not isinstance(data, dict):
        return {"items": [], "error": "GDELT returned no article list."}
    return {"items": [{
        "url": item.get("url") or "",
        "date": (item.get("seendate") or "")[:8],
        "text": item.get("title") or "",
        "title": item.get("title") or "",
        "language": item.get("language") or "English",
        "name": item.get("domain") or "GDELT",
    } for item in data.get("articles") or []], "error": ""}


def fetch_gdelt(query, sleep=time.sleep, clock=time.time):
    """Wait between calls. On 429, skip this source and keep going."""
    gdelt_query = '"' + str(query or "").replace('"', "") + '" sourcelang:english'
    url = "https://api.gdeltproject.org/api/v2/doc/doc?" + urllib.parse.urlencode({
        "query": gdelt_query,
        "mode": "artlist",
        "maxrecords": 15,
        "format": "json",
        "sourcelang": "english",
    })

    def once():
        wait = gdelt_pause(_LAST_GDELT["at"], clock())
        if wait:
            sleep(wait)
        _LAST_GDELT["at"] = clock()
        return http_json(url)

    try:
        return _gdelt_items(once())
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            return {"items": [], "error": "GDELT returned 429. Skipped."}
        return {"items": [], "error": "HTTP " + str(exc.code)}
    except Exception as exc:
        return {"items": [], "error": type(exc).__name__}


def http_json(url, headers=None):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def collect_youtube(keywords, quota, transport, cache):
    """transport(request) -> payload. cache is a dict the caller persists."""
    videos = []
    for keyword in keywords:
        key = "youtube.search:" + keyword.strip().lower()
        if key in cache:
            payload = cache[key]
        else:
            if not quota.allow(SEARCH_COST):
                break
            payload = transport({"kind": "youtube.search", "q": keyword}) or {}
            quota.spend(SEARCH_COST)
            cache[key] = payload
        ids = payload.get("ids") or []
        missing = [video_id for video_id in ids if "youtube.video:" + video_id not in cache]
        if missing:
            if not quota.allow(VIDEO_COST):
                break
            details = transport({"kind": "youtube.videos", "ids": missing}) or {"videos": []}
            quota.spend(VIDEO_COST)
            for video in details.get("videos") or []:
                cache["youtube.video:" + video["video_id"]] = video
        for video_id in ids:
            video = cache.get("youtube.video:" + video_id)
            if video:
                videos.append(video)
    return videos


def parse_channel_ref(value):
    text = str(value or "").strip()
    if not text:
        return None
    label = ""
    if "|" in text:
        left, right = text.split("|", 1)
        if re.search(r"UC[A-Za-z0-9_-]{20,}", right) or "youtube.com" in right.lower() or right.strip().startswith("@"):
            label = left.strip()
            text = right.strip()
    channel = re.search(r"youtube\.com/channel/([A-Za-z0-9_-]+)", text, re.I)
    if channel:
        return {"channel_id": channel.group(1), "handle": "", "name": label}
    handle = re.search(r"youtube\.com/(?:@|c/|user/)([^/?]+)", text, re.I)
    if handle:
        return {"channel_id": "", "handle": urllib.parse.unquote(handle.group(1)), "name": label}
    if re.fullmatch(r"UC[A-Za-z0-9_-]{20,}", text):
        return {"channel_id": text, "handle": "", "name": label}
    if text.startswith("@"):
        return {"channel_id": "", "handle": text[1:], "name": label}
    return {"channel_id": "", "handle": "", "name": label or text}


def _same_channel_name(title, name):
    def compact(value):
        return re.sub(r"[\s\W_]+", "", (value or "").lower(), flags=re.UNICODE)
    wanted = compact(name)
    return bool(wanted) and compact(title) == wanted


def _resolve_named_channel(name, quota, transport, cache):
    """Turn a Setup channel name into an uploads playlist. Videos still come from that playlist."""
    key = "youtube.name.v3:" + name.strip().lower()
    cached = cache.get(key)
    if isinstance(cached, dict) and cached.get("uploads"):
        return cached
    ids = []
    handle = re.sub(r"[^A-Za-z0-9]", "", name)
    if handle and quota.allow(VIDEO_COST):
        try:
            info = transport({"kind": "youtube.channel", "handle": handle}) or {}
        except Exception:
            info = {}
        quota.spend(VIDEO_COST)
        if info.get("channel_id") and _same_channel_name(info.get("channel_title"), name):
            ids.append(info["channel_id"])
    if not quota.allow(SEARCH_COST):
        cache.setdefault("youtube.misses", []).append(name)
        return {}
    try:
        found = transport({"kind": "youtube.channelSearch", "q": name}) or {}
    except Exception:
        found = {}
    quota.spend(SEARCH_COST)
    for item in found.get("channels") or []:
        if item.get("channel_id") and _same_channel_name(item.get("channel_title"), name):
            ids.append(item["channel_id"])
    for channel_id in cache.get("youtube.local:" + name.strip().lower()) or []:
        if channel_id:
            ids.append(channel_id)
    unique = []
    for channel_id in ids:
        if channel_id not in unique:
            unique.append(channel_id)
    if not unique or not quota.allow(VIDEO_COST):
        cache.setdefault("youtube.misses", []).append(name)
        return {}
    try:
        details = transport({"kind": "youtube.channels", "ids": unique[:50]}) or {}
    except Exception:
        details = {}
    quota.spend(VIDEO_COST)
    best = None
    for item in details.get("channels") or []:
        if not item.get("uploads") or not _same_channel_name(item.get("channel_title"), name):
            continue
        if best is None or int(item.get("subscribers") or 0) > int(best.get("subscribers") or 0):
            best = item
    if not best:
        cache.setdefault("youtube.misses", []).append(name)
        return {}
    cache[key] = best
    cache.setdefault("youtube.resolved", []).append(
        name + " -> " + (best.get("channel_title") or "") + " " + best.get("channel_id", "") + " subscribers " + str(best.get("subscribers") or 0)
    )
    return best


def _batches(items, size):
    rows = list(items or [])
    for start in range(0, len(rows), size):
        yield rows[start:start + size]


def collect_channel_uploads(channels, quota, transport, cache, video_cache_get=None, refresh_pages=None):
    """Uploads from the playlist, then videos.list. No video search.

    refresh_pages=1 reads only the newest page. None reads pages until 200 videos.
    """
    videos = []
    stopped = False
    for channel in channels or []:
        ref = channel if isinstance(channel, dict) else parse_channel_ref(channel)
        if not ref:
            continue
        if ref.get("name") and not ref.get("channel_id") and not ref.get("handle"):
            info = _resolve_named_channel(ref["name"], quota, transport, cache)
            if not info.get("channel_id"):
                continue
            ref = {"channel_id": info["channel_id"], "handle": "", "name": ""}
            cache["youtube.channel:" + info["channel_id"].lower()] = info
        identity = ref.get("channel_id") or ref.get("handle") or ""
        channel_key = "youtube.channel:" + identity.lower()
        if channel_key in cache:
            info = cache[channel_key]
        else:
            if not quota.allow(VIDEO_COST):
                stopped = True
                break
            try:
                info = transport({"kind": "youtube.channel", "channel_id": ref.get("channel_id") or "", "handle": ref.get("handle") or ""}) or {}
            except Exception:
                info = {}
            quota.spend(VIDEO_COST)
            cache[channel_key] = info
        uploads = info.get("uploads") or ""
        channel_id = info.get("channel_id") or ref.get("channel_id") or ""
        channel_title = info.get("channel_title") or ""
        if not uploads:
            continue
        ids = []
        seen = set()
        page_token = ""
        pages_read = 0
        while len(ids) < UPLOAD_LIMIT:
            if refresh_pages is not None and pages_read >= refresh_pages:
                break
            if not quota.allow(VIDEO_COST):
                stopped = True
                break
            try:
                payload = transport({
                    "kind": "youtube.playlist",
                    "playlist_id": uploads,
                    "page_token": page_token,
                    "max_results": UPLOAD_PAGE,
                }) or {}
            except Exception:
                payload = {}
            quota.spend(VIDEO_COST)
            pages_read += 1
            cache["youtube.playlist_pages"] = cache.get("youtube.playlist_pages", 0) + 1
            for video_id in payload.get("ids") or []:
                if video_id and video_id not in seen:
                    seen.add(video_id)
                    ids.append(video_id)
                    if len(ids) >= UPLOAD_LIMIT:
                        break
            page_token = payload.get("next_page_token") or ""
            if not page_token:
                break
        if channel_id:
            cache.setdefault("youtube.upload_totals", {})[channel_id] = {
                "name": channel_title or channel_id,
                "on_page": len(ids),
                "more": bool(page_token),
            }
        if stopped and not ids:
            break
        missing = []
        cached_here = 0
        for video_id in ids:
            key = "youtube.video:" + video_id
            cached_video = cache.get(key)
            if (not isinstance(cached_video, dict) or "description" not in cached_video) and video_cache_get:
                cached_video = video_cache_get(key)
                if isinstance(cached_video, dict):
                    cache[key] = cached_video
            if isinstance(cached_video, dict) and "description" in cached_video:
                cached_here += 1
            else:
                missing.append(video_id)
        cache["youtube.cached_videos"] = cache.get("youtube.cached_videos", 0) + cached_here
        for batch in _batches(missing, UPLOAD_PAGE):
            if not quota.allow(VIDEO_COST):
                stopped = True
                break
            try:
                details = transport({"kind": "youtube.videos", "ids": batch}) or {"videos": []}
            except Exception:
                details = {"videos": []}
            quota.spend(VIDEO_COST)
            cache["youtube.video_calls"] = cache.get("youtube.video_calls", 0) + 1
            for video in details.get("videos") or []:
                if video.get("video_id"):
                    cache["youtube.video:" + video["video_id"]] = video
        sample = []
        for video_id in ids:
            video = cache.get("youtube.video:" + video_id)
            if not isinstance(video, dict):
                continue
            item = dict(video)
            item["channel_id"] = item.get("channel_id") or channel_id
            item["channel_title"] = item.get("channel_title") or channel_title
            sample.append(item)
        for item in sample:
            item["sample_size"] = len(sample)
            videos.append(item)
        if stopped:
            break
    return videos, stopped


def live_youtube(request):
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("YouTube Data API key is not set.")
    if request["kind"] == "youtube.channel":
        params = {"part": "snippet,contentDetails", "key": key}
        if request.get("channel_id"):
            params["id"] = request["channel_id"]
        elif request.get("handle"):
            params["forHandle"] = request["handle"]
        else:
            return {}
        data = http_json("https://www.googleapis.com/youtube/v3/channels?" + urllib.parse.urlencode(params))
        item = (data.get("items") or [None])[0] or {}
        uploads = ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads") or ""
        return {
            "channel_id": item.get("id") or "",
            "channel_title": (item.get("snippet") or {}).get("title") or "",
            "uploads": uploads,
        }
    if request["kind"] == "youtube.playlist":
        size = int(request.get("max_results") or UPLOAD_PAGE)
        size = max(1, min(UPLOAD_PAGE, size))
        params = {
            "part": "contentDetails",
            "maxResults": size,
            "playlistId": request.get("playlist_id") or "",
            "key": key,
        }
        if request.get("page_token"):
            params["pageToken"] = request["page_token"]
        data = http_json("https://www.googleapis.com/youtube/v3/playlistItems?" + urllib.parse.urlencode(params))
        ids = []
        for item in data.get("items") or []:
            video_id = ((item.get("contentDetails") or {}).get("videoId")) or ""
            if video_id:
                ids.append(video_id)
        return {"ids": ids, "next_page_token": data.get("nextPageToken") or ""}
    if request["kind"] == "youtube.channelSearch":
        query = urllib.parse.urlencode({
            "part": "snippet",
            "type": "channel",
            "maxResults": 50,
            "q": request.get("q") or "",
            "key": key,
        })
        data = http_json("https://www.googleapis.com/youtube/v3/search?" + query)
        channels = []
        for item in data.get("items") or []:
            channel_id = (item.get("id") or {}).get("channelId") or ""
            title = ((item.get("snippet") or {}).get("title")) or ""
            if channel_id:
                channels.append({"channel_id": channel_id, "channel_title": title})
        return {"channels": channels}
    if request["kind"] == "youtube.channels":
        params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(request.get("ids") or []),
            "maxResults": 50,
            "key": key,
        }
        data = http_json("https://www.googleapis.com/youtube/v3/channels?" + urllib.parse.urlencode(params))
        channels = []
        for item in data.get("items") or []:
            stats = item.get("statistics") or {}
            uploads = ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads") or ""
            channels.append({
                "channel_id": item.get("id") or "",
                "channel_title": (item.get("snippet") or {}).get("title") or "",
                "uploads": uploads,
                "subscribers": int(stats.get("subscriberCount") or 0),
            })
        return {"channels": channels}
    if request["kind"] == "youtube.search":
        query = urllib.parse.urlencode({
            "part": "snippet",
            "type": "video",
            "maxResults": 5,
            "q": request["q"],
            "key": key,
        })
        data = http_json("https://www.googleapis.com/youtube/v3/search?" + query)
        ids = [item["id"]["videoId"] for item in data.get("items") or [] if item.get("id", {}).get("videoId")]
        return {"ids": ids}
    if request["kind"] == "youtube.comments":
        params = {
            "part": "snippet",
            "videoId": request.get("video_id") or "",
            "maxResults": 100,
            "order": "relevance",
            "textFormat": "plainText",
            "key": key,
        }
        try:
            data = http_json("https://www.googleapis.com/youtube/v3/commentThreads?" + urllib.parse.urlencode(params))
        except urllib.error.HTTPError as exc:
            return {"comments": [], "error": "HTTP " + str(exc.code)}
        comments = []
        for item in data.get("items") or []:
            top = ((item.get("snippet") or {}).get("topLevelComment") or {}).get("snippet") or {}
            text = top.get("textDisplay") or top.get("textOriginal") or ""
            if text:
                comments.append({"text": text, "likes": int(top.get("likeCount") or 0)})
        return {"comments": comments[:100], "error": ""}
    ids = ",".join(request.get("ids") or [])
    query = urllib.parse.urlencode({
        "part": "snippet,statistics,contentDetails",
        "id": ids,
        "key": key,
    })
    data = http_json("https://www.googleapis.com/youtube/v3/videos?" + query)
    videos = []
    for item in data.get("items") or []:
        stats = item.get("statistics") or {}
        snippet = item.get("snippet") or {}
        thumbs = snippet.get("thumbnails") or {}
        thumb = (thumbs.get("medium") or thumbs.get("default") or {}).get("url") or ""
        videos.append({
            "video_id": item.get("id"),
            "channel_id": snippet.get("channelId") or "",
            "channel_title": snippet.get("channelTitle") or "",
            "title": snippet.get("title") or "",
            "description": snippet.get("description") or "",
            "views": int(stats.get("viewCount") or 0),
            "duration_seconds": parse_duration((item.get("contentDetails") or {}).get("duration")),
            "published_at": snippet.get("publishedAt") or "",
            "thumbnail_url": thumb,
            "comment_count": int(stats.get("commentCount") or 0),
        })
    return {"videos": videos}


EVIDENCE_KINDS = ("wikipedia", "wikidata", "sec", "fred", "worldbank", "gdelt", "rss")


def gather_evidence(query, transport):
    snippets = []
    report = []
    for kind in EVIDENCE_KINDS:
        try:
            rows = transport({"kind": kind, "q": query}) or []
        except Exception as exc:
            report.append({"kind": kind, "count": 0, "note": str(exc), "items": []})
            continue
        if isinstance(rows, dict):
            rows = rows.get("items") or []
        items = []
        for row in rows:
            url = row.get("url") or ""
            text = row.get("text") or ""
            snippets.append({
                "kind": kind,
                "url": url,
                "domain": domain_of(url),
                "date": row.get("date") or "",
                "text": text,
                "name": row.get("name") or kind,
            })
            if url or text:
                items.append({
                    "url": url,
                    "name": row.get("name") or kind,
                    "date": row.get("date") or "",
                    "text": text[:240],
                })
        note = ""
        if kind == "worldbank" and not items:
            note = "No topic indicator was queried."
        if kind == "fred" and not items and not os.environ.get("FRED_API_KEY", "").strip():
            note = "Skipped. FRED_API_KEY is not set."
        report.append({"kind": kind, "count": len(items), "note": note, "items": items})
    return snippets, report


def _safe_error(exc):
    if isinstance(exc, urllib.error.HTTPError):
        return "HTTP " + str(exc.code)
    text = str(exc)
    secret = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if secret and secret in text:
        text = text.replace(secret, "[redacted]")
    return type(exc).__name__ + (": " + text[:120] if text else "")


def live_evidence(request):
    kind = request.get("kind")
    try:
        return _live_evidence(request)
    except Exception as exc:
        if kind == "resolve":
            time.sleep(2)
            try:
                return _live_evidence(request)
            except Exception as again:
                return {"chosen": None, "reason": "Entity lookup failed (" + _safe_error(again) + ").", "rejected": []}
        if kind == "wikipedia.article":
            return {"error": _safe_error(exc)}
        return []


def resolve_brand(brand):
    search_url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbsearchentities",
        "search": brand,
        "language": "en",
        "type": "item",
        "limit": 5,
        "format": "json",
    })
    search = http_json(search_url)
    ids = [item.get("id") for item in search.get("search") or [] if item.get("id")]
    if not ids:
        return {"chosen": None, "reason": "Wikidata returned no entities for " + brand + ".", "rejected": []}
    entity_url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbgetentities",
        "ids": "|".join(ids),
        "props": "labels|descriptions|claims|sitelinks",
        "languages": "en",
        "format": "json",
    })
    payload = http_json(entity_url)
    entities = (payload.get("entities") or {})
    candidates = []
    for item_id in ids:
        entity = entities.get(item_id) or {}
        parsed = parse_wikidata_entity(entity)
        if not parsed.get("description"):
            for hit in search.get("search") or []:
                if hit.get("id") == item_id:
                    parsed["description"] = hit.get("description") or ""
                    parsed["label"] = parsed.get("label") or hit.get("label") or ""
        candidates.append(parsed)
    return choose_entity(brand, candidates)


def wikipedia_article(title):
    if not title:
        return {}
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query",
        "prop": "extracts|extlinks|pageprops",
        "explaintext": 1,
        "exlimit": 1,
        "ellimit": 20,
        "redirects": 1,
        "titles": title,
        "format": "json",
    })
    data = http_json(url)
    pages = (data.get("query") or {}).get("pages") or {}
    page = next(iter(pages.values()), {})
    props = page.get("pageprops") or {}
    links = []
    for item in page.get("extlinks") or []:
        link = item.get("*") or ""
        if link.startswith("http://") or link.startswith("https://"):
            links.append(link)
    return {
        "title": page.get("title") or title,
        "extract": (page.get("extract") or "")[:80000],
        "links": links,
        "disambiguation": "disambiguation" in props,
        "wikibase": props.get("wikibase_item") or "",
    }


def company_urls(website):
    if not website:
        return []
    parsed = urllib.parse.urlparse(website if "://" in website else "https://" + website)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return []
    origin = parsed.scheme + "://" + parsed.netloc
    paths = ["", "/press", "/newsroom", "/news", "/investors", "/investor-relations"]
    return [origin + path for path in paths]


def robots_allows(url):
    parsed = urllib.parse.urlparse(url)
    host = (parsed.netloc or "").lower()
    if parsed.scheme not in ("http", "https") or not host:
        return False
    if any(host == skip or host.endswith("." + skip) for skip in SKIP_HOSTS):
        return False
    if host not in _ROBOTS:
        robots_url = parsed.scheme + "://" + parsed.netloc + "/robots.txt"
        parser = urllib.robotparser.RobotFileParser()
        try:
            request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=15) as response:
                parser.parse(response.read().decode("utf-8", "replace").splitlines())
            _ROBOTS[host] = parser
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403, 404):
                parser.parse([])
                _ROBOTS[host] = parser
            else:
                _ROBOTS[host] = None
        except Exception:
            _ROBOTS[host] = None
    parser = _ROBOTS[host]
    if parser is None:
        return False
    return parser.can_fetch(USER_AGENT, url)


def html_to_text(raw):
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", raw or "")
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:50000]


def fetch_reference_pages(urls, kind_name="reference"):
    rows = []
    blocked = 0
    failed = 0
    failures = []
    seen = set()

    def mark_failed(url, reason):
        nonlocal failed
        failed += 1
        if len(failures) < 6:
            failures.append((domain_of(url) or "page") + " " + reason)

    for url in urls or []:
        if len(rows) >= 6:
            break
        if not url or url in seen:
            continue
        seen.add(url)
        if not robots_allows(url):
            blocked += 1
            continue
        time.sleep(1)
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html, text/plain"})
            with urllib.request.urlopen(request, timeout=15) as response:
                content_type = (response.headers.get("Content-Type") or "").lower()
                if "html" not in content_type and "text" not in content_type:
                    mark_failed(url, "not text")
                    continue
                raw = response.read(200000).decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            mark_failed(url, "HTTP " + str(exc.code))
            continue
        except Exception as exc:
            mark_failed(url, type(exc).__name__)
            continue
        text = html_to_text(raw)
        if len(text) < 40:
            mark_failed(url, "too short")
            continue
        rows.append({
            "url": url,
            "date": "",
            "text": text,
            "name": domain_of(url) or kind_name,
            "kind": kind_name,
        })
    return {"rows": rows, "blocked": blocked, "failed": failed, "failures": failures}


PUBLISHER_FEEDS = (
    ("Restaurant Dive", "https://www.restaurantdive.com/feeds/news/"),
    ("Restaurant Business", "https://www.restaurantbusinessonline.com/feed/"),
    ("QSR Magazine", "https://www.qsrmagazine.com/feed/"),
    ("Nation's Restaurant News", "https://www.nrn.com/rss.xml"),
)


def news_queries(brand):
    name = (brand or "").strip()
    bases = [name + " franchise", name + " stores closing", name + " sales decline"]
    outlets = ["Restaurant Business", "Nation's Restaurant News", "QSR"]
    queries = []
    for base in bases:
        queries.append(base)
        for outlet in outlets:
            queries.append(base + " " + outlet)
    return queries


def news_search_feed(query):
    packed = urllib.parse.urlencode({
        "q": query or "",
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
    })
    return "https://news.google.com/rss/search?" + packed


def parse_rss_items(raw):
    items = []
    for chunk in re.findall(r"(?is)<item\b.*?</item>", raw or ""):
        title = re.search(r"(?is)<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", chunk)
        link = re.search(r"(?is)<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", chunk)
        if not link:
            link = re.search(r"(?is)<guid[^>]*>(.*?)</guid>", chunk)
        description = re.search(r"(?is)<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", chunk)
        published = re.search(r"(?is)<pubDate>(.*?)</pubDate>", chunk)
        source = re.search(r'(?is)<source\b[^>]*url=["\']([^"\']+)["\']', chunk)
        items.append({
            "title": html.unescape(re.sub(r"<[^>]+>", "", (title.group(1) if title else "")).strip()),
            "url": html.unescape(re.sub(r"\s+", "", (link.group(1) if link else "")).strip()),
            "source_url": (source.group(1).strip() if source else ""),
            "text": html.unescape(re.sub(r"<[^>]+>", " ", (description.group(1) if description else "")).strip()),
            "date": (published.group(1).strip() if published else ""),
        })
    return items


def _brand_in_story(brand, title, text):
    """The brand is in the title or summary, and the story is not about trains or transit."""
    raw = re.sub(r"<[^>]+>", " ", (title or "") + " " + (text or ""))
    words = re.findall(r"[a-z0-9']+", raw.lower())
    if any(word in ("train", "trains", "metro", "transit") for word in words):
        return False
    needle = re.findall(r"[a-z0-9']+", (brand or "").lower())
    if not needle:
        return False
    for index in range(len(words) - len(needle) + 1):
        if words[index:index + len(needle)] == needle:
            return True
    return False


def fetch_publisher_rss(brand, read=None, allows=None):
    """Read the official publisher feeds and keep stories that name the brand."""
    def opener(url):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"})
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.read().decode("utf-8", "replace")

    load = read or opener
    permitted = allows or robots_allows
    matched = []
    seen = set()
    publishers = []
    for name, url in PUBLISHER_FEEDS:
        if not permitted(url):
            publishers.append({
                "name": name,
                "url": url,
                "feed": 0,
                "matched": 0,
                "dropped": 0,
                "blocked": True,
                "error": "robots.txt does not allow this feed.",
            })
            continue
        try:
            raw = load(url)
        except Exception as exc:
            detail = type(exc).__name__ + (": HTTP " + str(exc.code) if isinstance(exc, urllib.error.HTTPError) else "")
            publishers.append({
                "name": name,
                "url": url,
                "feed": 0,
                "matched": 0,
                "dropped": 0,
                "blocked": False,
                "error": "The feed could not be read. " + detail,
            })
            continue
        if "<item" not in (raw or "").lower():
            publishers.append({
                "name": name,
                "url": url,
                "feed": 0,
                "matched": 0,
                "dropped": 0,
                "blocked": False,
                "error": "This address did not return a feed.",
            })
            continue
        kept = 0
        dropped = 0
        parsed = parse_rss_items(raw)
        for item in parsed:
            title = item.get("title") or ""
            summary = item.get("text") or ""
            if _brand_in_story(brand, title, summary):
                kept += 1
                key = (item.get("url") or title).strip().lower()
                if key and key not in seen:
                    seen.add(key)
                    matched.append({**item, "name": name, "text": (title + ". " + summary).strip()})
            else:
                dropped += 1
        publishers.append({
            "name": name,
            "url": url,
            "feed": len(parsed),
            "matched": kept,
            "dropped": dropped,
            "blocked": False,
            "error": "",
        })
    return {"items": matched, "publishers": publishers}


def decode_google_news_url(url):
    """Read a publisher URL out of a Google News article id. Does not fetch Google."""
    parsed = urllib.parse.urlparse(url or "")
    token = (parsed.path.rsplit("/", 1)[-1] if "/articles/" in (parsed.path or "") else "").strip()
    if not token:
        return ""
    try:
        raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
    except Exception:
        return ""
    text = raw.decode("latin1", "replace")
    for match in re.finditer(r"https?://[^\x00-\x1f\s\"'\\]+", text):
        found = match.group(0).rstrip(".,);")
        host = (urllib.parse.urlparse(found).netloc or "").lower()
        if host and "google." not in host and "gstatic." not in host:
            return found
    return ""


def resolve_article_url(url):
    target = str(url or "").strip()
    if not target:
        return ""
    if "news.google." not in target:
        return target
    return decode_google_news_url(target)


def fetch_article_text(url):
    if not robots_allows(url):
        return "", "blocked"
    time.sleep(1)
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html, text/plain"})
        with urllib.request.urlopen(request, timeout=20) as response:
            final = response.geturl()
            content_type = (response.headers.get("Content-Type") or "").lower()
            if "html" not in content_type and "text" not in content_type:
                return "", "not text"
            raw = response.read(200000).decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return "", "HTTP " + str(exc.code)
    except Exception as exc:
        return "", type(exc).__name__
    if final and final != url and not robots_allows(final):
        return "", "blocked"
    parts = []
    title = re.search(r"(?is)<title>(.*?)</title>", raw)
    if title:
        parts.append(html_to_text(title.group(1)))
    description = re.search(r'(?is)<meta[^>]+(?:name|property)=["\'](?:description|og:description)["\'][^>]+content=["\'](.*?)["\']', raw)
    if not description:
        description = re.search(r'(?is)<meta[^>]+content=["\'](.*?)["\'][^>]+(?:name|property)=["\'](?:description|og:description)["\']', raw)
    if description:
        parts.append(html.unescape(description.group(1)))
    for chunk in re.findall(r"(?is)<p\b[^>]*>(.*?)</p>", raw):
        text = html_to_text(chunk)
        if text:
            parts.append(text)
    if not parts:
        parts.append(html_to_text(raw))
    body = "\n".join(parts).strip()
    if len(body) < 40:
        return "", "too short"
    return body, ""


def _story_candidate(text, url, brand):
    rows = store_count_candidates([{"kind": "news", "url": url, "text": text or ""}], limit=1, brand=brand)
    return rows[0] if rows else None


def prove_store_counts(items, brand, limit=3, resolve=None, fetch_text=None, allows=None, cache_get=None, cache_put=None):
    """Keep a real publisher URL and any store-count sentence. Nothing is confirmed."""
    found = []
    stories = []
    seen = set()
    stats = {"tried": 0, "resolved": 0, "blocked": 0, "failed": 0, "fetched": 0, "reason": "", "stories": stories}
    opener = resolve or resolve_article_url
    reader = fetch_text or fetch_article_text
    allowed = allows or robots_allows
    for item in items or []:
        url = item.get("url") or ""
        source_url = item.get("source_url") or ""
        source_path = urllib.parse.urlparse(source_url).path if source_url else ""
        if not url and not source_url:
            continue
        stats["tried"] += 1
        host = (urllib.parse.urlparse(url).netloc or "").lower()
        if "news.google." in url or "google.com" in host:
            real = source_url if source_path not in ("", "/") else (opener(url) or "")
        else:
            real = url
        story = {
            "url": real or url,
            "date": item.get("date") or "",
            "title": item.get("title") or "",
            "publisher": item.get("name") or "",
            "number": "",
            "year": "",
            "label": "",
            "sentence": "",
            "note": "",
        }
        if not real or "news.google." in real or "google.com" in (urllib.parse.urlparse(real).netloc or ""):
            stats["failed"] += 1
            story["note"] = "No real article URL."
            stats["reason"] = "The Google News article id does not contain the publisher URL, and robots.txt disallows fetching news.google.com."
            stories.append(story)
            continue
        stats["resolved"] += 1
        summary = (item.get("title") or "") + ". " + (item.get("text") or "")
        candidate = _story_candidate(summary, real, brand)
        if candidate is None:
            cache_key = "article:" + real
            cached = cache_get(cache_key) if cache_get else None
            if isinstance(cached, dict) and cached.get("text"):
                text = cached.get("text") or ""
            elif not allowed(real):
                stats["blocked"] += 1
                story["note"] = "robots.txt does not allow the article. No store count in the title or summary."
                stories.append(story)
                continue
            else:
                text, error = reader(real)
                stats["fetched"] += 1
                if error == "blocked":
                    stats["blocked"] += 1
                    story["note"] = "robots.txt does not allow the article. No store count in the title or summary."
                    stories.append(story)
                    continue
                if not text:
                    stats["failed"] += 1
                    story["note"] = "No store count in the title or summary."
                    stories.append(story)
                    continue
                if cache_put:
                    cache_put(cache_key, {"text": text, "url": real})
            candidate = _story_candidate(text, real, brand)
        if candidate:
            story["number"] = candidate["number"]
            story["year"] = candidate["year"]
            story["label"] = candidate["label"]
            story["sentence"] = candidate["sentence"]
            key = (candidate["number"], candidate["year"], candidate["label"])
            if key not in seen:
                seen.add(key)
                found.append(candidate)
        else:
            story["note"] = "No store count in the text we could read."
        stories.append(story)
        if limit and len(found) >= limit:
            break
    return found, stats


def _pdf_unescape(raw):
    out = []
    index = 0
    while index < len(raw):
        char = raw[index]
        if char != "\\" or index + 1 >= len(raw):
            out.append(char)
            index += 1
            continue
        nxt = raw[index + 1]
        if nxt in "nrtbf":
            out.append({"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f"}[nxt])
            index += 2
            continue
        if nxt in "()\\":
            out.append(nxt)
            index += 2
            continue
        if nxt.isdigit():
            octal = nxt
            index += 2
            for _ in range(2):
                if index < len(raw) and raw[index].isdigit():
                    octal += raw[index]
                    index += 1
                else:
                    break
            try:
                out.append(chr(int(octal, 8)))
            except ValueError:
                out.append(nxt)
            continue
        out.append(nxt)
        index += 2
    return "".join(out)


def _pdf_operators(data):
    if isinstance(data, bytes):
        data = data.decode("latin1", "replace")
    pieces = []
    for match in re.finditer(r"\(((?:\\.|[^\\)])*)\)\s*Tj", data):
        pieces.append(_pdf_unescape(match.group(1)))
    for match in re.finditer(r"\[(.*?)\]\s*TJ", data, re.S):
        for inner in re.finditer(r"\(((?:\\.|[^\\)])*)\)", match.group(1)):
            pieces.append(_pdf_unescape(inner.group(1)))
    return " ".join(piece for piece in pieces if piece.strip())


def extract_pdf_text(raw):
    """Text drawn on the page. An image-only PDF returns an empty string."""
    if not raw:
        return ""
    pieces = []
    for match in re.finditer(rb"stream\r?\n(.*?)endstream", raw, re.S):
        data = match.group(1).rstrip(b"\r\n")
        header = raw[max(0, match.start() - 300):match.start()]
        if b"FlateDecode" in header:
            try:
                data = zlib.decompress(data)
            except Exception:
                try:
                    data = zlib.decompress(data, -15)
                except Exception:
                    continue
        pieces.append(_pdf_operators(data))
    pieces.append(_pdf_operators(raw))
    return " ".join(piece for piece in pieces if piece).strip()


def _fetch_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/pdf, text/html, text/plain"})
    with urllib.request.urlopen(request, timeout=20) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        return response.read(2000000), content_type, response.geturl()


def check_pasted_page(url, number, claim):
    from .core import claim_matches_sentence, claim_phrase, verify_detail

    target = str(url or "").strip()
    if not target.startswith("http://") and not target.startswith("https://"):
        return {"confirmed": False, "reason": "Paste a full http or https link."}
    if not robots_allows(target):
        return {"confirmed": False, "reason": "robots.txt does not allow this page. Left as check this."}
    wants_pdf = target.lower().split("?")[0].endswith(".pdf")
    if wants_pdf:
        try:
            raw, content_type, final = _fetch_bytes(target)
        except urllib.error.HTTPError as exc:
            return {"confirmed": False, "reason": "The page could not be read. HTTP " + str(exc.code)}
        except Exception as exc:
            return {"confirmed": False, "reason": "The page could not be read. " + type(exc).__name__}
        if final and final != target and not robots_allows(final):
            return {"confirmed": False, "reason": "robots.txt does not allow this page. Left as check this."}
        if not raw.startswith(b"%PDF-") and "pdf" not in content_type:
            return {"confirmed": False, "reason": "The link did not return a PDF. Left as check this."}
        text = extract_pdf_text(raw)
        if not text:
            return {"confirmed": False, "reason": "This PDF is a scan with no text."}
        status, matches = verify_detail(number, [{
            "kind": "reference",
            "domain": domain_of(target),
            "url": target,
            "text": text,
            "name": domain_of(target),
        }], claim or "")
        if not matches:
            return {"confirmed": False, "reason": "The PDF does not put that number next to the claim and a year. Left as check this."}
        sentence = matches[0].get("sentence") or ""
        if not claim_matches_sentence(claim or "", sentence, number):
            return {"confirmed": False, "reason": "That sentence is a different claim. Left as check this.", "sentence": sentence}
        phrase = claim_phrase(number, claim or "", sentence)
        if not phrase:
            return {"confirmed": False, "reason": "The number is not next to a year. Left as check this.", "sentence": sentence}
        return {
            "confirmed": True,
            "status": status,
            "sentence": sentence,
            "claim": phrase,
            "name": domain_of(target),
            "url": target,
            "year": "",
        }
    payload = fetch_reference_pages([target], "pasted")
    if not payload["rows"]:
        reason = "The page could not be read."
        if payload["blocked"]:
            reason = "robots.txt does not allow this page. Left as check this."
        elif payload["failures"]:
            reason = payload["failures"][0]
        return {"confirmed": False, "reason": reason}
    page = payload["rows"][0]
    status, matches = verify_detail(number, [{
        "kind": "reference",
        "domain": domain_of(target),
        "url": target,
        "text": page.get("text") or "",
        "name": page.get("name") or domain_of(target),
    }], claim or "")
    if not matches:
        return {"confirmed": False, "reason": "The page does not put that number next to the claim and a year. Left as check this."}
    sentence = matches[0].get("sentence") or ""
    if not claim_matches_sentence(claim or "", sentence, number):
        return {"confirmed": False, "reason": "That sentence is a different claim. Left as check this.", "sentence": sentence}
    phrase = claim_phrase(number, claim or "", sentence)
    if not phrase:
        return {"confirmed": False, "reason": "The number is not next to a year. Left as check this.", "sentence": sentence}
    return {
        "confirmed": True,
        "status": status,
        "sentence": sentence,
        "claim": phrase,
        "name": page.get("name") or domain_of(target),
        "url": target,
    }


def _live_evidence(request):
    kind = request["kind"]
    query = request.get("q") or ""
    if kind == "resolve":
        return resolve_brand(query)
    if kind == "wikipedia.article":
        return wikipedia_article(request.get("title") or query)
    if kind == "references":
        return fetch_reference_pages(request.get("urls") or [], "reference")
    if kind == "official":
        return fetch_reference_pages(company_urls(request.get("website") or ""), "official")
    if kind == "wikipedia":
        url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": 3,
            "format": "json",
            "utf8": 1,
        })
        data = http_json(url)
        rows = []
        for item in (data.get("query") or {}).get("search") or []:
            title = item.get("title") or ""
            rows.append({
                "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
                "date": (item.get("timestamp") or "")[:10],
                "text": item.get("snippet") or "",
                "name": "Wikipedia",
            })
        return rows
    if kind == "wikidata":
        url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
            "action": "wbsearchentities",
            "search": query,
            "language": "en",
            "limit": 3,
            "format": "json",
        })
        data = http_json(url)
        return [{
            "url": "https://www.wikidata.org/wiki/" + item.get("id", ""),
            "date": "",
            "text": (item.get("label") or "") + " " + (item.get("description") or ""),
            "name": "Wikidata",
        } for item in data.get("search") or []]
    if kind == "sec":
        url = "https://efts.sec.gov/LATEST/search-index?" + urllib.parse.urlencode({
            "q": query,
            "dateRange": "custom",
            "startdt": "2020-01-01",
            "enddt": "2026-12-31",
            "forms": "10-K",
        })
        try:
            data = http_json(url)
        except Exception:
            return []
        hits = ((data.get("hits") or {}).get("hits") or [])[:3]
        rows = []
        for hit in hits:
            source = hit.get("_source") or {}
            text = " ".join(source.get("display_names") or []) + " " + str(source.get("file_description") or "")
            rows.append({
                "url": "https://www.sec.gov/Archives/edgar/data/" + str(source.get("ciks", [""])[0] if source.get("ciks") else ""),
                "date": (source.get("file_date") or "")[:10],
                "text": text,
                "name": "SEC EDGAR",
            })
        return rows
    if kind == "worldbank":
        return []
    if kind == "gdelt":
        return fetch_gdelt(query)
    if kind == "rss":
        return fetch_publisher_rss(query)
    if kind == "fred":
        fred = os.environ.get("FRED_API_KEY", "").strip()
        if not fred:
            return []
        url = "https://api.stlouisfed.org/fred/series/search?" + urllib.parse.urlencode({
            "search_text": query,
            "api_key": fred,
            "file_type": "json",
            "limit": 3,
        })
        data = http_json(url)
        return [{
            "url": "https://fred.stlouisfed.org/series/" + item.get("id", ""),
            "date": item.get("observation_end") or "",
            "text": (item.get("title") or "") + " " + (item.get("notes") or ""),
            "name": "FRED",
        } for item in data.get("seriess") or []]
    return []


def brand_media_row(brand, row):
    words = set(re.findall(r"[a-z0-9']+", ((row or {}).get("title") or "").lower()))
    if words & {"train", "trains", "metro", "transit", "station", "tracks", "commute"}:
        return False
    brand_bits = re.findall(r"[a-z0-9']+", (brand or "").lower())
    if brand_bits and not all(bit in words for bit in brand_bits):
        return False
    return bool(words & {"logo", "store", "stores", "restaurant", "sandwich", "menu", "product", "footlong", "shop", "shops", "sign"})


def gather_media(query, transport):
    rows = transport({"kind": "media", "q": query}) or []
    kept = []
    for row in rows:
        if not brand_media_row(query, row):
            continue
        license_name = (row.get("license") or "").strip()
        attribution = (row.get("attribution") or "").strip()
        url = (row.get("url") or "").strip()
        if license_name and attribution and url:
            kept.append({
                "title": row.get("title") or "Free image",
                "url": url,
                "kind": row.get("kind") or "image",
                "license": license_name,
                "attribution": attribution,
            })
    return kept


def live_media(request):
    query = request.get("q") or ""
    rows = []
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query",
        "list": "search",
        "srsearch": (query or "").strip() + " restaurant",
        "srnamespace": 6,
        "srlimit": 20,
        "format": "json",
    })
    try:
        data = http_json(url)
    except Exception:
        data = {}
    for item in (data.get("query") or {}).get("search") or []:
        title = item.get("title") or ""
        rows.append({
            "title": title,
            "url": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
            "kind": "image",
            "license": "See the Commons file page",
            "attribution": title + ", via Wikimedia Commons",
        })
    pexels = os.environ.get("PEXELS_API_KEY", "").strip()
    if pexels:
        media_url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode({"query": query, "per_page": 3})
        try:
            data = http_json(media_url, {"Authorization": pexels})
        except Exception:
            data = {}
        for photo in data.get("photos") or []:
            photographer = photo.get("photographer") or "Pexels photographer"
            rows.append({
                "title": photo.get("alt") or "Pexels photo",
                "url": photo.get("url") or "",
                "kind": "image",
                "license": "Pexels license",
                "attribution": photographer + " on Pexels",
            })
    return rows
