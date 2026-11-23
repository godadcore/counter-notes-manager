import sqlite3
import unittest

from counter_notes.collect import brand_media_row, check_pasted_page, collect_channel_uploads, collect_youtube, decode_google_news_url, fetch_publisher_rss, parse_channel_ref, parse_rss_items, prove_store_counts
from counter_notes.core import (
    Quota,
    QuotaStopped,
    choose_entity,
    claim_phrase,
    historical_figures,
    claim_matches_sentence,
    compile_dossier,
    gdelt_pause,
    gdelt_retry,
    filter_news,
    is_production_metadata,
    median,
    next_post_ids,
    number_in_text,
    business_news_story,
    comment_report,
    comment_themes,
    title_pattern_lines,
    niche_match_words,
    niche_video,
    same_topic_videos,
    store_count_candidates,
    outlier_score,
    score_lookalikes,
    why_they_win,
    winner_line,
    sec_decision,
    tfidf_vectors,
    title_vectors,
    train_outlier_model,
    verify_detail,
)
from counter_notes.pipeline import run_job
from counter_notes.store import cache_fresh, cache_put, ensure


def memory_db():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("CREATE TABLE topics (id INTEGER PRIMARY KEY, title TEXT, short TEXT)")
    db.execute(
        """
        CREATE TABLE findings (
          id INTEGER PRIMARY KEY,
          topic_id INTEGER,
          number_text TEXT,
          label TEXT,
          hold INTEGER,
          source_url TEXT,
          source_name TEXT,
          source_date TEXT
        )
        """
    )
    ensure(db)
    return db


class ResearchTests(unittest.TestCase):
    def test_outlier_score_is_views_over_the_niche_median(self):
        short = [10, 20, 30, 40, 100]
        self.assertEqual(median(short), 30)
        self.assertIsNone(outlier_score(100, short))
        self.assertIsNone(outlier_score(1000, [10] * 14))
        sample = [100] * 14 + [400]
        self.assertAlmostEqual(outlier_score(400, sample), 400 / median(sample))
        self.assertAlmostEqual(outlier_score(50, sample), 50 / median(sample))
        self.assertIsNone(outlier_score(10, [0] * 15))
        self.assertIsNone(outlier_score(None, [10] * 15))

    def test_verification_needs_claim_context_and_independent_sources(self):
        sec = {"kind": "sec", "domain": "sec.gov", "text": "The filing lists 44000 stores in 2015.", "url": "https://www.sec.gov/a"}
        wiki = {"kind": "wikipedia", "domain": "en.wikipedia.org", "text": "The chain listed about 44000 stores at the peak in 2015.", "url": "https://en.wikipedia.org/wiki/Shop"}
        news = {"kind": "gdelt", "domain": "example-news.test", "text": "A trade paper said the chain still had 44000 stores in 2016.", "url": "https://example-news.test/story"}
        same = {"kind": "rss", "domain": "en.wikipedia.org", "text": "Another page said 44000 stores again in 2015.", "url": "https://en.wikipedia.org/wiki/Other"}
        self.assertEqual(verify_detail("44000", [sec], "44000 stores")[0], "Verified (primary)")
        self.assertEqual(verify_detail("44000", [wiki], "44000 stores")[0], "Reported (one secondary source)")
        self.assertEqual(verify_detail("44000", [wiki, same], "44000 stores")[0], "Reported (one secondary source)")
        self.assertEqual(verify_detail("44000", [wiki, news], "44000 stores")[0], "Verified (two independent sources)")
        self.assertEqual(verify_detail("44000", [{"kind": "sec", "domain": "sec.gov", "text": "No figure here.", "url": "https://www.sec.gov/b"}], "44000 stores")[0], "Needs check")
        self.assertFalse(number_in_text("2", "20 stores"))
        self.assertTrue(number_in_text("$2", "The tag says $2."))

    def test_disambiguation_page_is_rejected(self):
        result = choose_entity("Subway", [
            {"id": "Q1", "label": "Subway", "description": "Wikimedia disambiguation page", "instance_of": ["Q4167410"]},
            {"id": "Q2", "label": "New York City Subway", "description": "rapid transit system in New York City", "instance_of": ["Q1637706"]},
            {"id": "Q244457", "label": "Subway", "description": "American fast food restaurant chain", "instance_of": ["Q185092"]},
        ])
        self.assertEqual(result["chosen"]["id"], "Q244457")
        self.assertIn("Q244457", result["reason"])
        reasons = [item["reason"] for item in result["rejected"]]
        self.assertIn("Disambiguation page.", reasons)
        self.assertTrue(any("transit" in reason.lower() for reason in reasons))

    def test_private_company_skips_sec(self):
        self.assertEqual(sec_decision({"label": "Subway", "ticker": "", "exchanges": []}), "private company, no SEC filings")
        self.assertEqual(sec_decision({"label": "Starbucks", "ticker": "SBUX", "exchanges": []}), "search")

    def test_store_count_does_not_match_an_employee_figure(self):
        employees = {"kind": "gdelt", "domain": "news.test", "url": "https://news.test/staff", "text": "The company employs 44,000 employees worldwide in 2019."}
        stores = {"kind": "gdelt", "domain": "news.test", "url": "https://news.test/stores", "text": "The chain had 44,000 stores at its peak in 2015."}
        undated = {"kind": "gdelt", "domain": "news.test", "url": "https://news.test/undated", "text": "The chain had 44,000 stores at its peak."}
        self.assertEqual(verify_detail("44,000", [employees], "Store count near 44,000")[0], "Needs check")
        self.assertEqual(verify_detail("44,000", [stores], "Store count near 44,000")[0], "Reported (one secondary source)")
        self.assertEqual(verify_detail("44,000", [undated], "Store count near 44,000")[0], "Needs check")
        self.assertIn("2015", verify_detail("44,000", [stores], "Store count near 44,000")[1][0]["sentence"])
        bare = "At their peak, twelve kosher Subway locations were open, including Kansas City and 5 in New York."
        self.assertEqual(verify_detail("$5", [{"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)", "text": bare}], "the end of the $5 footlong")[0], "Needs check")
        self.assertEqual(verify_detail("$5", [{"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)", "text": "=== $5 footlongs ==="}], "the end of the $5 footlong")[0], "Needs check")
        spelled = "In 2012 the company marketed the 5 dollar footlong."
        self.assertEqual(verify_detail("$5", [{"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)", "text": spelled}], "the end of the $5 footlong")[0], "Reported (one secondary source)")
        priced = "In 2018 the $5 footlong stopped working for franchise owners."
        priced_status, priced_matches = verify_detail("$5", [{"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)", "text": priced}], "the end of the $5 footlong")
        self.assertEqual(priced_status, "Reported (one secondary source)")
        self.assertIn("footlong", priced_matches[0]["sentence"])
        deal = "In 2014 the $5 footlong deal brought in lunch customers."
        rotating = "Since 2011, there has been a monthly rotating $5 footlong."
        page = {"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)"}
        self.assertEqual(verify_detail("$5", [{**page, "text": deal}], "Rotating monthly $5 footlong")[0], "Needs check")
        self.assertEqual(verify_detail("$5", [{**page, "text": rotating}], "Rotating monthly $5 footlong")[0], "Reported (one secondary source)")
        self.assertEqual(verify_detail("$5", [{**page, "text": deal}], "$5 footlong deal")[0], "Reported (one secondary source)")
        self.assertEqual(verify_detail("$5", [{**page, "text": rotating}], "$5 footlong deal")[0], "Needs check")
        self.assertFalse(claim_matches_sentence("Rotating monthly $5 footlong", deal, "$5"))
        self.assertTrue(claim_matches_sentence("$5 footlong deal", deal, "$5"))
        both = "In 2008 the $5 footlongs sold for five dollars. Since 2011, there has been a monthly rotating $5 footlong."
        rotating_status, rotating_hits = verify_detail("$5", [{**page, "text": both}], "Rotating monthly $5 footlong")
        self.assertEqual(rotating_status, "Reported (one secondary source)")
        self.assertIn("rotating", rotating_hits[0]["sentence"].lower())
        self.assertEqual(verify_detail("$5", [{**page, "text": both}], "$5 footlong deal")[0], "Needs check")

    def test_a_mirrored_page_is_not_a_second_source(self):
        sentence = "Subway operated about 44000 stores in 2016 before the closures began in earnest."
        wiki = {"kind": "wikipedia", "domain": "en.wikipedia.org", "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)", "text": sentence}
        mirror = {"kind": "reference", "domain": "www.wikiwand.com", "url": "https://www.wikiwand.com/en/Subway", "text": sentence}
        status, matches = verify_detail("44000", [wiki, mirror], "44000 stores")
        self.assertEqual(status, "Reported (one secondary source)")
        self.assertEqual(len(matches), 1)

    def test_runtime_is_excluded_from_the_check_list(self):
        self.assertTrue(is_production_metadata("length: 9 min"))
        self.assertFalse(is_production_metadata("claim: Store count near 44,000"))
        kept, dropped = filter_news(
            [
                {"title": "Subway stores close", "language": "English"},
                {"title": "Subway stores", "text": "locations", "language": "Russian"},
                {"title": "Weather today", "language": "English"},
            ],
            "Subway",
            ["stores"],
        )
        self.assertEqual(len(kept), 1)
        self.assertEqual(dropped, 2)
        self.assertEqual(next_post_ids({"3": True}, 4), [2, 3, 4, 5])

    def test_quota_stops_before_the_daily_limit(self):
        quota = Quota(used=9800, limit=10000, reserve=200)
        self.assertFalse(quota.allow(100))
        with self.assertRaises(QuotaStopped):
            quota.spend(100)
        calls = []

        def transport(request):
            calls.append(request)
            return {"ids": ["a"]}

        found = collect_youtube(["costco", "aldi"], quota, transport, {})
        self.assertEqual(found, [])
        self.assertEqual(calls, [])
        self.assertEqual(quota.used, 9800)
        room = Quota(used=9700, limit=10000, reserve=200)
        self.assertTrue(room.allow(100))
        room.spend(100)
        self.assertFalse(room.allow(100))

    def test_dossier_uses_only_numbers_present_in_retrieved_text(self):
        empty = compile_dossier("Corner shop", [{"number": "9", "status": "Verified", "url": "https://www.sec.gov/a", "snippet": "No figure in this page.", "name": "SEC", "date": "2024-01-02"}], "", [])
        self.assertEqual(empty["verified"], [])
        self.assertEqual(empty["needs_check"][0]["status"], "Needs check")
        self.assertNotIn("9", empty["hook"])
        kept = compile_dossier(
            "Corner shop",
            [{"number": "$2", "status": "Verified", "url": "https://www.sec.gov/a", "snippet": "The shelf price was $2.", "name": "SEC EDGAR", "date": "2024-01-02"}],
            "Open on the price.",
            [{"title": "Counter", "url": "https://commons.wikimedia.org/wiki/File:A.jpg", "kind": "image", "license": "CC0", "attribution": "Commons"}],
        )
        self.assertEqual(kept["verified"][0]["number"], "$2")
        self.assertIn("https://www.sec.gov/a", kept["text"])
        self.assertIn("CC0", kept["text"])
        self.assertIn("$2", kept["hook"])

    def test_small_sample_warns_and_a_fake_run_does_not_invent_a_number(self):
        trained = train_outlier_model([{"score": 3, "features": {"title_length": 4}}])
        self.assertIn("1", trained["warning"])
        self.assertIn("15", trained["warning"])
        self.assertNotIn("until more videos are cached", trained["warning"])
        wide = train_outlier_model([
            {"score": 3 if index % 2 == 0 else 1, "features": {"title_length": 4}}
            for index in range(15)
        ])
        self.assertNotIn("until more videos are cached", wide.get("warning") or "")
        self.assertFalse((wide.get("warning") or "").startswith("The sample is "))
        self.assertIsNone(trained["metrics"])
        db = memory_db()
        db.execute("INSERT INTO topics (id, title, short) VALUES (1, 'Corner shop', 'Corner')")
        db.execute(
            "INSERT INTO findings (id, topic_id, number_text, label, hold, source_url, source_name, source_date) VALUES (1, 1, '$2', 'price', 1, '', '', '')"
        )
        db.execute(
            "INSERT INTO findings (id, topic_id, number_text, label, hold, source_url, source_name, source_date) VALUES (2, 1, '9', 'length: 9 min', 1, '', '', '')"
        )
        db.execute("INSERT INTO config (key, value) VALUES ('niche_keywords', '[]') ON CONFLICT(key) DO UPDATE SET value = '[]'")
        db.commit()

        def evidence(request):
            if request["kind"] == "resolve":
                return {
                    "chosen": {
                        "id": "Q1",
                        "label": "Corner",
                        "description": "public company",
                        "ticker": "CRNR",
                        "exchanges": ["Q13677"],
                        "instance_of": ["Q891723"],
                        "wikipedia": "",
                        "website": "",
                    },
                    "reason": "Exact label match for Corner. Ticker CRNR.",
                    "rejected": [],
                }
            if request["kind"] == "sec":
                return [{"url": "https://www.sec.gov/a", "date": "2024-01-02", "text": "The shelf price was $2 in 2024.", "name": "SEC EDGAR"}]
            return []

        def media(request):
            return [{"title": "Counter", "url": "https://commons.wikimedia.org/wiki/File:A.jpg", "kind": "image", "license": "CC0", "attribution": "Commons"}]

        result = run_job(db, evidence_transport=evidence, media_transport=media, day="2026-11-23")
        self.assertEqual(result["topics"], 1)
        row = db.execute("SELECT hold, source_url FROM findings WHERE id = 1").fetchone()
        self.assertEqual(row["hold"], 0)
        self.assertEqual(row["source_url"], "https://www.sec.gov/a")
        body = db.execute("SELECT body FROM dossiers WHERE topic_id = 1").fetchone()["body"]
        self.assertIn("$2", body)
        self.assertNotIn("44000", body)
        self.assertIn("What each source returned", body)
        self.assertIn("sec: 1", body)
        self.assertNotIn("9 still needs a check", body)
        self.assertEqual(db.execute("SELECT hold FROM findings WHERE id = 2").fetchone()["hold"], 1)

    def test_daily_pass_covers_four_topics_and_stops_before_the_quota_guard(self):
        import os
        db = memory_db()
        for topic_id in range(1, 7):
            db.execute("INSERT INTO topics (id, title, short) VALUES (?, ?, ?)", (topic_id, "Topic " + str(topic_id), "Brand"))
        db.execute("INSERT INTO config (key, value) VALUES ('niche_keywords', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ('["costco"]',))
        db.execute("INSERT INTO research_quota (day, units) VALUES ('2026-11-23', 9800)")
        db.commit()
        os.environ["YOUTUBE_API_KEY"] = "test-key"

        def youtube(request):
            raise AssertionError("YouTube was called after the quota guard")

        try:
            result = run_job(
                db,
                evidence_transport=lambda request: {"chosen": None, "reason": "No business or brand matched.", "rejected": []} if request.get("kind") == "resolve" else [],
                media_transport=lambda request: [],
                youtube_transport=youtube,
                day="2026-11-23",
            )
        finally:
            os.environ.pop("YOUTUBE_API_KEY", None)
        self.assertEqual(result["topic_ids"], [1, 2, 3, 4])
        self.assertEqual(result["quota"], 9800)

    def test_a_claim_keeps_its_year_and_gdelt_does_not_loop(self):
        phrase = claim_phrase("44,000", "Store count near 44,000", "The chain had 44,000 stores at its peak in 2015.")
        self.assertEqual(phrase, "about 44,000 stores at the peak in 2015")
        footlong = claim_phrase("$5", "Store count near 44,000 and the $5 footlong economics", "Since 2011, there has been a monthly rotating $5 footlong.")
        self.assertEqual(footlong, "about $5 footlong in 2011")
        history = historical_figures([{
            "kind": "wikipedia",
            "url": "https://en.wikipedia.org/wiki/Subway_(restaurant)",
            "name": "Wikipedia",
            "text": "It was the fastest-growing franchise in the world in 2015 and, as of September 2023, has over 37,000 locations in more than 102 countries. At the end of 2010, Subway became the largest fast food chain worldwide with 33,749 restaurants; 1,012 more than McDonald's. As of January 2017, there were 591 Subway restaurants in 68 Indian cities. The acquisition was $11.4 billion in 2014. On March 19, 2024, Subway signed a deal that began on January 1, 2025, ending the restaurant chain's partnership. SouthRock Capital, operator of Brazilian Subway restaurants, later declared Chapter 15 bankruptcy in June 2024.",
        }])
        pairs = [(item["number"], item["year"]) for item in history]
        self.assertIn(("37,000", "2023"), pairs)
        self.assertIn(("33,749", "2010"), pairs)
        self.assertIn(("591", "2017"), pairs)
        self.assertFalse(any(number in {"102", "1,012", "$11.4", "68", "1", "15", "19"} for number, _year in pairs))
        self.assertEqual(gdelt_pause(0, 10, 6), 0)
        self.assertEqual(gdelt_pause(10, 12, 6), 4)
        self.assertEqual(gdelt_retry(1), "skip")
        self.assertEqual(gdelt_retry(2), "skip")
        db = memory_db()
        cache_put(db, "gdelt:subway", {"items": []})
        self.assertIsNotNone(cache_fresh(db, "gdelt:subway", 24))
        db.execute("UPDATE research_cache SET fetched_at = '2020-01-01T00:00:00Z' WHERE cache_key = 'gdelt:subway'")
        self.assertIsNone(cache_fresh(db, "gdelt:subway", 24))

    def test_uploads_use_the_channel_playlist_and_record_the_sample_size(self):
        quota = Quota(used=0)
        calls = []

        def transport(request):
            calls.append(request["kind"])
            if request["kind"] == "youtube.channel":
                return {"channel_id": "UC1", "channel_title": "Sample Channel", "uploads": "UU1"}
            if request["kind"] == "youtube.playlist":
                return {"ids": ["a", "b", "c"]}
            return {"videos": [
                {"video_id": "a", "channel_id": "UC1", "channel_title": "Sample Channel", "title": "One", "views": 10},
                {"video_id": "b", "channel_id": "UC1", "channel_title": "Sample Channel", "title": "Two", "views": 30},
                {"video_id": "c", "channel_id": "UC1", "channel_title": "Sample Channel", "title": "Three", "views": 100},
            ]}

        videos, stopped = collect_channel_uploads([{"channel_id": "UC1"}], quota, transport, {})
        self.assertEqual(calls, ["youtube.channel", "youtube.playlist", "youtube.videos"])
        self.assertFalse(stopped)
        self.assertEqual(quota.used, 3)
        self.assertEqual(videos[0]["sample_size"], 3)
        self.assertIsNone(outlier_score(100, [10, 30, 100]))
        blocked = Quota(used=9800)
        called = []
        found, stopped = collect_channel_uploads([{"channel_id": "UC1"}], blocked, lambda request: called.append(request), {})
        self.assertEqual(found, [])
        self.assertEqual(called, [])
        self.assertTrue(stopped)

    def test_tfidf_is_the_default_and_clusters_titles(self):
        titles = ["costco hot dog price", "costco hot dog deal", "aldi grocery price", "aldi grocery aisle"]
        vectors = title_vectors(titles)
        self.assertEqual(vectors, tfidf_vectors(titles))
        self.assertEqual(len(vectors), 4)
        self.assertGreater(sum(vectors[0]), 0)

    def test_niche_filter_drops_other_videos_and_waits_for_15(self):
        videos = []
        for index in range(20):
            videos.append({
                "video_id": "n" + str(index),
                "channel_id": "UC-niche",
                "channel_title": "Brand Stories",
                "title": "Why the chain failed " + str(index),
                "description": "A store count and price story",
                "views": 50000 + index * 100,
                "duration_seconds": 600,
                "published_at": "2024-01-02T00:00:00Z",
            })
        videos.append({
            "video_id": "off",
            "channel_id": "UC-other",
            "channel_title": "Gaming Clips",
            "title": "Minecraft house tour",
            "description": "A game",
            "views": 900000,
        })
        videos.append({
            "video_id": "short",
            "channel_id": "UC-small",
            "channel_title": "Tiny Brand",
            "title": "The fall of a shop",
            "views": 50,
        })
        self.assertTrue(niche_video(videos[0]))
        self.assertFalse(niche_video(videos[-2]))
        scored = score_lookalikes(videos)
        self.assertEqual(scored["dropped_videos"], 2)
        self.assertEqual(scored["kept_videos"], 20)
        removed = {item["name"]: item["niche_videos"] for item in scored["removed_channels"]}
        self.assertEqual(removed["Gaming Clips"], 1)
        self.assertEqual(removed["Tiny Brand"], 1)
        self.assertNotIn("Brand Stories", removed)
        self.assertEqual(scored["channels"][0]["sample"], 20)
        self.assertEqual(scored["pulls"][0]["pulled"] if scored["pulls"][0]["name"] == "Brand Stories" else scored["channels"][0]["pulled"], 20)
        self.assertTrue(scored["outliers"])
        self.assertEqual(len(scored["outliers"]), 3)
        self.assertEqual(scored["outliers"][0]["sample"], 20)
        self.assertAlmostEqual(scored["outliers"][0]["score"], scored["outliers"][0]["views"] / median([50000 + index * 100 for index in range(20)]))
        self.assertIn("x the channel's normal views", scored["outliers"][0]["multiple"])
        self.assertTrue(scored["outliers"][0]["url"].startswith("https://www.youtube.com/watch?v="))
        notes = why_they_win([{
            "title": "Why the price fell",
            "comments": [
                "How many stores are left?",
                "You should cover the store count next.",
                "This video is too long and the number is wrong.",
                "Please can you do a video on the rivals but the rest of this comment keeps going without a stop",
            ],
        }])
        joined = " ".join(notes)
        self.assertIn("why", joined.lower())
        self.assertIn("You should cover the store count next.", joined)
        self.assertNotIn("How many stores", joined)
        self.assertNotIn("keeps going", joined)
        self.assertIn("too long", joined.lower())
        self.assertFalse(niche_video({"title": "A quiet afternoon", "description": "The price changed."}))
        self.assertEqual(niche_match_words({"title": "A quiet afternoon", "description": "The price fell and stores closed."}), [])
        self.assertEqual(niche_match_words({"title": "Why the price rose in each location", "description": "The stores closed."}), [])
        self.assertEqual(niche_match_words({"title": "The stores closed", "description": "The price rose."}), ["stores", "closed"])
        self.assertIn("failed", niche_match_words({"title": "Why the chain failed", "description": ""}))

    def test_one_channel_fills_at_most_three_of_ten_winner_slots(self):
        videos = []
        for index in range(16):
            videos.append({"video_id": "h" + str(index), "channel_id": "huge", "channel_title": "Huge", "title": "Why the stores failed", "views": 1000})
        for views in (500000, 400000, 300000, 200000):
            videos.append({"video_id": "top" + str(views), "channel_id": "huge", "channel_title": "Huge", "title": "The decline of the chain", "views": views})
        for index in range(20):
            videos.append({"video_id": "m" + str(index), "channel_id": "mid", "channel_title": "Mid", "title": "Franchise price collapse", "views": 60000 + index * 10})
        for index in range(20):
            videos.append({"video_id": "l" + str(index), "channel_id": "low", "channel_title": "Low", "title": "The stores failed", "views": 55000 + index})
        for index in range(20):
            videos.append({"video_id": "e" + str(index), "channel_id": "extra", "channel_title": "Extra", "title": "The chain went bankrupt", "views": 52000 + index})
        outliers = score_lookalikes(videos)["outliers"]
        self.assertEqual(len(outliers), 10)
        self.assertEqual(sum(1 for item in outliers if item["channel_id"] == "huge"), 3)
        self.assertTrue(all(sum(1 for item in outliers if item["channel_id"] == channel) <= 3 for channel in ("huge", "mid", "low", "extra")))
        self.assertTrue(outliers[0]["matched_words"])
        self.assertIn("x the channel's normal views", outliers[0]["multiple"])

    def test_shorts_stay_out_of_the_median_and_the_top_10_needs_a_title_word(self):
        videos = []
        for index in range(20):
            videos.append({
                "video_id": "n" + str(index),
                "channel_id": "step",
                "channel_title": "Step",
                "title": "A normal upload",
                "views": 1000,
                "duration_seconds": 600,
            })
        videos.append({
            "video_id": "short",
            "channel_id": "step",
            "channel_title": "Step",
            "title": "The stores closed",
            "views": 9000000,
            "duration_seconds": 45,
        })
        videos.append({
            "video_id": "weak",
            "channel_id": "step",
            "channel_title": "Step",
            "title": "Why the price rose",
            "description": "The stores closed and the franchise failed.",
            "views": 8000000,
            "duration_seconds": 700,
        })
        videos.append({
            "video_id": "strong",
            "channel_id": "step",
            "channel_title": "Step",
            "title": "The stores closed",
            "views": 50000,
            "duration_seconds": 800,
        })
        scored = score_lookalikes(videos)
        self.assertEqual(scored["short_videos"], 1)
        self.assertEqual(len(scored["outliers"]), 1)
        winner = scored["outliers"][0]
        self.assertEqual(winner["video_id"], "strong")
        self.assertEqual(winner["views"], 50000)
        self.assertEqual(winner["sample"], 22)
        self.assertEqual(winner["matched_words"], ["stores", "closed"])
        self.assertAlmostEqual(winner["score"], 50000 / median([1000] * 20 + [8000000, 50000]))
        self.assertIn("50,000 views", winner_line(winner))

    def test_videos_under_50000_leave_the_lists_and_an_ignored_id_stays_out(self):
        videos = []
        for index in range(15):
            videos.append({
                "video_id": "n" + str(index),
                "channel_id": "c",
                "channel_title": "C",
                "title": "A normal upload",
                "views": 1000,
                "duration_seconds": 600,
            })
        videos.append({
            "video_id": "big",
            "channel_id": "c",
            "channel_title": "C",
            "title": "The stores closed",
            "views": 900000,
            "duration_seconds": 800,
        })
        videos.append({
            "video_id": "small",
            "channel_id": "c",
            "channel_title": "C",
            "title": "The franchise failed",
            "views": 49999,
            "duration_seconds": 800,
        })
        videos.append({
            "video_id": "brand",
            "channel_id": "c",
            "channel_title": "C",
            "title": "Why Subway is closing",
            "views": 120000,
            "duration_seconds": 800,
        })
        videos.append({
            "video_id": "brandsmall",
            "channel_id": "c",
            "channel_title": "C",
            "title": "Subway stores closed",
            "views": 1000,
            "duration_seconds": 800,
        })
        scored = score_lookalikes(videos, "Subway")
        outlier_ids = [item["video_id"] for item in scored["outliers"]]
        self.assertIn("big", outlier_ids)
        self.assertIn("brand", outlier_ids)
        self.assertNotIn("small", outlier_ids)
        self.assertNotIn("brandsmall", outlier_ids)
        self.assertTrue(all(item["views"] >= 50000 for item in scored["outliers"]))
        self.assertTrue(all(item["views"] >= 50000 for item in scored["same_topic_winners"]))
        small_ids = [item["video_id"] for item in scored["too_small"]]
        self.assertIn("small", small_ids)
        self.assertIn("brandsmall", small_ids)
        self.assertEqual([item["video_id"] for item in scored["same_topic_winners"]], ["brand"])
        notes = compile_dossier("Subway", [], "", [], None, scored)["text"]
        self.assertIn("Too small to count:", notes)
        self.assertIn("49,999 views", notes)
        ignored = score_lookalikes(videos, "Subway", ignored={"big"})
        self.assertNotIn("big", [item["video_id"] for item in ignored["outliers"]])
        self.assertNotIn("big", [item["video_id"] for item in ignored["too_small"]])
        self.assertNotIn("big", [item["video_id"] for item in ignored["same_topic_winners"]])
        self.assertEqual(ignored["outliers"][0]["sample"], scored["outliers"][0]["sample"])

    def test_a_second_research_job_does_not_start(self):
        import time
        from counter_notes import job

        gate = {"go": False}

        def runner(topic_id):
            while not gate["go"]:
                time.sleep(0.01)
            return {"topics": 1}

        with job._lock:
            job._job["running"] = False
        first = job.start(None, runner)
        second = job.start(7, runner)
        job.note_topic("Subway")
        try:
            self.assertTrue(first["started"])
            self.assertFalse(second["started"])
            self.assertEqual(job.snapshot()["topicName"], "Subway")
            self.assertTrue(job.snapshot()["running"])
        finally:
            gate["go"] = True
            for _ in range(50):
                if not job.snapshot()["running"]:
                    break
                time.sleep(0.02)
        self.assertFalse(job.snapshot()["running"])
        self.assertTrue(job.snapshot()["done"])

    def test_restore_deletes_an_ignored_video(self):
        import os
        import tempfile
        from counter_notes.store import ensure, ignore_video, restore_video, ignored_ids

        handle = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
        handle.close()
        db = sqlite3.connect(handle.name)
        db.row_factory = sqlite3.Row
        ensure(db)
        try:
            ignore_video(db, "bring-back")
            self.assertIn("bring-back", ignored_ids(db))
            restore_video(db, "bring-back")
            self.assertNotIn("bring-back", ignored_ids(db))
        finally:
            db.close()
            os.remove(handle.name)

    def test_same_topic_winners_include_a_brand_title_without_a_niche_word(self):
        videos = []
        for index in range(20):
            videos.append({
                "video_id": "n" + str(index),
                "channel_id": "step",
                "channel_title": "Step",
                "title": "Why the stores failed",
                "views": 1000,
            })
        videos.append({
            "video_id": "sub",
            "channel_id": "step",
            "channel_title": "Step",
            "title": "How much it costs to own a Subway",
            "views": 50000,
        })
        winners = score_lookalikes(videos, "Subway")["same_topic_winners"]
        self.assertEqual(len(winners), 1)
        self.assertEqual(winners[0]["title"], "How much it costs to own a Subway")
        self.assertEqual(winners[0]["sample"], 21)
        self.assertIn("x the channel's normal views", winners[0]["multiple"])

    def test_saved_channel_id_is_not_searched_again(self):
        ref = parse_channel_ref("Sample Channel | UCsampleDemoChannel0001")
        self.assertEqual(ref["channel_id"], "UCsampleDemoChannel0001")
        self.assertEqual(ref["name"], "Sample Channel")
        calls = []

        def transport(request):
            calls.append(request["kind"])
            if request["kind"] == "youtube.channel":
                return {"channel_id": "UCsampleDemoChannel0001", "channel_title": "Sample Channel", "uploads": "UU1"}
            if request["kind"] == "youtube.playlist":
                return {"ids": ["abc"]}
            if request["kind"] == "youtube.videos":
                return {"videos": [{"video_id": "abc", "title": "Why the stores failed", "description": "", "views": 10}]}
            return {}

        videos, stopped = collect_channel_uploads(["Sample Channel | UCsampleDemoChannel0001"], Quota(0), transport, {})
        self.assertFalse(stopped)
        self.assertEqual(videos[0]["video_id"], "abc")
        self.assertNotIn("youtube.channelSearch", calls)
        self.assertEqual(calls, ["youtube.channel", "youtube.playlist", "youtube.videos"])

    def test_comments_and_store_candidates_stay_unconfirmed(self):
        report = comment_report([{
            "comments": [
                {"text": "What about the franchise next?", "likes": 2},
                {"text": "You should cover the store count.", "likes": 9},
                "This video is too long.",
            ],
        }])
        joined = " ".join(report)
        self.assertIn("What about the franchise next?", joined)
        self.assertIn("You should cover the store count.", joined)
        self.assertIn("too long", joined.lower())
        same = same_topic_videos([
            {"video_id": "s1", "title": "The Decline of Subway...What Happened?", "channel_title": "Sample Channel", "views": 20, "published_at": "2024-01-02T00:00:00Z"},
            {"video_id": "s2", "title": "A train timetable", "views": 99},
        ], "Subway")
        self.assertEqual(len(same), 1)
        self.assertEqual(same[0]["channel"], "Sample Channel")
        self.assertIn("watch?v=s1", same[0]["url"])
        quiet = comment_report([{
            "title": "How much it actually costs to own a Subway",
            "comments": [{"text": "Where did the $5 footlong go?", "likes": 4}],
        }])
        quiet_text = " ".join(quiet)
        self.assertIn("Viewers ask: none found. Read 1 comments.", quiet_text)
        self.assertIn("Where did the $5 footlong go? — How much it actually costs to own a Subway", quiet_text)
        self.assertIn("Viewers care most about: Where did the $5 footlong go?", quiet_text)
        candidates = store_count_candidates([
            {"kind": "rss", "url": "https://news.example/a", "text": "Subway had 37,000 stores in 2023."},
            {"kind": "wikipedia", "url": "https://en.wikipedia.org/wiki/Subway", "text": "It had 44,000 locations in 2019."},
        ])
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["number"], "37,000")
        self.assertEqual(candidates[0]["year"], "2023")
        self.assertEqual(candidates[0]["label"], "TOTAL STORES")
        rejected = store_count_candidates([
            {"kind": "news", "url": "https://news.example/pub", "text": "Details for 2026 from 1851 Franchise. Subway closed at least 729 stores in 2025."},
            {"kind": "news", "url": "https://news.example/mash", "text": "See the ads, spenders, and trends. Get the Report iSpot 500 stores in 2015."},
        ], brand="Subway")
        self.assertEqual([(item["number"], item["label"]) for item in rejected], [("729", "CLOSURES")])
        self.assertNotIn("1851", rejected[0]["sentence"])
        self.assertFalse(brand_media_row("Subway", {"title": "File:Man at Dundas subway station.jpg"}))
        self.assertTrue(brand_media_row("Subway", {"title": "File:Subway restaurant logo.svg"}))

    def test_business_news_keeps_the_brand_near_a_business_word(self):
        self.assertTrue(business_news_story("Subway", "Subway franchise is closing stores", ""))
        self.assertFalse(business_news_story("Subway", "Woman shoved onto subway tracks", ""))
        self.assertFalse(business_news_story("Subway", "Subway restaurant beside the metro station", ""))
        self.assertFalse(business_news_story("Subway", "Subway " + ("word " * 20) + "restaurant", ""))
        self.assertFalse(business_news_story("Subway", "A train delay on the subway", "franchise sales"))
        self.assertFalse(business_news_story("Subway", "The subway seats are busy with eyes closed", ""))

    def test_named_channel_pulls_the_uploads_playlist(self):
        calls = []

        def transport(request):
            calls.append(request["kind"])
            if request["kind"] == "youtube.channel" and request.get("handle"):
                return {"channel_id": "UCwrong", "channel_title": "companyman", "uploads": "UUwrong", "subscribers": 10}
            if request["kind"] == "youtube.channelSearch":
                return {"channels": [
                    {"channel_id": "UCwrong", "channel_title": "companyman"},
                    {"channel_id": "UCright", "channel_title": "Sample Channel"},
                ]}
            if request["kind"] == "youtube.channels":
                return {"channels": [
                    {"channel_id": "UCwrong", "channel_title": "companyman", "uploads": "UUwrong", "subscribers": 10},
                    {"channel_id": "UCright", "channel_title": "Sample Channel", "uploads": "UUright", "subscribers": 1000},
                ]}
            if request["kind"] == "youtube.playlist":
                return {"ids": ["abc"]}
            if request["kind"] == "youtube.videos":
                return {"videos": [{"video_id": "abc", "title": "Why the stores failed", "description": "store count", "views": 10}]}
            return {}

        videos, stopped = collect_channel_uploads(["Sample Channel"], Quota(0), transport, {})
        self.assertFalse(stopped)
        self.assertEqual(videos[0]["video_id"], "abc")
        self.assertEqual(videos[0]["channel_title"], "Sample Channel")
        self.assertNotIn("youtube.search", calls)
        self.assertIn("youtube.playlist", calls)

    def test_publisher_rss_reports_each_feed(self):
        xml = """
        <rss><channel>
          <item><title>Subway store count falls</title><link>https://example.test/a</link><description>The price fell.</description><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
          <item><title>Unrelated markets</title><link>https://example.test/b</link><description>No brand here.</description></item>
          <item><title>Subway restaurant beside the metro station</title><link>https://example.test/c</link><description>A transit delay.</description></item>
        </channel></rss>
        """
        urls = []

        def read(url):
            urls.append(url)
            return xml

        def allows(url):
            return "nrn.com" not in url

        result = fetch_publisher_rss("Subway", read, allows)
        self.assertEqual([item["name"] for item in result["publishers"]], [
            "Restaurant Dive",
            "Restaurant Business",
            "QSR Magazine",
            "Nation's Restaurant News",
        ])
        self.assertTrue(result["publishers"][3]["blocked"])
        self.assertIn("robots.txt", result["publishers"][3]["error"])
        self.assertEqual(result["publishers"][0]["feed"], 3)
        self.assertEqual(result["publishers"][0]["matched"], 1)
        self.assertEqual(result["publishers"][0]["dropped"], 2)
        self.assertEqual(result["publishers"][1]["matched"], 1)
        self.assertEqual(len(result["items"]), 1)
        self.assertTrue(all("news.google.com" not in url for url in urls))
        self.assertEqual(result["items"][0]["url"], "https://example.test/a")
        self.assertEqual(result["items"][0]["title"], "Subway store count falls")
        self.assertEqual(len(parse_rss_items(xml)), 3)

    def test_deeper_uploads_page_to_200_and_skip_cached_videos(self):
        quota = Quota(used=0)
        calls = []

        def transport(request):
            calls.append(request["kind"])
            if request["kind"] == "youtube.channel":
                return {"channel_id": "UC1", "channel_title": "Sample Channel", "uploads": "UU1"}
            if request["kind"] == "youtube.playlist":
                page = request.get("page_token") or "0"
                start = int(page) * 50
                ids = ["v" + str(index) for index in range(start, start + 50)]
                nxt = "" if start + 50 >= 250 else str(int(page) + 1)
                return {"ids": ids, "next_page_token": nxt}
            if request["kind"] == "youtube.videos":
                self.assertLessEqual(len(request["ids"]), 50)
                return {"videos": [{
                    "video_id": video_id,
                    "title": "Why the stores failed",
                    "description": "stores closed",
                    "views": 3,
                } for video_id in request["ids"]]}
            raise AssertionError(request["kind"])

        cache = {}
        videos, stopped = collect_channel_uploads([{"channel_id": "UC1"}], quota, transport, cache)
        self.assertFalse(stopped)
        self.assertEqual(len(videos), 200)
        self.assertEqual(calls.count("youtube.playlist"), 4)
        self.assertEqual(calls.count("youtube.videos"), 4)
        self.assertNotIn("youtube.search", calls)
        self.assertEqual(quota.used, 9)
        second_calls = []

        def cached_transport(request):
            second_calls.append(request["kind"])
            if request["kind"] == "youtube.playlist":
                page = request.get("page_token") or "0"
                start = int(page) * 50
                ids = ["v" + str(index) for index in range(start, start + 50)]
                nxt = "" if start + 50 >= 200 else str(int(page) + 1)
                return {"ids": ids, "next_page_token": nxt}
            raise AssertionError(request["kind"])

        again, stopped = collect_channel_uploads([{"channel_id": "UC1"}], Quota(used=0), cached_transport, cache)
        self.assertFalse(stopped)
        self.assertEqual(len(again), 200)
        self.assertEqual(second_calls, ["youtube.playlist", "youtube.playlist", "youtube.playlist", "youtube.playlist"])

    def test_news_story_resolves_to_a_real_article_sentence(self):
        import base64
        article = "https://www.restaurantdive.com/news/subway-closed-729-stores-in-2025"
        raw = b"\x08\x13\x22" + bytes([len(article)]) + article.encode()
        token = base64.urlsafe_b64encode(raw).decode().rstrip("=")
        url = "https://news.google.com/rss/articles/" + token
        self.assertEqual(decode_google_news_url(url), article)
        found, stats = prove_store_counts(
            [{"url": url, "name": "Google News"}],
            "Subway",
            resolve=lambda item: article,
            fetch_text=lambda item: ("Subway closed at least 729 stores in 2025. The report is from 1851 Franchise.", ""),
            allows=lambda item: True,
        )
        self.assertEqual(stats["resolved"], 1)
        self.assertEqual(stats["blocked"], 0)
        self.assertEqual(found[0]["number"], "729")
        self.assertEqual(found[0]["year"], "2025")
        self.assertEqual(found[0]["label"], "CLOSURES")
        self.assertEqual(found[0]["url"], article)
        self.assertIn("729 stores in 2025", found[0]["sentence"])
        self.assertNotIn("Confirmed", " ".join(item.get("label") or "" for item in found))

    def test_title_patterns_name_length_and_the_publish_gap(self):
        lines = " ".join(title_pattern_lines([
            {"title": "Why the stores failed", "duration_seconds": 600, "published_at": "2024-01-01T00:00:00Z"},
            {"title": "Why the price fell", "duration_seconds": 900, "published_at": "2024-01-11T00:00:00Z"},
            {"title": "The decline of the chain", "duration_seconds": 1200, "published_at": "2024-02-01T00:00:00Z"},
        ]))
        self.assertIn("why (2 of 3)", lines)
        self.assertIn("the decline of (1 of 3)", lines)
        self.assertIn("900 seconds", lines)
        self.assertIn("span 31 days", lines)
        self.assertIn("21 days", lines)

    def test_comment_themes_count_same_topic_words(self):
        lines = "\n".join(comment_themes([{
            "title": "The Decline of Subway",
            "comments": [
                {"text": "The price went up after the $5 footlong ended."},
                {"text": "The portion size shrank and the royalty fee stayed."},
                {"text": "The owner profit was thin."},
                {"text": "I bought a coffee."},
            ],
        }]))
        self.assertIn("Read 4 same-topic comments.", lines)
        self.assertIn("price went up: 1 of 4", lines)
        self.assertIn("$5 footlong: 1 of 4", lines)
        self.assertIn("portion size: 1 of 4", lines)
        self.assertIn("royalty or fees: 1 of 4", lines)
        self.assertIn("owner profit: 1 of 4", lines)
        self.assertIn("The price went up after the $5 footlong ended.", lines)
        self.assertIn("The portion size shrank and the royalty fee stayed.", lines)
        self.assertIn("The owner profit was thin.", lines)
        self.assertIn("Comments are opinions. They are not proof.", lines)
        self.assertNotIn("coffee", lines)
        notes = compile_dossier("Subway", [], "", [])
        self.assertNotIn("Other brands:", notes["text"])
        self.assertIn("News with real links:", notes["text"])

    def test_daily_refresh_reads_the_newest_page_only(self):
        calls = []

        def transport(request):
            calls.append(request["kind"])
            if request["kind"] == "youtube.channel":
                return {"channel_id": "UC_Z", "channel_title": "Sample Two", "uploads": "UUZ"}
            if request["kind"] == "youtube.playlist":
                self.assertFalse(request.get("page_token"))
                return {"ids": ["v" + str(index) for index in range(29)], "next_page_token": ""}
            if request["kind"] == "youtube.videos":
                return {"videos": [{
                    "video_id": video_id,
                    "title": "Why stores closed",
                    "description": "stores closed",
                    "views": 1,
                    "duration_seconds": 100,
                } for video_id in request["ids"]]}
            raise AssertionError(request["kind"])

        cache = {}
        videos, stopped = collect_channel_uploads(
            [{"channel_id": "UC_Z"}],
            Quota(0),
            transport,
            cache,
            refresh_pages=1,
        )
        self.assertFalse(stopped)
        self.assertEqual(len(videos), 29)
        self.assertEqual(calls.count("youtube.playlist"), 1)
        self.assertEqual(cache["youtube.upload_totals"]["UC_Z"]["on_page"], 29)
        self.assertFalse(cache["youtube.upload_totals"]["UC_Z"]["more"])

    def test_pdf_link_reads_text_and_says_when_it_is_a_scan(self):
        import threading
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

        def tiny_pdf(sentence):
            if sentence:
                stream = ("BT (" + sentence + ") Tj ET").encode("latin1")
            else:
                stream = b"\x00\x01scan"
            return b"%PDF-1.4\n4 0 obj<< /Length " + str(len(stream)).encode() + b" >>stream\n" + stream + b"\nendstream\nendobj\n%%EOF"

        files = {
            "/robots.txt": (b"User-agent: *\nAllow: /\n", "text/plain"),
            "/text.pdf": (tiny_pdf("Subway had 37,000 stores in 2023."), "application/pdf"),
            "/scan.pdf": (tiny_pdf(""), "application/pdf"),
        }

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                body, kind = files.get(self.path, (b"", ""))
                if not kind:
                    self.send_response(404)
                    self.end_headers()
                    return
                self.send_response(200)
                self.send_header("Content-Type", kind)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, fmt, *args):
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        port = server.server_address[1]
        try:
            text = check_pasted_page("http://127.0.0.1:" + str(port) + "/text.pdf", "37,000", "Subway stores")
            scan = check_pasted_page("http://127.0.0.1:" + str(port) + "/scan.pdf", "37,000", "Subway stores")
        finally:
            server.shutdown()
            server.server_close()
        self.assertTrue(text["confirmed"])
        self.assertIn("37,000", text["sentence"])
        self.assertIn("2023", text["sentence"])
        self.assertFalse(scan["confirmed"])
        self.assertEqual(scan["reason"], "This PDF is a scan with no text.")


if __name__ == "__main__":
    unittest.main()
