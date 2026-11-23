import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../config.js";
import { earnings, monetizationProgress, viewsNeeded } from "./money.js";
import { monteCarlo, triangular } from "./monteCarlo.js";
import { retentionDrop, topicScore } from "./score.js";

function mulberry32(seed) {
  let state = seed;
  return function rng() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const thresholds = config.thresholds;

test("monetization uses 4,000 hours before the effective date and 8,000 after", () => {
  const before = monetizationProgress(100, 500, config, { today: "2026-11-23", stats: [] });
  assert.equal(before.watchHourGoal, thresholds.watchHoursNow);
  assert.equal(before.usingLater, false);
  assert.equal(before.enoughData, false);
  assert.equal(before.projectedDate, null);
  const after = monetizationProgress(100, 500, config, { today: "2027-02-01", stats: [] });
  assert.equal(after.watchHourGoal, thresholds.watchHoursLater);
  assert.equal(after.subscriberGoal, 1000);
});

test("projected date comes from channel_stats growth", () => {
  const stats = [
    { date: "2026-11-01", subscribers: 100, watchHours: 400 },
    { date: "2026-11-11", subscribers: 200, watchHours: 800 }
  ];
  const result = monetizationProgress(200, 800, config, { today: "2026-11-11", stats });
  assert.equal(result.enoughToProject, true);
  assert.equal(result.projectedDate > "2026-11-11", true);
});

test("views needed and earnings stay ranges from the inputs", () => {
  assert.equal(viewsNeeded(4000, 8), 30000);
  assert.equal(viewsNeeded(4000, 0), null);
  const money = earnings(10000, 1, 2, 4);
  assert.deepEqual({ low: money.low, mid: money.mid, high: money.high }, { low: 10, mid: 20, high: 40 });
});

test("triangular stays inside the bounds and monte carlo returns P10 P50 P90", () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 20; i += 1) {
    const sample = triangular(rng, 10, 20, 40);
    assert.equal(sample >= 10 && sample <= 40, true);
  }
  const result = monteCarlo({
    videos: 2,
    views: { min: 100, mode: 200, max: 400 },
    duration: { min: 4, mode: 6, max: 8 },
    rpm: { min: 1, mode: 2, max: 4 }
  }, 1000, mulberry32(3));
  for (const key of ["views", "watchHours", "revenue"]) {
    assert.equal(result[key].p10 <= result[key].p50, true);
    assert.equal(result[key].p50 <= result[key].p90, true);
  }
  assert.equal(result.runs, 1000);
  const full = monteCarlo({
    videos: 1,
    views: { min: 1, mode: 1, max: 1 },
    duration: { min: 60, mode: 60, max: 60 },
    rpm: { min: 1, mode: 1, max: 1 }
  }, 10000, mulberry32(1));
  assert.equal(full.runs, 10000);
  assert.equal(full.views.p50, 1);
  assert.equal(full.watchHours.p50, 1);
});

test("topic score uses the weights and retention finds the steepest drop", () => {
  assert.equal(topicScore({ demand: 2, freshness: 3, fit: 4, competition: 2 }, { demand: 1, freshness: 1, fit: 1, competition: 1 }), 12);
  assert.equal(topicScore({ demand: 2, freshness: 3, fit: 4, competition: 2 }, { demand: 2, freshness: 1, fit: 1, competition: 1 }), 24);
  assert.equal(topicScore({ demand: 2, freshness: 3, fit: 4, competition: 0 }, { demand: 1, freshness: 1, fit: 1, competition: 1 }), null);
  assert.deepEqual(retentionDrop([100, 80, 70, 20]), { index: 3, from: 70, to: 20, drop: 50 });
  assert.equal(retentionDrop([40]), null);
});

test("viewsNeeded(8000, 5) is 96000 and earnings(100000, 1, 2, 3) is 100, 200, 300", () => {
  assert.equal(viewsNeeded(8000, 5), 96000);
  const money = earnings(100000, 1, 2, 3);
  assert.equal(money.low, 100);
  assert.equal(money.mid, 200);
  assert.equal(money.high, 300);
});

test("500 subscribers and 2000 hours is 50 percent and 25 percent of the 8000-hour set", () => {
  const result = monetizationProgress(500, 2000, config, { today: "2027-02-01", stats: [] });
  assert.equal(result.watchHourGoal, 8000);
  assert.equal(result.subscriberRatio, 0.5);
  assert.equal(result.watchHourRatio, 0.25);
  assert.equal(Math.round(result.subscriberRatio * 100), 50);
  assert.equal(Math.round(result.watchHourRatio * 100), 25);
});

test("monteCarlo with a fixed seed repeats and keeps P10 <= P50 <= P90", () => {
  function scripted(units) {
    let index = 0;
    return () => units[index++];
  }
  const plan = {
    videos: 1,
    views: { min: 0, mode: 100, max: 400 },
    duration: { min: 0, mode: 30, max: 60 },
    rpm: { min: 0, mode: 2, max: 4 }
  };
  const units = [0.01, 0, 0, 0.16, 0.5, 0.5, 0.25, 1, 1];
  const first = monteCarlo(plan, 3, scripted(units));
  const second = monteCarlo(plan, 3, scripted(units));
  assert.deepEqual(first.views, { p10: 20, p50: 80, p90: 100 });
  assert.deepEqual(first.watchHours, { p10: 0, p50: 40, p90: 100 });
  assert.ok(Math.abs(first.revenue.p10 - 0) < 1e-9);
  assert.ok(Math.abs(first.revenue.p50 - 0.16) < 1e-9);
  assert.ok(Math.abs(first.revenue.p90 - 0.4) < 1e-9);
  assert.deepEqual(first, second);
  for (const key of ["views", "watchHours", "revenue"]) {
    assert.equal(first[key].p10 <= first[key].p50, true);
    assert.equal(first[key].p50 <= first[key].p90, true);
  }
});

test("topic score rises with demand and falls with competition", () => {
  const weights = { demand: 1, freshness: 1, fit: 1, competition: 1 };
  const base = topicScore({ demand: 2, freshness: 2, fit: 2, competition: 2 }, weights);
  const moreDemand = topicScore({ demand: 4, freshness: 2, fit: 2, competition: 2 }, weights);
  const moreCompetition = topicScore({ demand: 2, freshness: 2, fit: 2, competition: 4 }, weights);
  assert.equal(base, 4);
  assert.equal(moreDemand, 8);
  assert.equal(moreCompetition, 2);
  assert.equal(moreDemand > base, true);
  assert.equal(base > moreCompetition, true);
});

test("retentionDrop finds the steepest drop on a known curve", () => {
  assert.deepEqual(retentionDrop([100, 90, 85, 40, 35]), { index: 3, from: 85, to: 40, drop: 45 });
});

test("zero, negative, and empty inputs stay explicit", () => {
  assert.equal(viewsNeeded(0, 5), 0);
  assert.equal(viewsNeeded(-1, 5), null);
  assert.equal(viewsNeeded(8000, 0), null);
  assert.equal(viewsNeeded(8000, -5), null);
  assert.equal(viewsNeeded("", 5), null);
  assert.equal(viewsNeeded(8000, ""), null);
  assert.deepEqual(
    { low: earnings(0, 1, 2, 3).low, mid: earnings(0, 1, 2, 3).mid, high: earnings(0, 1, 2, 3).high },
    { low: 0, mid: 0, high: 0 }
  );
  assert.equal(earnings(-1000, 1, 2, 3), null);
  assert.equal(earnings("", 1, 2, 3), null);
  const zeroBar = monetizationProgress(0, 0, config, { today: "2027-02-01", stats: [] });
  assert.equal(zeroBar.subscriberRatio, 0);
  assert.equal(zeroBar.watchHourRatio, 0);
  const negativeBar = monetizationProgress(-5, -10, config, { today: "2027-02-01", stats: [] });
  assert.equal(negativeBar.subscriberRatio, null);
  assert.equal(negativeBar.watchHourRatio, null);
  const emptyBar = monetizationProgress("", "", config, { today: "2027-02-01", stats: [] });
  assert.equal(emptyBar.subscriberRatio, null);
  assert.equal(emptyBar.watchHourRatio, null);
  assert.equal(monetizationProgress(1, 1, {}, { stats: [] }).subscriberRatio, null);
  const emptySim = monteCarlo({}, 10);
  assert.equal(emptySim.runs, 0);
  assert.deepEqual(emptySim.views, { p10: 0, p50: 0, p90: 0 });
  const negativeSim = monteCarlo({
    videos: -2,
    views: { min: -1, mode: 0, max: 1 },
    duration: { min: 1, mode: 1, max: 1 },
    rpm: { min: 1, mode: 1, max: 1 }
  }, -5);
  assert.equal(negativeSim.runs, 0);
  assert.equal(topicScore({ demand: 0, freshness: 2, fit: 2, competition: 2 }), 0);
  assert.equal(topicScore({ demand: -1, freshness: 2, fit: 2, competition: 2 }), null);
  assert.equal(topicScore({}), null);
  assert.equal(topicScore(null), null);
  assert.equal(retentionDrop([]), null);
  assert.equal(retentionDrop(null), null);
  assert.deepEqual(retentionDrop([0, 0]), { index: 1, from: 0, to: 0, drop: 0 });
  assert.deepEqual(retentionDrop([-10, -40]), { index: 1, from: -10, to: -40, drop: 30 });
  assert.equal(retentionDrop([""]), null);
});
