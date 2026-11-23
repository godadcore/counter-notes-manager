import assert from "node:assert/strict";
import test from "node:test";
import { importLocal, openDatabase, readState, saveSplit, setFindingUrl, setStatus } from "./db.js";
import { findingsForTopic, readyBlockReason } from "./numbers.js";
import { allowsPasscode } from "./passcode.js";
import { topicsFromBlueprint } from "./seed.js";
import { isUnverified } from "../src/status.js";

const sample = `
const VIDEOS = [
  { id: 1, short: "Subway", tier: "High", length: "9 min", title: "Why Subway Went From 44,000 Stores to Closing Thousands", summary: "The end of the $5 footlong.", keywords: "", angle: "Subway passed 44,000 locations.", claim: "Store count near 44,000 and the $5 footlong.", thumb: "WHY", scene: "a $5 price tag", rival: "rivals" }
];
const WEEKS = [];
`;

test("blueprint text yields topics and every number starts on hold", async () => {
  const topics = topicsFromBlueprint(sample + "\n");
  const findings = findingsForTopic(topics[0]);
  assert.ok(findings.some((item) => item.numberText.includes("44,000") || item.numberText.includes("44000")));
  assert.ok(findings.some((item) => item.numberText.includes("$5") || item.numberText === "5"));
  assert.equal(findings.some((item) => String(item.label || "").toLowerCase().startsWith("length:")), false);
  const db = await openDatabase(":memory:");
  const state = await db.prepare("SELECT COUNT(*) AS count FROM topics").get();
  assert.equal(Number(state.count), 30);
  const holds = await db.prepare("SELECT COUNT(*) AS count FROM findings WHERE hold = 1 AND source_url IS NULL").get();
  const all = await db.prepare("SELECT COUNT(*) AS count FROM findings").get();
  assert.ok(Number(all.count) > 30);
  assert.equal(Number(holds.count), Number(all.count));
  const subway = (await db.prepare("SELECT number_text FROM findings WHERE topic_id = 1").all()).map((row) => row.number_text);
  assert.ok(subway.some((value) => value.replace(/,/g, "") === "44000" || value.includes("44,000")));
});

test("ready is blocked until every number has a source URL", async () => {
  const db = await openDatabase(":memory:");
  await assert.rejects(() => setStatus(db, 1, "ready"), (error) => error.code === "HOLD");
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 1").get()).status, "queued");
  const rows = await db.prepare("SELECT id FROM findings WHERE topic_id = 1").all();
  for (const row of rows) await setFindingUrl(db, row.id, "https://example.com/source");
  const readyRows = (await db.prepare("SELECT hold, source_url AS sourceUrl FROM findings WHERE topic_id = 1").all()).map((row) => ({ hold: row.hold === 1, sourceUrl: row.sourceUrl }));
  assert.equal(readyBlockReason(readyRows), "");
  await setStatus(db, 1, "ready");
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 1").get()).status, "ready");
});

test("browser data imports once and does not skip the source gate", async () => {
  const db = await openDatabase(":memory:");
  const first = await importLocal(db, { statuses: { 1: "scripted", 2: "ready" }, cadence: 6, days: { 3: true, 99: true } });
  assert.equal(first.imported, true);
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 1").get()).status, "scripted");
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 2").get()).status, "queued");
  assert.equal((await db.prepare("SELECT value FROM config WHERE key = 'cadence'").get()).value, "6");
  assert.deepEqual(JSON.parse((await db.prepare("SELECT value FROM config WHERE key = 'days'").get()).value), { 3: true });
  const second = await importLocal(db, { cadence: 4, statuses: { 1: "posted" } });
  assert.equal(second.imported, false);
  assert.equal((await db.prepare("SELECT value FROM config WHERE key = 'cadence'").get()).value, "6");
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 1").get()).status, "scripted");
});

test("posted with held numbers is allowed and marked unverified", async () => {
  const db = await openDatabase(":memory:");
  await setStatus(db, 7, "posted");
  const findings = (await db.prepare("SELECT hold FROM findings WHERE topic_id = 7").all()).map((row) => ({ hold: row.hold === 1 }));
  assert.equal(isUnverified("posted", findings), true);
  assert.equal(isUnverified("queued", findings), false);
  assert.equal(isUnverified("ready", [{ hold: false }]), false);
  assert.equal((await db.prepare("SELECT status FROM topics WHERE id = 7").get()).status, "posted");
});

test("the passcode is required on every address, including this computer", () => {
  assert.equal(allowsPasscode({ remoteAddress: "127.0.0.1", header: "", expected: "secret" }), false);
  assert.equal(allowsPasscode({ remoteAddress: "::1", header: "", expected: "secret" }), false);
  assert.equal(allowsPasscode({ remoteAddress: "192.168.1.20", header: "", expected: "secret" }), false);
  assert.equal(allowsPasscode({ remoteAddress: "192.168.1.20", header: "nope", expected: "secret" }), false);
  assert.equal(allowsPasscode({ remoteAddress: "127.0.0.1", header: "secret", expected: "secret" }), true);
  assert.equal(allowsPasscode({ header: "secret", expected: "" }), false);
});

test("a series is stored and a single video stores no parts", async () => {
  const db = await openDatabase(":memory:");
  await saveSplit(db, 4);
  const costco = (await readState(db)).series.find((item) => item.topicId === 4);
  assert.equal(costco.decision, "one video");
  assert.equal(costco.parts.length, 0);
  await saveSplit(db, 9);
  const sears = (await readState(db)).series.find((item) => item.topicId === 9);
  assert.equal(sears.decision, "series");
  assert.deepEqual(sears.parts.map((part) => part.weekDay), [1, 3, 4]);
  assert.equal(sears.parts[0].keyPoints.length, 3);
  await saveSplit(db, 3);
  const pizza = (await readState(db)).series.find((item) => item.topicId === 3);
  assert.equal(pizza.decision, "series");
  assert.equal(pizza.parts.length, 2);
  const log = (await db.prepare("SELECT detail FROM audit_log WHERE action = 'series' ORDER BY id").all()).map((row) => row.detail);
  assert.deepEqual(log, ["Costco kept as one video", "Sears split into 3 parts", "Pizza Hut split into 2 parts"]);
});
