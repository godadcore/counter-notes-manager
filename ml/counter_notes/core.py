"""Pure research rules. Numbers come only from retrieved text."""

import os
import re
from collections import Counter
from datetime import datetime, timezone

PRIMARY_KINDS = {"sec", "fred", "worldbank", "official"}
DISAMBIGUATION_QID = "Q4167410"
BUSINESS_QIDS = {
    "Q4830453",
    "Q431289",
    "Q783794",
    "Q167037",
    "Q891723",
    "Q1589009",
    "Q161726",
    "Q6881511",
    "Q185092",
    "Q1431960",
    "Q507619",
    "Q11633",
}
REJECT_QIDS = {
    "Q515",
    "Q1549591",
    "Q486972",
    "Q532",
    "Q3957",
    "Q1637706",
    "Q214339",
    "Q1410668",
    "Q928830",
    "Q55488",
    "Q728937",
    "Q22667",
}
MIRROR_HOSTS = ("wikipedia.org", "wikimedia.org", "wikiwand.com", "dbpedia.org", "wikidata.org")
PLAN_POSTS = (
    (3, 1), (5, 2), (7, 3), (9, 4), (11, 5), (13, 6), (14, 7),
    (16, 8), (18, 9), (20, 10), (21, 11), (22, 12), (24, 13),
    (25, 14), (27, 15), (28, 16), (30, 17),
)
CLAIM_GROUPS = (
    ("stores", ("store", "stores", "location", "locations", "outlet", "outlets", "restaurant", "restaurants", "shop", "shops")),
    ("employees", ("employee", "employees", "worker", "workers", "staff", "workforce")),
    ("price", ("price", "priced", "cost", "footlong", "footlongs", "fee", "fare", "dollar", "dollars")),
    ("debt", ("debt", "loan", "bankrupt", "bankruptcy")),
    ("years", ("year", "years", "founded", "opened")),
)
DAILY_LIMIT = 10000
RESERVE = 200
SEARCH_COST = 100
VIDEO_COST = 1
OUTLIER_RATIO = 2
MIN_NICHE_VIDEOS = 15
SMALL_SAMPLE = MIN_NICHE_VIDEOS
SHORT_MAX_SECONDS = 180
STRONG_TITLE_WORDS = {
    "closing", "closed", "collapse", "collapsed", "collapsing",
    "decline", "declined", "declining", "dying", "failed", "failing",
    "bankruptcy", "bankrupt", "shutdown", "shutdowns",
    "store", "stores", "franchise", "franchises",
}
CLAIM_GENERIC = {
    "near", "about", "around", "roughly", "count", "number", "total", "price", "priced", "cost",
    "still", "have", "from", "that", "this", "with", "after", "before", "their", "there",
    "than", "into", "over", "under", "more", "less", "peak", "chain", "claim", "economics",
}
FEATURE_NAMES = ["title_length", "number_in_title", "brand_name", "question", "duration", "age"]
NUMBER_RE = re.compile(r"\$?\d[\d,]*(?:\.\d+)?%?")
YEAR_RE = re.compile(r"\b(?:18|19|20)\d{2}\b")
GDELT_GAP_SECONDS = 6
GDELT_BACKOFF_SECONDS = 30


class QuotaStopped(Exception):
    def __init__(self, used, cost, limit, reserve):
        self.used = used
        self.cost = cost
        self.limit = limit
        self.reserve = reserve
        super().__init__(
            "Stopped before the daily limit. Used "
            + str(used)
            + ", next call "
            + str(cost)
            + ", limit "
            + str(limit)
            + ", reserve "
            + str(reserve)
            + "."
        )


class Quota:
    def __init__(self, used=0, limit=DAILY_LIMIT, reserve=RESERVE):
        self.used = int(used or 0)
        self.limit = int(limit)
        self.reserve = int(reserve)

    def allow(self, cost):
        return self.used + int(cost) <= self.limit - self.reserve

    def spend(self, cost):
        cost = int(cost)
        if not self.allow(cost):
            raise QuotaStopped(self.used, cost, self.limit, self.reserve)
        self.used += cost
        return self.used


BUSINESS_NEWS_WORDS = (
    "franchise", "franchises", "store", "stores", "sandwich", "sandwiches",
    "restaurant", "restaurants", "ceo", "sales", "closing", "closes",
)
TRANSIT_NEWS_WORDS = ("train", "trains", "metro", "transit")


def business_news_story(brand, title, text):
    """The brand sits near a business word, and the story is not about trains or transit."""
    raw = re.sub(r"<[^>]+>", " ", (title or "") + " " + (text or ""))
    words = re.findall(r"[a-z0-9']+", raw.lower())
    if any(word in TRANSIT_NEWS_WORDS for word in words):
        return False
    needle = re.findall(r"[a-z0-9']+", (brand or "").lower())
    if not needle:
        return False
    business = set(BUSINESS_NEWS_WORDS)
    for index in range(len(words) - len(needle) + 1):
        if words[index:index + len(needle)] != needle:
            continue
        window = words[max(0, index - 12): index + len(needle) + 12]
        if any(word in business for word in window):
            return True
    return False


def median(values):
    nums = sorted(float(value) for value in values if value is not None)
    if not nums:
        return None
    mid = len(nums) // 2
    if len(nums) % 2:
        return nums[mid]
    return (nums[mid - 1] + nums[mid]) / 2


def is_short(video):
    """A video shorter than 3 minutes. A missing length is not treated as a short."""
    raw = (video or {}).get("duration_seconds")
    if raw is None or raw == "":
        return False
    try:
        seconds = int(raw)
    except (TypeError, ValueError):
        return False
    return seconds < SHORT_MAX_SECONDS


def outlier_score(views, channel_views):
    """Views divided by the median of the channel's non-short videos. Needs 15."""
    sample = []
    for value in channel_views or []:
        if value is None:
            continue
        number = float(value)
        if number > 0:
            sample.append(number)
    if len(sample) < MIN_NICHE_VIDEOS or views is None:
        return None
    middle = median(sample)
    views_number = float(views)
    if middle is None or middle <= 0 or views_number < 0:
        return None
    return views_number / middle


def views_multiple_label(score):
    if score is None:
        return ""
    return format(float(score), ".1f") + "x the channel's normal views"


def format_views(value):
    try:
        return format(int(value or 0), ",")
    except (TypeError, ValueError):
        return str(value or 0)


def winner_line(item):
    link = item.get("url") or ""
    words = item.get("matched_words") or []
    return (
        "- "
        + (item.get("multiple") or views_multiple_label(item.get("score")))
        + " | "
        + format_views(item.get("views"))
        + " views | sample "
        + str(item.get("sample") or 0)
        + " | "
        + (item.get("channel") or "")
        + " | "
        + (item.get("title") or "")
        + (" | " + link if link else "")
        + (" | words: " + ", ".join(words) if words else "")
    )


def title_strong_words(title):
    """Strong words in the title. Description text is ignored. Weak words are not included."""
    lowered = (title or "").lower()
    found = []
    if re.search(r"\bwhat happened\b", lowered):
        found.append("what happened")
    for token in re.findall(r"[a-z0-9']+", lowered):
        if token in STRONG_TITLE_WORDS and token not in found:
            found.append(token)
    return found


def niche_match_words(video):
    """The top 10 only count a strong word in the title."""
    return title_strong_words((video or {}).get("title") or "")


def niche_video(video):
    return bool(niche_match_words(video))


WINNER_COUNT = 10
WINNER_PER_CHANNEL = 3
MIN_LIST_VIEWS = 50000


def _score_row(video, names, sample_views):
    channel = video.get("channel_id") or ""
    views = sample_views.get(channel) or []
    score = outlier_score(video.get("views"), views)
    if score is None:
        return None
    video_id = video.get("video_id") or ""
    return {
        "score": score,
        "multiple": views_multiple_label(score),
        "sample": len(views),
        "title": video.get("title") or "",
        "channel": names.get(channel) or channel,
        "channel_id": channel,
        "views": video.get("views") or 0,
        "video_id": video_id,
        "url": ("https://www.youtube.com/watch?v=" + video_id) if video_id else "",
        "duration_seconds": video.get("duration_seconds"),
        "published_at": video.get("published_at") or "",
        "comments": list(video.get("comments") or []),
        "matched_words": niche_match_words(video),
    }


def _view_count(video):
    try:
        return int((video or {}).get("views") or 0)
    except (TypeError, ValueError):
        return 0


def _is_ignored(video, ignored):
    video_id = (video or {}).get("video_id") or ""
    return bool(video_id) and video_id in (ignored or set())


def _remember_small(bucket, seen, row):
    key = row.get("video_id") or row.get("url") or row.get("title")
    if key in seen:
        return
    seen.add(key)
    bucket.append(row)


def winner_public(item):
    """The fields the Today rows need."""
    return {
        "videoId": item.get("video_id") or "",
        "title": item.get("title") or "",
        "channel": item.get("channel") or "",
        "views": _view_count(item),
        "sample": int(item.get("sample") or 0),
        "multiple": item.get("multiple") or "",
        "url": item.get("url") or "",
        "words": list(item.get("matched_words") or []),
    }


def list_notes(lookalikes):
    """Top 10, same-topic winners, and the videos under 50,000 views."""
    lines = ["Top big winners:"]
    outliers = (lookalikes or {}).get("outliers") or []
    if outliers:
        for item in outliers[:WINNER_COUNT]:
            lines.append(winner_line(item))
    else:
        lines.append("- None yet.")
    lines.append("Title patterns:")
    for line in title_pattern_lines(outliers):
        lines.append("- " + line)
    lines.append("Same-topic winners:")
    winners = (lookalikes or {}).get("same_topic_winners") or []
    if winners:
        for item in winners:
            lines.append(winner_line(item))
    else:
        lines.append("- None yet.")
    lines.append("Too small to count:")
    small = (lookalikes or {}).get("too_small") or []
    if small:
        for item in small:
            lines.append(winner_line(item))
    else:
        lines.append("- None.")
    return "\n".join(lines)


def _cap_winners(items):
    mixed = []
    per_channel = {}
    for item in items:
        channel = item.get("channel_id") or ""
        if per_channel.get(channel, 0) >= WINNER_PER_CHANNEL:
            continue
        mixed.append(item)
        per_channel[channel] = per_channel.get(channel, 0) + 1
        if len(mixed) == WINNER_COUNT:
            break
    return mixed


def score_lookalikes(videos, brand="", ignored=None):
    """Rank by views divided by the median of every non-short video on the channel."""
    skipped = set(ignored or [])
    shorts = 0
    longs = []
    for video in videos or []:
        if is_short(video):
            shorts += 1
        else:
            longs.append(video)
    names = {}
    pulled_counts = {}
    sample_views = {}
    for video in videos or []:
        channel = video.get("channel_id") or ""
        names[channel] = video.get("channel_title") or names.get(channel) or channel or "Channel"
        pulled_counts[channel] = pulled_counts.get(channel, 0) + 1
    for video in longs:
        channel = video.get("channel_id") or ""
        sample_views.setdefault(channel, []).append(video.get("views") or 0)
        if video.get("channel_title"):
            names[channel] = video.get("channel_title")
    removed = []
    channels = []
    for channel, name in names.items():
        count = len(sample_views.get(channel) or [])
        if count < MIN_NICHE_VIDEOS:
            removed.append({
                "name": name or "Channel",
                "channel_id": channel,
                "pulled": pulled_counts.get(channel, 0),
                "niche_videos": count,
                "reason": "Fewer than 15 videos that are at least 3 minutes.",
            })
        else:
            channels.append({
                "name": name or "Channel",
                "channel_id": channel,
                "pulled": pulled_counts.get(channel, 0),
                "videos": count,
                "sample": count,
            })
    scored = []
    too_small = []
    small_seen = set()
    kept = 0
    dropped = 0
    for video in longs:
        words = niche_match_words(video)
        if not words:
            dropped += 1
            continue
        row = _score_row(video, names, sample_views)
        if row is None:
            dropped += 1
            continue
        kept += 1
        if _is_ignored(video, skipped):
            continue
        scored.append(row)
    scored.sort(key=lambda item: item["score"], reverse=True)
    brand_winners = []
    needle = (brand or "").strip()
    if needle:
        brand_pattern = re.compile(r"\b" + re.escape(needle) + r"\b", re.I)
        for video in longs:
            title = video.get("title") or ""
            if not brand_pattern.search(title):
                continue
            if _is_ignored(video, skipped):
                continue
            row = _score_row(video, names, sample_views)
            if row is not None:
                brand_winners.append(row)
        brand_winners.sort(key=lambda item: item["score"], reverse=True)
    for item in _cap_winners(scored):
        if _view_count(item) < MIN_LIST_VIEWS:
            _remember_small(too_small, small_seen, item)
    for item in brand_winners:
        if _view_count(item) < MIN_LIST_VIEWS:
            _remember_small(too_small, small_seen, item)
    too_small.sort(key=lambda item: _view_count(item), reverse=True)
    brand_winners = [item for item in brand_winners if _view_count(item) >= MIN_LIST_VIEWS]
    scored = _cap_winners([item for item in scored if _view_count(item) >= MIN_LIST_VIEWS])
    removed.sort(key=lambda item: item["name"].lower())
    pulls = []
    for channel, name in names.items():
        pulls.append({
            "name": name or "Channel",
            "channel_id": channel,
            "pulled": pulled_counts.get(channel, 0),
            "niche_videos": len(sample_views.get(channel) or []),
        })
    pulls.sort(key=lambda item: item["name"].lower())
    return {
        "dropped_videos": dropped,
        "kept_videos": kept,
        "short_videos": shorts,
        "channels": channels,
        "removed_channels": removed,
        "pulls": pulls,
        "outliers": scored[:WINNER_COUNT],
        "same_topic_winners": brand_winners,
        "too_small": too_small,
    }


ASK_CUES = ("do a video on", "you should cover", "can you do", "what about", "next video")
COMPLAINT_CUES = ("too long", "clickbait", "misleading", "inaccurate", "disappointed", "boring", "the number is wrong", "too many ads", "this is wrong", "hate this", "sponsored")
TITLE_PATTERNS = (
    ("the decline of", "the decline of"),
    ("rise and fall", "rise and fall"),
    ("what happened", "what happened"),
    ("why ", "why"),
    ("how ", "how"),
    (" vs", "versus"),
)
COMMENT_THEMES = (
    ("price went up", re.compile(r"\bprices?\s+went\s+up\b", re.I)),
    ("$5 footlong", re.compile(r"(?:\$\s*5|\b5\s+dollar)\s+foot\s*longs?\b", re.I)),
    ("portion size", re.compile(r"\bportions?\s+sizes?\b", re.I)),
    ("royalty or fees", re.compile(r"\b(?:royalt(?:y|ies)|fees?)\b", re.I)),
    ("owner profit", re.compile(r"\bowner(?:'s|s)?\s+profits?\b", re.I)),
)


def _title_pattern_hit(lowered, needle, label):
    if label == "how":
        return re.search(r"\bhow\b", lowered or "") is not None
    return needle in (lowered or "")


def _complete_sentence(text, cues):
    raw = " ".join((text or "").split())
    if not raw or not any(cue in raw.lower() for cue in cues):
        return ""
    parts = re.split(r"(?<=[.!?])\s+", raw)
    for part in parts:
        if not any(cue in part.lower() for cue in cues):
            continue
        sentence = part.strip()
        if sentence and sentence[-1] in ".!?":
            return sentence
    return ""


def comment_text(item):
    if isinstance(item, dict):
        return item.get("text") or ""
    return str(item or "")


def comment_likes(item):
    if isinstance(item, dict):
        try:
            return int(item.get("likes") or 0)
        except (TypeError, ValueError):
            return 0
    return 0


def same_topic_videos(videos, brand):
    needle = (brand or "").strip().lower()
    if not needle:
        return []
    pattern = re.compile(r"\b" + re.escape(needle) + r"\b", re.I)
    found = []
    for video in videos or []:
        title = video.get("title") or ""
        if not pattern.search(title):
            continue
        video_id = video.get("video_id") or ""
        found.append({
            "title": title,
            "views": video.get("views") or 0,
            "published_at": video.get("published_at") or "",
            "url": ("https://www.youtube.com/watch?v=" + video_id) if video_id else "",
            "video_id": video_id,
            "channel": video.get("channel_title") or "",
            "comments": list(video.get("comments") or []),
        })
    found.sort(key=lambda item: item.get("views") or 0, reverse=True)
    return found


PUBLICATION_NAMES = {
    "franchise", "magazine", "times", "news", "journal", "post", "wire", "business",
    "dive", "review", "gazette", "herald", "tribune", "cheapism",
}
MASHED_CUES = ("ispot", "get the report", "open navigation", "login to", "see the ads")
STORE_WORDS = {"stores", "store", "locations", "location", "restaurants", "restaurant", "outlets"}
CLOSURE_WORDS = ("closed", "closing", "closures", "closure", "shuttered", "shutter", "shut down", "shutting")
TOTAL_WORDS = ("has", "have", "had", "operates", "operating", "total", "worldwide", "over", "about", "reached", "peaked", "peak")


def _store_count_label(sentence, number):
    lowered = sentence.lower()
    pos = lowered.find(str(number).lower())

    def nearest(words):
        best = None
        for word in words:
            start = 0
            while True:
                at = lowered.find(word, start)
                if at < 0:
                    break
                dist = abs(at - pos) if pos >= 0 else at
                if best is None or dist < best:
                    best = dist
                start = at + len(word)
        return best

    closure = nearest(CLOSURE_WORDS)
    total = nearest(TOTAL_WORDS)
    if closure is None and total is None:
        return ""
    if closure is not None and (total is None or closure <= total):
        return "CLOSURES"
    return "TOTAL STORES"


def store_count_candidates(snippets, limit=3, brand=""):
    """Sentences with a store number and a year. Nothing here is confirmed."""
    found = []
    seen = set()
    brand_pattern = re.compile(r"\b" + re.escape(brand.strip()) + r"\b", re.I) if (brand or "").strip() else None
    for snip in snippets or []:
        kind = str(snip.get("kind") or "").lower()
        if kind not in ("rss", "reference", "news"):
            continue
        text = snip.get("text") or ""
        for sentence in re.split(r"(?<=[.!?])\s+|\n+", text):
            sentence_text = " ".join(sentence.split())
            if not sentence_text or len(sentence_text) > 280:
                continue
            lowered = sentence_text.lower()
            if any(cue in lowered for cue in MASHED_CUES):
                continue
            if brand_pattern and not brand_pattern.search(sentence_text):
                continue
            year_match = re.search(r"\b((?:19|20)\d{2})\b", sentence_text)
            if not year_match:
                continue
            tokens = re.findall(r"[A-Za-z0-9,]+", sentence_text)
            number = ""
            for index, token in enumerate(tokens):
                bare = token.replace(",", "")
                if re.fullmatch(r"(19|20)\d{2}", bare):
                    continue
                if not re.fullmatch(r"\d{1,3}(?:,\d{3})+|\d{3,}", token):
                    continue
                nxt = tokens[index + 1] if index + 1 < len(tokens) else ""
                if nxt[:1].isupper() and nxt.lower() in PUBLICATION_NAMES:
                    continue
                window = [part.lower() for part in tokens[max(0, index - 6):index + 7]]
                if any(part in STORE_WORDS for part in window):
                    number = token
                    break
            if not number:
                continue
            label = _store_count_label(sentence_text, number)
            if not label:
                continue
            key = (number, year_match.group(1), label)
            if key in seen:
                continue
            seen.add(key)
            found.append({
                "number": number,
                "year": year_match.group(1),
                "sentence": sentence_text,
                "url": snip.get("url") or "",
                "label": label,
            })
            if len(found) >= limit:
                return found
    return found


def _comment_rows(videos):
    rows = []
    for video in videos or []:
        title = video.get("title") or "Untitled"
        for item in video.get("comments") or []:
            text = " ".join(comment_text(item).split())
            if text:
                rows.append({"text": text, "likes": comment_likes(item), "video": title})
    return rows


def _with_video(row, text=None):
    return (text if text is not None else row["text"]) + " — " + row["video"]


def comment_report(videos):
    rows = _comment_rows(videos)
    read = len(rows)
    asks = []
    for row in rows:
        sentence = _complete_sentence(row["text"], ASK_CUES)
        if not sentence:
            continue
        line = _with_video(row, sentence)
        if line not in asks:
            asks.append(line)
        if len(asks) == 5:
            break
    questions = sorted((row for row in rows if "?" in row["text"]), key=lambda item: item["likes"], reverse=True)[:5]
    liked = sorted(rows, key=lambda item: item["likes"], reverse=True)[:5]
    buckets = Counter()
    examples = {}
    for row in rows:
        lowered = row["text"].lower()
        if "?" not in row["text"] and not any(cue in lowered for cue in COMPLAINT_CUES):
            continue
        key = " ".join(re.findall(r"[a-z']+", lowered)[:8])
        if not key:
            continue
        buckets[key] += 1
        examples.setdefault(key, _with_video(row))
    lines = ["Read " + str(read) + " comments."]
    if asks:
        lines.append("Viewers ask: " + " | ".join(asks))
    else:
        lines.append("Viewers ask: none found. Read " + str(read) + " comments.")
        if questions:
            lines.append("Questions viewers liked: " + " | ".join(_with_video(row) for row in questions))
        else:
            lines.append("Questions viewers liked: none found. Read " + str(read) + " comments.")
    if rows:
        top = max(rows, key=lambda item: item["likes"])
        sentence = re.split(r"(?<=[.!?])\s+", top["text"])[0]
        lines.append("Viewers care most about: " + sentence + " — " + top["video"])
    else:
        lines.append("Viewers care most about: nothing stood out. Read " + str(read) + " comments.")
    if liked:
        lines.append("Most liked: " + " | ".join(_with_video(item) for item in liked))
    else:
        lines.append("Most liked: none found. Read " + str(read) + " comments.")
    common = buckets.most_common(3)
    if common:
        lines.append("Common complaints or questions: " + " | ".join(examples[key] for key, _count in common))
    else:
        lines.append("Common complaints or questions: none found. Read " + str(read) + " comments.")
    return lines


def comment_themes(videos):
    """Count same-topic comments that contain each phrase, with two real comments."""
    rows = _comment_rows(videos)
    lines = ["Read " + str(len(rows)) + " same-topic comments."]
    for label, pattern in COMMENT_THEMES:
        hits = [row for row in rows if pattern.search(row["text"])]
        lines.append(label + ": " + str(len(hits)) + " of " + str(len(rows)))
        if hits:
            for row in hits[:2]:
                lines.append("  " + row["text"] + " — " + row["video"])
        else:
            lines.append("  none")
    lines.append("Comments are opinions. They are not proof.")
    return lines


def title_pattern_lines(videos):
    """Plain-language patterns, length, and publish gap for the top videos."""
    rows = list(videos or [])[:WINNER_COUNT]
    if not rows:
        return ["No top videos to describe."]
    patterns = Counter()
    for item in rows:
        lowered = (item.get("title") or "").lower()
        hit = False
        for needle, label in TITLE_PATTERNS:
            if _title_pattern_hit(lowered, needle, label):
                patterns[label] += 1
                hit = True
        if not hit:
            patterns["other wording"] += 1
    bits = [label + " (" + str(count) + " of " + str(len(rows)) + ")" for label, count in patterns.most_common() if count]
    lines = ["Most common title patterns: " + ", ".join(bits) + "."]
    lengths = []
    for item in rows:
        try:
            seconds = int(item.get("duration_seconds") or 0)
        except (TypeError, ValueError):
            seconds = 0
        if seconds > 0:
            lengths.append(seconds)
    if lengths:
        ordered = sorted(lengths)
        typical = ordered[len(ordered) // 2]
        lines.append(
            "Length: the typical video is "
            + str(typical)
            + " seconds. The shortest is "
            + str(ordered[0])
            + " seconds and the longest is "
            + str(ordered[-1])
            + " seconds."
        )
    else:
        lines.append("Length: no length was stored for these videos.")
    dates = []
    for item in rows:
        raw = item.get("published_at") or ""
        try:
            dates.append(datetime.fromisoformat(str(raw).replace("Z", "+00:00")))
        except ValueError:
            continue
    if len(dates) >= 2:
        dates.sort()
        span = (dates[-1] - dates[0]).days
        gaps = [(dates[index + 1] - dates[index]).days for index in range(len(dates) - 1)]
        gaps.sort()
        typical_gap = gaps[len(gaps) // 2]
        lines.append(
            "Publish gap: these videos span "
            + str(span)
            + " days. The typical gap between one and the next is "
            + str(typical_gap)
            + " days."
        )
    else:
        lines.append("Publish gap: not enough dates to measure.")
    return lines


def _comment_bucket(text):
    if _complete_sentence(text, ASK_CUES):
        return "ask"
    if _complete_sentence(text, COMPLAINT_CUES):
        return "complain"
    return ""


def why_they_win(videos):
    rows = list(videos or [])[:10]
    if not rows:
        return ["No niche video had 15 others from the same channel, so there is no winner list yet."]
    starters = Counter()
    patterns = Counter()
    for item in rows:
        title = item.get("title") or ""
        words = re.findall(r"[A-Za-z0-9']+", title)
        if words:
            starters[words[0].lower()] += 1
        lowered = title.lower()
        for needle, label in TITLE_PATTERNS:
            if _title_pattern_hit(lowered, needle, label):
                patterns[label] += 1
    lines = []
    common = starters.most_common(3)
    if common:
        bits = [word + " (" + str(count) + " of " + str(len(rows)) + ")" for word, count in common]
        lines.append("Most common title starts: " + ", ".join(bits) + ".")
    if patterns:
        bits = [label + " (" + str(count) + " of " + str(len(rows)) + ")" for label, count in patterns.most_common(3)]
        lines.append("Title patterns in the top videos: " + ", ".join(bits) + ".")
    asks = []
    complaints = []
    comment_total = 0
    for item in rows:
        comments = item.get("comments") or []
        comment_total += len(comments)
        for item in comments:
            text = comment_text(item)
            if _complete_sentence(text, ASK_CUES) and len(asks) < 5:
                asks.append(_complete_sentence(text, ASK_CUES))
            elif _complete_sentence(text, COMPLAINT_CUES) and len(complaints) < 5:
                complaints.append(_complete_sentence(text, COMPLAINT_CUES))
    if comment_total == 0:
        lines.append("No comments were read for these videos.")
    else:
        lines.append("Read " + str(comment_total) + " comments across the top videos.")
    if asks:
        lines.append("Viewers ask: " + " | ".join(asks))
    else:
        lines.append("Viewers ask: none found.")
    if complaints:
        lines.append("Viewers complain: " + " | ".join(complaints) + ".")
    else:
        lines.append("No complaint stood out in the comments that were read.")
    return lines


def number_forms(number):
    raw = str(number or "").strip()
    forms = set()
    if not raw:
        return forms
    forms.add(raw)
    if "$" in raw or "%" in raw:
        forms.add(raw.replace(",", ""))
        return forms
    bare = raw.replace(",", "").strip()
    if bare:
        forms.add(bare)
    return forms


def number_in_text(number, text):
    if not text:
        return False
    for form in number_forms(number):
        pattern = r"(?<![\d.])" + re.escape(form) + r"(?![\d]|\.\d)"
        if re.search(pattern, text):
            return True
    return False


def next_post_ids(days, limit=4):
    done = {str(key) for key, value in (days or {}).items() if value}
    ids = []
    for day, post_id in PLAN_POSTS:
        if str(day) in done:
            continue
        if post_id not in ids:
            ids.append(post_id)
        if len(ids) >= limit:
            break
    return ids


def is_production_metadata(label):
    text = str(label or "").strip().lower()
    return text.startswith(("length:", "runtime:", "words:", "word target:", "word count:", "target words:", "max clip"))


def _claim_window(label, number):
    words = re.findall(r"\S+", str(label or ""))
    if not words:
        return ""
    indexes = [index for index, word in enumerate(words) if number_in_text(number, word.strip(".,;:()[]\"'"))]
    if not indexes:
        return " ".join(words)
    spans = []
    for index in indexes:
        spans.extend(words[max(0, index - 5): index + 6])
    return " ".join(spans)


def claim_keywords(label, number=""):
    words = re.findall(r"\S+", str(label or ""))
    cleaned = [word.strip(".,;:()[]\"'").lower() for word in words]
    centers = [index for index, word in enumerate(words) if number_in_text(number, word.strip(".,;:()[]\"'"))]
    center = centers[0] if centers else None
    best_group = None
    best_distance = 99
    for _name, group in CLAIM_GROUPS:
        for index, token in enumerate(cleaned):
            if token not in group:
                continue
            distance = abs(index - center) if center is not None else 0
            if distance < best_distance:
                best_distance = distance
                best_group = group
    if best_group is not None and best_distance <= 6:
        return list(best_group)
    stop = {"near", "the", "and", "for", "with", "from", "that", "this", "after", "about", "claim", "summary", "angle"}
    tokens = []
    for index, token in enumerate(cleaned):
        if center is not None and abs(index - center) > 6:
            continue
        if len(token) > 3 and token not in stop and not number_in_text(number, token):
            tokens.append(token)
    return list(dict.fromkeys(tokens))


def _keyword_in(window, keywords):
    return any(re.search(r"\b" + re.escape(keyword) + r"\b", window) for keyword in keywords)


def matching_sentence(number, text, keywords, radius=12, claim=""):
    if not text or not keywords:
        return ""
    raw = str(number or "")
    bare = raw.replace("$", "").replace("%", "").replace(",", "") if "$" in raw else ""
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    chunks = parts if len(parts) > 1 else [text]
    found = []
    for part in chunks:
        if part.strip().startswith("="):
            continue
        words = re.findall(r"\S+", part)
        for index, word in enumerate(words):
            token = word.strip(".,;:()[]\"'")
            direct = number_in_text(number, token)
            spelled = bare and number_in_text(bare, token)
            if spelled and not direct:
                side = " ".join(words[max(0, index - 2): index + 3]).lower()
                if not re.search(r"\bdollars?\b", side):
                    continue
            elif not direct:
                continue
            window_words = words[max(0, index - radius): index + radius + 1]
            window = " ".join(window_words)
            if window.count("=") > 2:
                continue
            years = YEAR_RE.findall(window)
            if not years or not _keyword_in(window.lower(), keywords):
                continue
            sentence = part.strip()
            if len(sentence) > 320:
                sentence = " ".join(window_words)
            if not YEAR_RE.search(sentence):
                continue
            if claim and not claim_matches_sentence(claim, sentence, number):
                continue
            found.append((0 if direct else 1, sentence))
    if not found:
        return ""
    found.sort(key=lambda item: item[0])
    return found[0][1]


def year_in(text):
    years = YEAR_RE.findall(text or "")
    return years[0] if years else ""


def _plain_token(word):
    return word.strip(".,;:()[]\"'")


def year_near(number, text, radius=12):
    """The year closest to the figure, not the first year in the sentence."""
    words = re.findall(r"\S+", text or "")
    centers = [index for index, word in enumerate(words) if number_in_text(number, _plain_token(word))]
    if not centers:
        return ""
    center = centers[0]
    best = ""
    best_dist = radius + 1
    for index, word in enumerate(words):
        token = _plain_token(word)
        if not YEAR_RE.fullmatch(token):
            continue
        dist = abs(index - center)
        if dist and dist < best_dist:
            best_dist = dist
            best = token
    return best


def _claim_noun(window):
    if any(word in window for word in ("footlong", "footlongs", "dollar", "dollars")):
        return "footlong"
    if any(word in window for word in ("store", "stores", "location", "locations", "outlet", "outlets", "restaurant", "restaurants")):
        return "stores"
    return ""


def claim_phrase(number, label, sentence):
    year = year_near(number, sentence)
    if not year:
        return ""
    sentence_window = (sentence or "").lower()
    noun = _claim_noun(sentence_window) or _claim_noun((label or "").lower()) or "figure"
    peak = " at the peak" if "peak" in sentence_window else ""
    return "about " + str(number) + " " + noun + peak + " in " + year


def historical_figures(snippets, limit=6):
    store_words = {"peak", "store", "stores", "location", "locations", "restaurant", "restaurants", "outlet", "outlets"}
    skip_words = {
        "percent", "percentage", "country", "countries", "city", "cities", "billion", "million",
        "people", "employee", "employees", "traffic", "chapter",
        "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    }
    found = []
    seen = set()
    for item in snippets or []:
        if item.get("kind") not in {"wikipedia", "reference", "official"}:
            continue
        parts = re.split(r"(?<=[.!?])\s+|\n+", item.get("text") or "")
        for part in parts:
            words = re.findall(r"\S+", part)
            for index, word in enumerate(words):
                token = _plain_token(word)
                if not NUMBER_RE.fullmatch(token) or YEAR_RE.fullmatch(token.replace(",", "")):
                    continue
                nearest = ""
                nearest_rank = (3, 1)
                for offset in range(-2, 3):
                    if not offset:
                        continue
                    slot = index + offset
                    if slot < 0 or slot >= len(words):
                        continue
                    piece = _plain_token(words[slot]).lower()
                    if piece not in store_words and piece not in skip_words:
                        continue
                    rank = (abs(offset), 0 if offset > 0 else 1)
                    if rank < nearest_rank:
                        nearest_rank = rank
                        nearest = "store" if piece in store_words else "skip"
                if nearest != "store":
                    continue
                nxt = _plain_token(words[index + 1]).lower() if index + 1 < len(words) else ""
                if nxt == "more":
                    continue
                year = year_near(token, part)
                if not year:
                    continue
                key = (token, year)
                if key in seen:
                    continue
                seen.add(key)
                found.append({
                    "number": token,
                    "year": year,
                    "sentence": part.strip()[:320],
                    "url": item.get("url") or "",
                    "name": item.get("name") or "",
                })
                if len(found) >= limit:
                    return found
    return found


def gdelt_pause(last_at, now, minimum=GDELT_GAP_SECONDS):
    if not last_at:
        return 0
    return max(0, minimum - (float(now) - float(last_at)))


def gdelt_retry(attempts):
    """A 429 is skipped. Research keeps going. There is no retry loop."""
    return "skip"


def publisher_key(item):
    domain = (item.get("domain") or domain_of(item.get("url") or "")).lower()
    if domain.startswith("m."):
        domain = domain[2:]
    if any(host in domain for host in MIRROR_HOSTS):
        return "wikipedia-mirror"
    return domain


def texts_are_copies(left, right):
    a = re.sub(r"\s+", " ", str(left or "").lower()).strip()
    b = re.sub(r"\s+", " ", str(right or "").lower()).strip()
    if len(a) < 40 or len(b) < 40:
        return False
    if a in b or b in a:
        return True
    a_set = set(a.split())
    b_set = set(b.split())
    if not a_set or not b_set:
        return False
    return len(a_set & b_set) / min(len(a_set), len(b_set)) >= 0.85


def independent_sources(hits):
    kept = []
    for item in hits or []:
        key = publisher_key(item)
        if not key:
            continue
        if any(publisher_key(other) == key for other in kept):
            continue
        if any(texts_are_copies(item.get("sentence") or item.get("text"), other.get("sentence") or other.get("text")) for other in kept):
            continue
        kept.append(item)
    return kept


def claim_words(claim, number=""):
    words = []
    for token in re.findall(r"[A-Za-z][A-Za-z0-9]*", claim or ""):
        low = token.lower()
        if len(low) < 4 or low in CLAIM_GENERIC or number_in_text(number, token):
            continue
        words.append(low)
    return list(dict.fromkeys(words))


def _word_in(word, text):
    stem = word[:-1] if word.endswith("s") and len(word) > 4 else word
    return re.search(r"\b" + re.escape(stem) + r"s?\b", text or "") is not None


def claim_matches_sentence(claim, sentence, number=""):
    words = claim_words(claim, number)
    text = (sentence or "").lower()
    if words:
        return all(_word_in(word, text) for word in words)
    generics = []
    for token in re.findall(r"[A-Za-z][A-Za-z0-9]*", claim or ""):
        low = token.lower()
        if low in CLAIM_GENERIC:
            generics.append(low)
    if not generics:
        return False
    return all(_word_in(word, text) for word in generics)


def verify_detail(number, snippets, claim=""):
    keywords = claim_keywords(claim, number)
    hits = []
    for item in snippets or []:
        sentence = matching_sentence(number, item.get("text") or "", keywords, claim=claim)
        if sentence and not claim_matches_sentence(claim, sentence, number):
            sentence = ""
        if sentence:
            hits.append({**item, "sentence": sentence})
    primary = [item for item in hits if item.get("kind") in PRIMARY_KINDS]
    if primary:
        return "Verified (primary)", primary
    unique = independent_sources(hits)
    if len(unique) >= 2:
        return "Verified (two independent sources)", unique
    if len(unique) == 1:
        return "Reported (one secondary source)", unique
    return "Needs check", []


def verify_number(number, snippets, claim=""):
    status, _matches = verify_detail(number, snippets, claim)
    return status


def choose_entity(brand, candidates):
    rejected = []
    accepted = []
    for item in candidates or []:
        reason = _entity_reject_reason(item)
        if reason:
            rejected.append({**item, "reason": reason})
        else:
            accepted.append(item)
    if not accepted:
        return {"chosen": None, "reason": "No business or brand matched " + (brand or "the name") + ".", "rejected": rejected}
    wanted = (brand or "").strip().lower()

    def rank(item):
        label = (item.get("label") or "").strip().lower()
        exact = 0 if label == wanted else 1
        described = (item.get("description") or "").lower()
        chain = 0 if "chain" in described or "restaurant" in described else 1
        return (exact, chain)

    accepted.sort(key=rank)
    chosen = accepted[0]
    bits = []
    if (chosen.get("label") or "").strip().lower() == wanted:
        bits.append("Exact label match for " + (chosen.get("label") or brand) + ".")
    else:
        bits.append("Closest business label is " + (chosen.get("label") or "unnamed") + ".")
    bits.append("Description: " + (chosen.get("description") or "a business or brand") + ".")
    if chosen.get("id"):
        bits.append("Wikidata " + chosen["id"] + ".")
    if chosen.get("ticker"):
        bits.append("Ticker " + chosen["ticker"] + ".")
    else:
        bits.append("No stock ticker on the entity.")
    return {"chosen": chosen, "reason": " ".join(bits), "rejected": rejected}


def _entity_reject_reason(item):
    instances = set(item.get("instance_of") or [])
    description = (item.get("description") or "").lower()
    if DISAMBIGUATION_QID in instances or "disambiguation" in description:
        return "Disambiguation page."
    if instances & REJECT_QIDS or any(word in description for word in ("rapid transit", "metro system", "subway system", "railway", "railroad", "city in", "town in", "village in")):
        return "Unrelated entity: city, transit system, or settlement."
    business = bool(instances & BUSINESS_QIDS) or any(word in description for word in ("restaurant chain", "fast food", "fast-food", "company", "brand", "business", "franchise", "retailer", "corporation", "privately held", "public company"))
    if not business:
        return "Not a business or brand."
    return ""


def sec_decision(entity):
    if entity and (str(entity.get("ticker") or "").strip() or entity.get("exchanges")):
        return "search"
    return "private company, no SEC filings"


def filter_news(items, brand, keywords):
    kept = []
    dropped = 0
    brand_name = (brand or "").strip().lower()
    keys = [word.strip().lower() for word in keywords or [] if str(word).strip()]
    for item in items or []:
        text = ((item.get("title") or "") + " " + (item.get("text") or "")).lower()
        language = str(item.get("language") or item.get("lang") or "").lower()
        english = (not language) or language.startswith("en")
        brand_ok = bool(brand_name) and brand_name in text
        topic_ok = (not keys) or any(key in text for key in keys)
        if english and brand_ok and topic_ok and business_news_story(brand_name, item.get("title") or "", item.get("text") or ""):
            kept.append(item)
        else:
            dropped += 1
    return kept, dropped


def parse_wikidata_entity(entity):
    claims = entity.get("claims") or {}

    def item_ids(prop):
        found = []
        for claim in claims.get(prop) or []:
            value = ((claim.get("mainsnak") or {}).get("datavalue") or {}).get("value")
            if isinstance(value, dict) and value.get("id"):
                found.append(value["id"])
        return found

    def strings(prop):
        found = []
        for claim in claims.get(prop) or []:
            value = ((claim.get("mainsnak") or {}).get("datavalue") or {}).get("value")
            if isinstance(value, str) and value.strip():
                found.append(value.strip())
        return found

    label = ((entity.get("labels") or {}).get("en") or {}).get("value") or ""
    description = ((entity.get("descriptions") or {}).get("en") or {}).get("value") or ""
    wiki = ((entity.get("sitelinks") or {}).get("enwiki") or {}).get("title") or ""
    tickers = strings("P249")
    sites = strings("P856")
    return {
        "id": entity.get("id") or "",
        "label": label,
        "description": description,
        "instance_of": item_ids("P31"),
        "ticker": tickers[0] if tickers else "",
        "exchanges": item_ids("P414"),
        "website": sites[0] if sites else "",
        "wikipedia": wiki,
    }


def domain_of(url):
    match = re.search(r"https?://([^/]+)", url or "", re.I)
    host = match.group(1).lower() if match else ""
    if host.startswith("www."):
        host = host[4:]
    return host


def parse_duration(value):
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not match:
        return None
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def features_of(video, brand="", today=None):
    title = video.get("title") or ""
    age = None
    published = video.get("published_at") or ""
    if published:
        try:
            stamp = datetime.fromisoformat(published.replace("Z", "+00:00"))
            now = today or datetime.now(timezone.utc)
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            age = max(0, (now - stamp).days)
        except ValueError:
            age = None
    return {
        "title_length": len(title.split()),
        "number_in_title": 1 if NUMBER_RE.search(title) else 0,
        "brand_name": 1 if brand and brand.lower() in title.lower() else 0,
        "question": 1 if "?" in title else 0,
        "duration": video.get("duration_seconds"),
        "age": age,
    }


def _sentence_has_number(number, sentence):
    if number_in_text(number, sentence):
        return True
    raw = str(number or "")
    if "$" not in raw:
        return False
    bare = raw.replace("$", "").replace(",", "")
    return bool(re.search(r"(?<![\d.])" + re.escape(bare) + r"(?![\d]|\.\d)\s+dollars?\b", sentence or "", re.I))


def _kept_status(row):
    number = row.get("number") or ""
    status = row.get("status") or "Needs check"
    matches = []
    for match in row.get("matches") or []:
        sentence = match.get("sentence") or match.get("snippet") or ""
        url = match.get("url") or ""
        if url and sentence and _sentence_has_number(number, sentence):
            matches.append(match)
    if not matches and row.get("snippet") and row.get("url") and _sentence_has_number(number, row.get("snippet") or ""):
        matches = [{
            "sentence": row.get("snippet") or "",
            "url": row.get("url") or "",
            "name": row.get("name") or "",
            "retrieved": row.get("retrieved") or row.get("date") or "",
        }]
    if status.startswith("Verified") and matches:
        if status == "Verified":
            status = "Verified (primary)"
        return status, matches
    if status.startswith("Reported") and matches:
        return "Reported (one secondary source)", matches
    return "Needs check", []


def _fact_lines(heading, items):
    lines = [heading + ":"]
    if not items:
        lines.append("- None yet.")
        return lines
    for item in items:
        lines.append("- " + (item.get("claim") or item["number"]) + " | " + item["status"])
        for match in item.get("matches") or []:
            lines.append("  " + (match.get("sentence") or ""))
            lines.append("  " + (match.get("url") or "") + " | retrieved " + (match.get("retrieved") or item.get("date") or ""))
    return lines


def compile_dossier(title, rows, patterns, media, sources=None, lookalikes=None, history=None):
    verified = []
    reported = []
    needs = []
    for row in rows or []:
        status, matches = _kept_status(row)
        item = {
            "number": row.get("number") or "",
            "status": status,
            "url": (matches[0].get("url") if matches else "") or "",
            "date": (matches[0].get("retrieved") if matches else "") or row.get("date") or "",
            "snippet": (matches[0].get("sentence") if matches else "") or "",
            "name": (matches[0].get("name") if matches else "") or "",
            "matches": matches,
            "claim": row.get("claim") or "",
            "year": row.get("year") or "",
        }
        if status.startswith("Verified"):
            verified.append(item)
        elif status.startswith("Reported"):
            reported.append(item)
        else:
            needs.append(item)
    if verified:
        hook = "Open on " + verified[0]["number"] + ". The linked page already shows that figure."
    else:
        hook = "Open on the receipt. No figure is verified yet."
    thumbs = [
        "Host on the left, three to five words, one chart, red accent. Match Thumbnail.png.",
        "Same host, same slate shirt, yellow price tag. No extra words.",
    ]
    lines = ["Topic: " + (title or "Untitled")]
    lines.extend(_fact_lines("Verified (primary)", [item for item in verified if "primary" in item["status"]]))
    lines.extend(_fact_lines("Verified (two independent sources)", [item for item in verified if "two independent" in item["status"]]))
    lines.extend(_fact_lines("Reported (one secondary source)", reported))
    lines.append("Needs check:")
    if needs:
        for item in needs:
            lines.append("- " + (item["number"] or "figure") + " still needs a check.")
    else:
        lines.append("- None.")
    lines.append("Historical figures:")
    if history:
        for item in history:
            lines.append("- " + item.get("number", "") + " in " + item.get("year", "") + " | " + (item.get("sentence") or ""))
            lines.append("  " + (item.get("url") or ""))
    else:
        lines.append("- None yet.")
    lines.append("Fresh uploads:")
    pulls = (lookalikes or {}).get("pulls") or []
    if pulls:
        for item in pulls:
            lines.append("- " + (item.get("name") or "Channel") + " | pulled " + str(item.get("pulled") or 0) + " | sample " + str(item.get("niche_videos") or 0))
    else:
        lines.append("- No Setup channels were pulled.")
    lines.append("Niche filter:")
    if lookalikes:
        lines.append("- Ignored " + str(lookalikes.get("short_videos") or 0) + " videos shorter than 3 minutes.")
        lines.append("- The score uses the median of the remaining videos on that channel.")
        lines.append("- Kept " + str(lookalikes.get("kept_videos") or 0) + " videos whose title has a strong word. A description match does not count.")
    else:
        lines.append("- No lookalike videos were scored.")
    lines.append("Removed channels:")
    removed = (lookalikes or {}).get("removed_channels") or []
    if removed:
        for item in removed:
            lines.append("- " + (item.get("name") or "Channel") + " | sample " + str(item.get("niche_videos") or 0) + " | " + (item.get("reason") or "Removed."))
    else:
        lines.append("- None.")
    lines.append("Lookalike channels:")
    channels = (lookalikes or {}).get("channels") or []
    if channels:
        for item in channels:
            lines.append("- " + (item.get("name") or item.get("channel_id") or "Channel") + " | sample " + str(item.get("sample") or item.get("videos") or 0))
    else:
        lines.append("- None yet. A channel needs 15 videos that are at least 3 minutes before it gets a score.")
    lines.append(list_notes(lookalikes))
    lines.append("Same topic videos:")
    same_topic = (lookalikes or {}).get("same_topic") or []
    if same_topic:
        for item in same_topic:
            lines.append(
                "- "
                + (item.get("channel") or "Channel")
                + " | "
                + (item.get("title") or "")
                + " | "
                + str(item.get("views") or 0)
                + " views | "
                + (item.get("published_at") or "")
                + " | "
                + (item.get("url") or "")
            )
    else:
        lines.append("- None found in the pulled uploads.")
    lines.append("Comments:")
    for line in (lookalikes or {}).get("comment_lines") or comment_themes(same_topic[:3]):
        lines.append("- " + line)
    lines.append("News with real links:")
    candidates = (lookalikes or {}).get("store_candidates") or []
    stats = (lookalikes or {}).get("store_stats") or {}
    feeds = (lookalikes or {}).get("news_feeds") or []
    for feed in feeds:
        name = feed.get("name") or "Feed"
        if feed.get("blocked"):
            lines.append("- " + name + " is blocked. " + (feed.get("error") or "robots.txt does not allow this feed."))
        elif feed.get("error"):
            lines.append("- " + name + ": " + feed["error"])
        else:
            lines.append(
                "- "
                + name
                + ": read "
                + str(feed.get("feed") or 0)
                + " stories, kept "
                + str(feed.get("matched") or 0)
                + " that name the brand."
            )
    stories = stats.get("stories") or []
    if stories:
        lines.append("- Not confirmed. Pick one on the Proof page.")
        for story in stories:
            when = story.get("date") or ""
            link = story.get("url") or ""
            if story.get("number") and story.get("sentence"):
                lines.append(
                    "- "
                    + (story.get("number") or "")
                    + " in "
                    + (story.get("year") or "")
                    + " | "
                    + (story.get("label") or "")
                    + " | "
                    + (story.get("sentence") or "")
                )
                lines.append("  " + when + " | " + link)
            else:
                lines.append("- " + (story.get("title") or "Story") + " | " + when + " | " + link)
                lines.append("  " + (story.get("note") or "No store count in the text we could read."))
    elif not feeds:
        lines.append("- No publisher feed was read.")
    lines.append("Store count candidates:")
    if stats:
        lines.append(
            "- Tried "
            + str(stats.get("tried") or 0)
            + ", resolved "
            + str(stats.get("resolved") or 0)
            + ", blocked "
            + str(stats.get("blocked") or 0)
            + ", failed "
            + str(stats.get("failed") or 0)
            + "."
            + ((" " + stats.get("reason")) if stats.get("reason") else "")
        )
    if candidates:
        lines.append("- Not confirmed. Pick one on the Proof page.")
        for item in candidates[:3]:
            lines.append(
                "- "
                + (item.get("number") or "")
                + " in "
                + (item.get("year") or "")
                + " | "
                + (item.get("label") or "")
                + " | "
                + (item.get("sentence") or "")
            )
            lines.append("  " + (item.get("url") or ""))
    else:
        lines.append("- None found in the kept news stories or cited pages.")
    lines.append("Lookalike patterns:")
    lines.append(patterns or "Not enough lookalike videos yet.")
    lines.append("Hook idea: " + hook)
    lines.append("Thumbnail ideas:")
    for idea in thumbs:
        lines.append("- " + idea)
    lines.append("What each source returned:")
    if sources:
        for item in sources:
            note = item.get("note") or ""
            lines.append("- " + item.get("kind", "source") + ": " + str(item.get("count") or 0) + ((" (" + note + ")") if note else ""))
            limit = 5 if item.get("kind") == "Google News" else 3
            for hit in (item.get("items") or [])[:limit]:
                if item.get("kind") == "Google News":
                    lines.append("  " + (hit.get("text") or "") + " | " + (hit.get("date") or ""))
                else:
                    lines.append("  " + (hit.get("name") or "") + " | " + (hit.get("date") or "") + " | " + (hit.get("url") or ""))
    else:
        lines.append("- None yet.")
    lines.append("Media:")
    if media:
        for item in media:
            lines.append(
                "- "
                + (item.get("title") or "Clip")
                + " | "
                + (item.get("license") or "")
                + " | "
                + (item.get("attribution") or "")
                + " | "
                + (item.get("url") or "")
            )
    else:
        lines.append("- No brand media found.")
    return {
        "title": title or "Untitled",
        "verified": verified,
        "reported": reported,
        "needs_check": needs,
        "patterns": patterns or "",
        "hook": hook,
        "thumbnails": thumbs,
        "media": list(media or []),
        "sources": list(sources or []),
        "history": list(history or []),
        "text": "\n".join(lines),
        "winners": [winner_public(item) for item in ((lookalikes or {}).get("outliers") or [])],
        "sameTopicWinners": [winner_public(item) for item in ((lookalikes or {}).get("same_topic_winners") or [])],
        "tooSmall": [winner_public(item) for item in ((lookalikes or {}).get("too_small") or [])],
    }


def train_outlier_model(rows):
    sample = [row for row in rows or [] if row.get("score") is not None]
    warning = None
    if len(sample) < SMALL_SAMPLE:
        warning = "The sample is " + str(len(sample)) + " videos. A score needs " + str(SMALL_SAMPLE) + " niche videos."
    labels = [1 if row["score"] >= OUTLIER_RATIO else 0 for row in sample]
    if len(set(labels)) < 2 or len(sample) < 8:
        return {
            "sample_size": len(sample),
            "metrics": None,
            "importance": [],
            "warning": warning or "Not enough variety to train.",
        }
    try:
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import cross_val_score
    except ImportError:
        return {
            "sample_size": len(sample),
            "metrics": None,
            "importance": [],
            "warning": "scikit-learn is not installed.",
        }
    matrix = []
    for row in sample:
        feat = row.get("features") or {}
        matrix.append([float(feat.get(name) or 0) for name in FEATURE_NAMES])
    x_values = np.array(matrix, dtype=float)
    y_values = np.array(labels)
    folds = min(5, int(y_values.sum()), int(len(y_values) - y_values.sum()))
    model = LogisticRegression(max_iter=400)
    metrics = None
    if folds >= 2:
        scores = cross_val_score(model, x_values, y_values, cv=folds, scoring="accuracy")
        metrics = {
            "accuracy_mean": float(scores.mean()),
            "accuracy_folds": [float(value) for value in scores],
            "folds": folds,
        }
    else:
        warning = warning or "Not enough of both classes for cross-validation."
    model.fit(x_values, y_values)
    importance = sorted(
        [
            {"feature": name, "weight": float(weight)}
            for name, weight in zip(FEATURE_NAMES, model.coef_[0])
        ],
        key=lambda item: abs(item["weight"]),
        reverse=True,
    )
    return {
        "sample_size": len(sample),
        "metrics": metrics,
        "importance": importance,
        "warning": warning,
    }


def cluster_titles(titles, vectors):
    if not vectors or len(titles) < 2:
        return {"clusters": [], "warning": "Not enough titles to cluster."}
    try:
        import numpy as np
        from sklearn.cluster import KMeans
    except ImportError:
        return {"clusters": [], "warning": "scikit-learn is not installed."}
    count = min(4, len(titles))
    labels = KMeans(n_clusters=count, n_init=10, random_state=0).fit_predict(np.array(vectors, dtype=float))
    groups = {}
    for title, label in zip(titles, labels):
        groups.setdefault(int(label), []).append(title)
    return {"clusters": [{"id": key, "titles": value} for key, value in sorted(groups.items())], "warning": None}


def tfidf_vectors(titles):
    from sklearn.feature_extraction.text import TfidfVectorizer

    if len(titles) < 2:
        return []
    matrix = TfidfVectorizer(stop_words="english").fit_transform(list(titles))
    return matrix.toarray().tolist()


def embed_titles(titles):
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model.encode(list(titles), show_progress_bar=False).tolist()


def title_vectors(titles):
    """TF-IDF is the default. Set COUNTER_NOTES_EMBEDDINGS=1 to use the optional model."""
    if os.environ.get("COUNTER_NOTES_EMBEDDINGS", "").strip() == "1":
        return embed_titles(titles)
    return tfidf_vectors(titles)
