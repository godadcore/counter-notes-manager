import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "../src/config.js";
import { createDb, databasePath, databaseUrl } from "./sql.js";
import { researchHeaders } from "./passcode.js";
import { splitSeries } from "../src/engine/series.js";
import { findingsForTopic, readyBlockReason } from "./numbers.js";
import { loadBlueprintTopics } from "./seed.js";

const STATUSES = new Set(["queued", "scripted", "ready", "posted"]);

function databaseTarget(file) {
  if (file == null || file === "") return databaseUrl();
  const text = String(file);
  if (text === ":memory:") return "file::memory:";
  if (text.startsWith("file:") || text.startsWith("libsql:") || text.startsWith("https:")) return text;
  return pathToFileURL(text).href;
}

export async function openDatabase(file) {
  const url = databaseTarget(file);
  const db = await createDb(url);
  await db.exec("PRAGMA foreign_keys = ON");
  await migrate(db);
  const count = (await db.prepare("SELECT COUNT(*) AS count FROM topics").get()).count;
  if (Number(count) === 0) await importSeed(db, loadBlueprintTopics());
  if (process.env.COUNTER_NOTES_DEMO === "1") await applySampleNiche(db);
  return db;
}

export function databaseFile() {
  return databasePath();
}

async function applySampleNiche(db) {
  const saved = JSON.parse(await getConfig(db, "niche_channels") || "[]");
  if (saved.length) return;
  const sample = JSON.parse(readFileSync(join(process.cwd(), "data", "sample-demo.json"), "utf8"));
  await setNiche(db, sample);
}

let singleton;
export async function database() {
  if (!singleton) singleton = openDatabase(databaseUrl());
  return singleton;
}

async function migrate(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      short TEXT NOT NULL,
      title TEXT NOT NULL,
      tier TEXT,
      length TEXT,
      summary TEXT,
      keywords TEXT,
      angle TEXT,
      claim TEXT,
      thumb TEXT,
      scene TEXT,
      rival TEXT,
      status TEXT NOT NULL DEFAULT 'queued'
    );
    CREATE TABLE IF NOT EXISTS findings (
      id INTEGER PRIMARY KEY,
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      label TEXT NOT NULL,
      number_text TEXT NOT NULL,
      source_url TEXT,
      source_name TEXT,
      source_date TEXT,
      hold INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY,
      at TEXT NOT NULL,
      action TEXT NOT NULL,
      topic_id INTEGER,
      detail TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS channel_stats (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      subscribers INTEGER NOT NULL,
      watch_hours REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const columns = (await db.prepare("PRAGMA table_info(findings)").all()).map((column) => column.name);
  if (!columns.includes("source_name")) await db.exec("ALTER TABLE findings ADD COLUMN source_name TEXT");
  if (!columns.includes("source_date")) await db.exec("ALTER TABLE findings ADD COLUMN source_date TEXT");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS series (
      topic_id INTEGER PRIMARY KEY REFERENCES topics(id),
      decision TEXT NOT NULL,
      depth INTEGER NOT NULL,
      runtime INTEGER NOT NULL,
      complexity INTEGER NOT NULL,
      because TEXT NOT NULL,
      cadence INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS series_parts (
      id INTEGER PRIMARY KEY,
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      part_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      hook TEXT NOT NULL,
      key_points TEXT NOT NULL,
      cliffhanger TEXT NOT NULL,
      week_day INTEGER NOT NULL,
      UNIQUE(topic_id, part_index)
    );
    CREATE TABLE IF NOT EXISTS video_performance (
      topic_id INTEGER PRIMARY KEY REFERENCES topics(id),
      ctr REAL NOT NULL,
      impressions INTEGER NOT NULL,
      avg_view_duration REAL NOT NULL,
      retention TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dossiers (
      topic_id INTEGER PRIMARY KEY REFERENCES topics(id),
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
      description TEXT,
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
  `);
  const defaults = {
    cadence: String(config.cadence.default),
    days: "{}",
    thresholds: JSON.stringify(config.thresholds),
    local_import_done: "0",
    browser_tools_import_done: "0",
    fact_checks: "{}",
    prompt_queue: "[]",
    topic_weights: JSON.stringify({ demand: 1, freshness: 1, fit: 1, competition: 1 }),
    numbers_inputs: "{}",
    tool_name: config.video.toolName,
    max_clip_seconds: String(config.video.maxClipSeconds),
    detail_level: config.video.detail,
    niche_keywords: "[]",
    niche_channels: "[]"
  };
  const insert = db.prepare("INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING");
  for (const [key, value] of Object.entries(defaults)) (await insert.run(key, value));
}

export async function importSeed(db, topics) {
  const insertTopic = db.prepare(`
    INSERT INTO topics (id, short, title, tier, length, summary, keywords, angle, claim, thumb, scene, rival, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')
  `);
  const insertFinding = db.prepare(`
    INSERT INTO findings (topic_id, label, number_text, source_url, hold)
    VALUES (?, ?, ?, NULL, 1)
  `);
  await db.exec("BEGIN");
  try {
    let numbers = 0;
    for (const topic of topics) {
      (await insertTopic.run(topic.id, topic.short, topic.title, topic.tier || "", topic.length || "", topic.summary || "", topic.keywords || "", topic.angle || "", topic.claim || "", topic.thumb || "", topic.scene || "", topic.rival || ""));
      for (const finding of findingsForTopic(topic)) {
        (await insertFinding.run(topic.id, finding.label, finding.numberText));
        numbers += 1;
      }
    }
    await writeLog(db, "import", null, "Imported " + topics.length + " topics. " + numbers + " numbers are on hold.");
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

async function getConfig(db, key) {
  return (await db.prepare("SELECT value FROM config WHERE key = ?").get(key))?.value ?? "";
}

async function setConfig(db, key, value) {
  (await db.prepare("INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value));
}

async function writeLog(db, action, topicId, detail) {
  (await db.prepare("INSERT INTO audit_log (at, action, topic_id, detail) VALUES (?, ?, ?, ?)").run(new Date().toISOString(), action, topicId ?? null, detail));
}

async function topicFindings(db, topicId) {
  return (await db.prepare("SELECT * FROM findings WHERE topic_id = ?").all(topicId)).map(mapFinding);
}

export async function setStatus(db, id, status) {
  if (!STATUSES.has(status)) throw new Error("Unknown status.");
  const topic = (await db.prepare("SELECT id, short FROM topics WHERE id = ?").get(id));
  if (!topic) throw new Error("Unknown topic.");
  if (status === "ready") {
    const reason = readyBlockReason(await topicFindings(db, id));
    if (reason) {
      const error = new Error(reason);
      error.code = "HOLD";
      throw error;
    }
  }
  (await db.prepare("UPDATE topics SET status = ? WHERE id = ?").run(status, id));
  await writeLog(db, "status", id, topic.short + " set to " + status);
}

export async function setCadence(db, value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number < config.cadence.min || number > config.cadence.max) {
    throw new Error("Cadence must be from 4 to 7.");
  }
  await setConfig(db, "cadence", String(number));
  await writeLog(db, "status", null, "Cadence set to " + number);
}

export async function setDay(db, day, done) {
  const number = Number(day);
  if (!Number.isInteger(number) || number < 1 || number > 30) throw new Error("Unknown day.");
  const days = JSON.parse(await getConfig(db, "days") || "{}");
  if (done) days[String(number)] = true;
  else delete days[String(number)];
  await setConfig(db, "days", JSON.stringify(days));
}

export async function reviewFinding(db, id, input) {
  const row = (await db.prepare("SELECT id, topic_id, number_text FROM findings WHERE id = ?").get(id));
  if (!row) throw new Error("Unknown number.");
  const url = String(input.sourceUrl || "").trim();
  const name = String(input.sourceName || "").trim();
  const date = String(input.sourceDate || "").trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw new Error("Paste a full http or https link.");
  if (input.accept) {
    if (!url || !name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Accept needs a source link, a source name, and a date.");
    }
    (await db.prepare("UPDATE findings SET source_url = ?, source_name = ?, source_date = ?, hold = 0 WHERE id = ?").run(url, name, date, id));
    await writeLog(db, "link", row.topic_id, "Accepted " + row.number_text + " from " + name + " on " + date + " " + url);
    return;
  }
  (await db.prepare("UPDATE findings SET source_url = ?, source_name = ?, source_date = ?, hold = 1 WHERE id = ?").run(url || null, name || null, date || null, id));
}

export async function setQueue(db, queue) {
  if (!Array.isArray(queue)) throw new Error("Queue must be a list.");
  await setConfig(db, "prompt_queue", JSON.stringify(queue.slice(0, 30)));
}

export async function setFactCheck(db, videoId, key, checked) {
  const checks = JSON.parse(await getConfig(db, "fact_checks") || "{}");
  const id = String(videoId) + ":" + key;
  if (checked) checks[id] = true;
  else delete checks[id];
  await setConfig(db, "fact_checks", JSON.stringify(checks));
}

export async function setWeights(db, weights) {
  const next = {
    demand: Number(weights.demand) || 1,
    freshness: Number(weights.freshness) || 1,
    fit: Number(weights.fit) || 1,
    competition: Number(weights.competition) || 1
  };
  await setConfig(db, "topic_weights", JSON.stringify(next));
}

export async function setNumbersInputs(db, inputs) {
  await setConfig(db, "numbers_inputs", JSON.stringify(inputs || {}));
}

export async function importBrowserTools(db, payload) {
  await db.exec("BEGIN");
  try {
    if (await getConfig(db, "browser_tools_import_done") === "1") {
      await db.exec("COMMIT");
      return { imported: false };
    }
    if (Array.isArray(payload.queue)) await setConfig(db, "prompt_queue", JSON.stringify(payload.queue.slice(0, 30)));
    if (payload.factChecks && typeof payload.factChecks === "object") {
      await setConfig(db, "fact_checks", JSON.stringify(payload.factChecks));
    }
    await setConfig(db, "browser_tools_import_done", "1");
    await writeLog(db, "import", null, "Imported fact checks and the prompt queue once.");
    await db.exec("COMMIT");
    return { imported: true };
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function checkPastedLink(db, id, input) {
  const row = (await db.prepare("SELECT id, topic_id, number_text, label FROM findings WHERE id = ?").get(id));
  if (!row) throw new Error("Unknown number.");
  const url = String(input.sourceUrl || "").trim();
  if (!/^https?:\/\/\S+$/i.test(url)) throw new Error("Paste a full http or https link.");
  let response;
  try {
    response = await fetch("http://127.0.0.1:8765/check-link", {
      method: "POST",
      headers: researchHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ url, number: row.number_text, claim: row.label })
    });
  } catch {
    throw new Error("The research service is not running. Start it from the ml folder.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The page could not be read.");
  if (!data.confirmed) throw new Error(data.reason || "Left as check this.");
  const date = new Date().toISOString().slice(0, 10);
  const name = String(data.name || "").trim() || "Link";
  const claim = String(data.claim || "").trim();
  if (!claim) throw new Error("The number is not next to a year. Left as check this.");
  (await db.prepare("UPDATE findings SET source_url = ?, source_name = ?, source_date = ?, hold = 0, label = ? WHERE id = ?").run(data.url || url, name, date, claim, id));
  await writeLog(db, "link", row.topic_id, "Checked " + row.number_text + " on " + url + ". Claim is now: " + claim);
}

export async function setFindingUrl(db, id, sourceUrl) {
  const row = (await db.prepare("SELECT id, topic_id, number_text FROM findings WHERE id = ?").get(id));
  if (!row) throw new Error("Unknown number.");
  const clean = String(sourceUrl || "").trim();
  if (clean && !/^https?:\/\/\S+$/i.test(clean)) throw new Error("Paste a full http or https link.");
  (await db.prepare("UPDATE findings SET source_url = ?, hold = ? WHERE id = ?").run(clean || null, clean ? 0 : 1, id));
  if (clean) await writeLog(db, "link", row.topic_id, row.number_text + " " + clean);
}

export async function addStat(db, input) {
  const date = String(input.date || "");
  const subscribers = Number(input.subscribers);
  const watchHours = Number(input.watchHours);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Use a date like 2026-11-23.");
  if (!Number.isInteger(subscribers) || subscribers < 0) throw new Error("Subscribers must be a whole number.");
  if (!Number.isFinite(watchHours) || watchHours < 0) throw new Error("Watch hours must be a number.");
  (await db.prepare(`
    INSERT INTO channel_stats (date, subscribers, watch_hours) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET subscribers = excluded.subscribers, watch_hours = excluded.watch_hours
  `).run(date, subscribers, watchHours));
  await writeLog(db, "status", null, "Saved channel numbers for " + date);
}

export async function logEvent(db, input) {
  const action = input.action === "link" ? "link" : "copy";
  const topicId = Number.isInteger(Number(input.topicId)) ? Number(input.topicId) : null;
  const detail = String(input.detail || "").trim();
  if (!detail) throw new Error("Nothing to record.");
  await writeLog(db, action, topicId, detail.slice(0, 500));
}

export async function importLocal(db, payload) {
  await db.exec("BEGIN");
  try {
    if (await getConfig(db, "local_import_done") === "1") {
      await db.exec("COMMIT");
      return { imported: false };
    }
    const statuses = payload.statuses && typeof payload.statuses === "object" ? payload.statuses : {};
    for (const [id, status] of Object.entries(statuses)) {
      if (!STATUSES.has(status) || status === "ready") continue;
      const topic = (await db.prepare("SELECT id FROM topics WHERE id = ?").get(Number(id)));
      if (topic) (await db.prepare("UPDATE topics SET status = ? WHERE id = ?").run(status, Number(id)));
    }
    for (const [id, status] of Object.entries(statuses)) {
      if (status !== "ready") continue;
      try {
        await setStatus(db, Number(id), "ready");
      } catch (error) {
        if (error.code !== "HOLD") throw error;
      }
    }
    if (payload.cadence != null && payload.cadence !== "") {
      const number = Math.round(Number(payload.cadence));
      if (number >= config.cadence.min && number <= config.cadence.max) await setConfig(db, "cadence", String(number));
    }
    if (payload.days && typeof payload.days === "object") {
      const days = {};
      for (const [day, done] of Object.entries(payload.days)) {
        const number = Number(day);
        if (done && Number.isInteger(number) && number >= 1 && number <= 30) days[String(number)] = true;
      }
      await setConfig(db, "days", JSON.stringify(days));
    }
    await setConfig(db, "local_import_done", "1");
    await writeLog(db, "import", null, "Imported saved browser data once.");
    await db.exec("COMMIT");
    return { imported: true };
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

function mapFinding(row) {
  return {
    id: row.id,
    topicId: row.topic_id,
    label: row.label,
    numberText: row.number_text,
    sourceUrl: row.source_url || "",
    sourceName: row.source_name || "",
    sourceDate: row.source_date || "",
    hold: row.hold === 1
  };
}

function mapSeries(row, parts) {
  return {
    topicId: row.topic_id,
    decision: row.decision,
    depth: row.depth,
    runtime: row.runtime,
    complexity: row.complexity,
    cadence: row.cadence,
    because: row.because,
    parts: parts.filter((part) => part.topic_id === row.topic_id).map((part) => ({
      index: part.part_index,
      title: part.title,
      hook: part.hook,
      keyPoints: JSON.parse(part.key_points),
      cliffhanger: part.cliffhanger,
      weekDay: part.week_day
    }))
  };
}

export async function readSeries(db) {
  const rows = (await db.prepare("SELECT * FROM series ORDER BY topic_id").all());
  const parts = (await db.prepare("SELECT * FROM series_parts ORDER BY topic_id, part_index").all());
  return rows.map((row) => mapSeries(row, parts));
}

export async function saveSplit(db, topicId) {
  const topic = (await db.prepare("SELECT * FROM topics WHERE id = ?").get(topicId));
  if (!topic) throw new Error("Unknown topic.");
  const cadence = Number(await getConfig(db, "cadence")) || config.cadence.default;
  const result = splitSeries(topic, cadence);
  await db.exec("BEGIN");
  try {
    (await db.prepare(`
      INSERT INTO series (topic_id, decision, depth, runtime, complexity, because, cadence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(topic_id) DO UPDATE SET
        decision = excluded.decision,
        depth = excluded.depth,
        runtime = excluded.runtime,
        complexity = excluded.complexity,
        because = excluded.because,
        cadence = excluded.cadence
    `).run(topicId, result.decision, result.reasoning.depth, result.reasoning.runtime, result.reasoning.complexity, result.reasoning.because, cadence));
    (await db.prepare("DELETE FROM series_parts WHERE topic_id = ?").run(topicId));
    const insert = db.prepare(`
      INSERT INTO series_parts (topic_id, part_index, title, hook, key_points, cliffhanger, week_day)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const part of result.parts) {
      (await insert.run(topicId, part.index, part.title, part.hook, JSON.stringify(part.keyPoints), part.cliffhanger, part.weekDay));
    }
    const detail = result.decision === "series"
      ? topic.short + " split into " + result.parts.length + " parts"
      : topic.short + " kept as one video";
    await writeLog(db, "series", topicId, detail);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function setVideoSettings(db, input) {
  const toolName = String(input.toolName || "").trim() || "generic";
  const maxClip = Math.round(Number(input.maxClipSeconds));
  if (!Number.isFinite(maxClip) || maxClip < 1 || maxClip > 60) throw new Error("Max clip must be from 1 to 60 seconds.");
  const detail = input.detail === "high" ? "high" : "normal";
  await setConfig(db, "tool_name", toolName);
  await setConfig(db, "max_clip_seconds", String(maxClip));
  await setConfig(db, "detail_level", detail);
}

export async function setPerformance(db, input) {
  const topicId = Number(input.topicId);
  const topic = (await db.prepare("SELECT id, short FROM topics WHERE id = ?").get(topicId));
  if (!topic) throw new Error("Unknown topic.");
  const ctr = Number(input.ctr);
  const impressions = Number(input.impressions);
  const avgViewDuration = Number(input.avgViewDuration);
  if (![ctr, impressions, avgViewDuration].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("CTR, impressions, and average view duration need numbers that are zero or higher.");
  }
  const raw = Array.isArray(input.retention)
    ? input.retention
    : String(input.retention || "").split(/[,\s]+/).filter((piece) => piece.trim() !== "");
  const retention = raw.map((value) => Number(value));
  if (retention.some((value) => !Number.isFinite(value))) throw new Error("Retention curve needs numbers.");
  (await db.prepare(`
    INSERT INTO video_performance (topic_id, ctr, impressions, avg_view_duration, retention)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(topic_id) DO UPDATE SET
      ctr = excluded.ctr,
      impressions = excluded.impressions,
      avg_view_duration = excluded.avg_view_duration,
      retention = excluded.retention
  `).run(topicId, ctr, Math.round(impressions), avgViewDuration, JSON.stringify(retention)));
  await writeLog(db, "stats", topicId, topic.short + " performance saved");
}

export async function setNiche(db, input) {
  const keywords = Array.isArray(input?.keywords) ? input.keywords.map((item) => String(item).trim()).filter(Boolean) : [];
  const channels = Array.isArray(input?.channels) ? input.channels.map((item) => String(item).trim()).filter(Boolean) : [];
  await setConfig(db, "niche_keywords", JSON.stringify(keywords));
  await setConfig(db, "niche_channels", JSON.stringify(channels));
  await writeLog(db, "research", null, "Niche profile saved");
}

export async function ignoreWinner(db, input) {
  const videoId = String((input && input.videoId) || "").trim();
  const topicId = Number(input && input.topicId);
  if (!videoId || !topicId) throw new Error("Name the video and the topic.");
  let response;
  try {
    response = await fetch("http://127.0.0.1:8765/ignore", {
      method: "POST",
      headers: researchHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ videoId, topicId })
    });
  } catch {
    throw new Error("The research service is not running. Start it from the ml folder.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "That video could not be ignored.");
  await writeLog(db, "ignore", topicId, "Ignored " + videoId);
  return await readState(db);
}

export async function restoreWinner(db, input) {
  const videoId = String((input && input.videoId) || "").trim();
  const topicId = Number(input && input.topicId);
  if (!videoId || !topicId) throw new Error("Name the video and the topic.");
  let response;
  try {
    response = await fetch("http://127.0.0.1:8765/restore", {
      method: "POST",
      headers: researchHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ videoId, topicId })
    });
  } catch {
    throw new Error("The research service is not running. Start it from the ml folder.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "That video could not be brought back.");
  await writeLog(db, "restore", topicId, "Brought back " + videoId);
  return await readState(db);
}

export async function startResearch(topicId) {
  let response;
  try {
    response = await fetch("http://127.0.0.1:8765/run", {
      method: "POST",
      headers: researchHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ topicId: topicId || null }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new Error("The research service is not running. Start it from the ml folder.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Research did not start.");
  return data;
}

export async function researchJob() {
  const response = await fetch("http://127.0.0.1:8765/status", {
    headers: researchHeaders(),
    signal: AbortSignal.timeout(1500)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Research status failed.");
  return data;
}

async function ignoredVideos(db) {
  const table = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ignored_videos'").get());
  if (!table) return [];
  const videos = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'lookalike_videos'").get());
  if (!videos) {
    return (await db.prepare("SELECT video_id AS videoId, video_id AS title, '' AS channel FROM ignored_videos ORDER BY created_at").all());
  }
  return (await db.prepare(`
    SELECT i.video_id AS videoId,
           COALESCE(v.title, i.video_id) AS title,
           COALESCE(v.channel_title, '') AS channel
    FROM ignored_videos i
    LEFT JOIN lookalike_videos v ON v.video_id = i.video_id
    ORDER BY i.created_at
  `).all());
}

export async function readState(db) {
  const ignored = await ignoredVideos(db);
  return {
    topics: (await db.prepare("SELECT * FROM topics ORDER BY id").all()),
    findings: (await db.prepare("SELECT * FROM findings ORDER BY topic_id, id").all()).map(mapFinding),
    stats: (await db.prepare("SELECT id, date, subscribers, watch_hours AS watchHours FROM channel_stats ORDER BY date DESC").all()),
    log: (await db.prepare("SELECT id, at, action, topic_id AS topicId, detail FROM audit_log ORDER BY id DESC LIMIT 200").all()),
    cadence: Number(await getConfig(db, "cadence")),
    days: JSON.parse(await getConfig(db, "days") || "{}"),
    thresholds: JSON.parse(await getConfig(db, "thresholds") || "{}"),
    factChecks: JSON.parse(await getConfig(db, "fact_checks") || "{}"),
    queue: JSON.parse(await getConfig(db, "prompt_queue") || "[]"),
    weights: JSON.parse(await getConfig(db, "topic_weights") || "{}"),
    numbersInputs: JSON.parse(await getConfig(db, "numbers_inputs") || "{}"),
    series: await readSeries(db),
    videoSettings: {
      toolName: await getConfig(db, "tool_name") || "generic",
      maxClipSeconds: Number(await getConfig(db, "max_clip_seconds") || 8),
      detail: await getConfig(db, "detail_level") || "normal"
    },
    performance: (await db.prepare("SELECT topic_id AS topicId, ctr, impressions, avg_view_duration AS avgViewDuration, retention FROM video_performance ORDER BY topic_id").all()).map((row) => ({
      ...row,
      retention: JSON.parse(row.retention || "[]")
    })),
    niche: {
      keywords: JSON.parse(await getConfig(db, "niche_keywords") || "[]"),
      channels: JSON.parse(await getConfig(db, "niche_channels") || "[]")
    },
    dossiers: (await db.prepare("SELECT topic_id AS topicId, body, updated_at AS updatedAt FROM dossiers ORDER BY topic_id").all()).map((row) => {
      let body = null;
      try { body = JSON.parse(row.body); } catch { body = null; }
      return { ...(body || {}), ignored, topicId: row.topicId, updatedAt: row.updatedAt };
    })
  };
}
