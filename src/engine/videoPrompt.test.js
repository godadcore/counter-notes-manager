import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER_BLOCK, buildScenePrompt, scorecard, shotTimeline, unsourcedNumbers, videoLocked } from "./videoPrompt.js";
import { weeklyReview } from "./review.js";

const topic = {
  title: "Why the Corner Shop Kept One Price",
  length: "1 min",
  angle: "One sourced price explains the counter.",
  rival: "the chain next door",
  claim: "The shelf price held.",
  thumb: "ONE PRICE HELD",
  scene: "a counter and a yellow price tag",
  short: "Corner",
  keywords: "corner shop, price"
};

const sourced = [{
  numberText: "$2",
  label: "shelf price",
  sourceUrl: "https://example.com/price",
  sourceName: "City filing",
  sourceDate: "2024-01-02",
  hold: false
}];

test("a fully sourced topic builds shots that fit the runtime and the character block", () => {
  const doc = buildScenePrompt(topic, sourced, { toolName: "generic", maxClipSeconds: 8, detail: "normal" });
  assert.equal(doc.locked, false);
  assert.equal(doc.toolName, "generic");
  const sum = doc.shots.reduce((total, shot) => total + (shot.end - shot.start), 0);
  assert.equal(sum, 60);
  assert.equal(shotTimeline(60, 8).length, doc.shots.length);
  for (const shot of doc.shots) {
    assert.equal(shot.end - shot.start <= 8, true);
    assert.equal(shot.character, CHARACTER_BLOCK);
    assert.equal(shot.text.includes(CHARACTER_BLOCK), true);
  }
  assert.equal(doc.shots[0].end <= 5, true);
  assert.deepEqual(unsourcedNumbers(doc), []);
  assert.match(doc.text, /1\. MASTER BLOCK/);
  assert.match(doc.text, /2\. SHOT LIST/);
  assert.match(doc.text, /3\. HOOK RULE/);
  assert.match(doc.text, /4\. RETENTION PLAN/);
  assert.match(doc.text, /5\. SERIES/);
  assert.match(doc.text, /6\. PUBLISH BLOCK/);
  assert.match(doc.text, /7\. FACT LIST/);
  assert.match(doc.text, /synthetic-media disclosure/);
  assert.match(doc.facts[0].sourceUrl, /example\.com\/price/);
  const card = scorecard(doc);
  assert.equal(card.checks.find((item) => item.id === "open-loop").pass, true);
  assert.equal(card.checks.find((item) => item.id === "source").pass, true);
  assert.equal(card.pass, true);
});

test("a topic with a hold stays locked", () => {
  const findings = [{ numberText: "$2", hold: true, sourceUrl: "", sourceName: "", sourceDate: "" }];
  assert.equal(videoLocked(findings), true);
  const doc = buildScenePrompt(topic, findings, { maxClipSeconds: 8 });
  assert.equal(doc.locked, true);
  assert.equal(doc.shots.length, 0);
  assert.equal(doc.text, "");
  assert.equal(scorecard(doc).checks.find((item) => item.id === "source").pass, false);
});

test("the scorecard flags a missing open loop", () => {
  const doc = buildScenePrompt(topic, sourced, { maxClipSeconds: 8 });
  const broken = { ...doc, retention: { ...doc.retention, openLoop: "", payoff: "" } };
  const check = scorecard(broken).checks.find((item) => item.id === "open-loop");
  assert.equal(check.pass, false);
  assert.match(check.label, /Open loop/);
});

test("a series part carries a recap, a cliffhanger, and an end screen", () => {
  const parts = [
    { index: 1, title: "Corner: the counter", hook: "Open on the counter", cliffhanger: "Next: the rival price", weekDay: 1 },
    { index: 2, title: "Corner: the rival", hook: "Open on the rival", cliffhanger: "End on one comment question.", weekDay: 4 }
  ];
  const doc = buildScenePrompt(topic, sourced, { maxClipSeconds: 8, part: parts[0], parts });
  assert.match(doc.series.recap, /first part/);
  assert.match(doc.series.cliffhanger, /rival/);
  assert.match(doc.series.endScreen, /next part/i);
  assert.match(doc.shots[0].narration, /Recap/);
  assert.match(doc.shots[doc.shots.length - 1].narration, /Cliffhanger/);
});

test("weekly review names the leaving scene and suggests a title only when both signals are low", () => {
  const review = weeklyReview([
    { topicId: 1, title: "Early drop", runtime: 60, ctr: 1, impressions: 100, avgViewDuration: 10, retention: [100, 40, 38, 36] },
    { topicId: 2, title: "Steady", runtime: 60, ctr: 8, impressions: 800, avgViewDuration: 40, retention: [100, 90, 85, 80] },
    { topicId: 3, title: "Low clicks, wide reach", runtime: 60, ctr: 2, impressions: 900, avgViewDuration: 30, retention: [100, 70, 20, 18] },
    { topicId: 4, title: "Middle", runtime: 60, ctr: 3, impressions: 200, avgViewDuration: 20, retention: [100, 80, 70, 60] }
  ], 8);
  const early = review.videos.find((item) => item.topicId === 1);
  const wide = review.videos.find((item) => item.topicId === 3);
  assert.equal(early.rule, "open on the price");
  assert.match(early.scene, /Shot 1/);
  assert.equal(early.suggestion, "Test a clearer title or a thumbnail with fewer words.");
  assert.equal(wide.suggestion, null);
  assert.equal(review.videos.find((item) => item.topicId === 2).suggestion, null);
  const blob = JSON.stringify(review);
  assert.equal(/post at|publish time|upload at|schedule at/i.test(blob), false);
  assert.equal(weeklyReview([]).enough, false);
});
