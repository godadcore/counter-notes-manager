import assert from "node:assert/strict";
import test from "node:test";
import { VIDEOS } from "../data.js";
import { splitSeries } from "./series.js";

const costco = VIDEOS.find((video) => video.short === "Costco");
const sears = VIDEOS.find((video) => video.short === "Sears");
const pizzaHut = VIDEOS.find((video) => video.short === "Pizza Hut");

test("Costco stays one video", () => {
  const result = splitSeries(costco, 4);
  assert.equal(result.decision, "one video");
  assert.equal(result.parts.length, 0);
  assert.equal(result.reasoning.runtime, 7);
  assert.equal(result.reasoning.depth, 2);
  assert.equal(result.reasoning.complexity, 2);
  assert.match(result.reasoning.because, /Depth 2, runtime 7 min, complexity 2/);
});

test("Sears and Pizza Hut become series scheduled on the cadence", () => {
  const searsSplit = splitSeries(sears, 4);
  assert.equal(searsSplit.decision, "series");
  assert.equal(searsSplit.reasoning.runtime, 10);
  assert.equal(searsSplit.parts.length, 3);
  assert.deepEqual(searsSplit.parts.map((part) => part.weekDay), [1, 3, 4]);
  assert.match(searsSplit.parts[0].hook, /catalog giant/);
  assert.equal(searsSplit.parts[0].keyPoints.length, 3);
  assert.match(searsSplit.parts[0].cliffhanger, /^Next: /);
  assert.equal(searsSplit.parts[2].cliffhanger, "End on one comment question.");
  const wider = splitSeries(sears, 7);
  assert.deepEqual(wider.parts.map((part) => part.weekDay), [1, 4, 7]);
  const pizza = splitSeries(pizzaHut, 4);
  assert.equal(pizza.decision, "series");
  assert.equal(pizza.parts.length, 2);
  assert.deepEqual(pizza.parts.map((part) => part.weekDay), [1, 4]);
  assert.match(pizza.parts[0].title, /^Pizza Hut: /);
});

test("an empty topic stays one video", () => {
  const result = splitSeries({}, 4);
  assert.equal(result.decision, "one video");
  assert.equal(result.parts.length, 0);
  assert.equal(result.reasoning.runtime, 0);
  assert.equal(result.reasoning.depth, 0);
  assert.equal(result.reasoning.complexity, 0);
  const negative = splitSeries({ title: "Blank", length: "-4 min" }, 4);
  assert.equal(negative.decision, "one video");
});
