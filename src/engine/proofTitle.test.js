import test from "node:test";
import assert from "node:assert/strict";
import { titleProofWarning } from "./proofTitle.js";
import { copy } from "../copy.js";

test("a title number that is not confirmed suggests a title without that number", () => {
  const title = "Why Subway Went From 44,000 Stores to Closing Thousands";
  const warning = titleProofWarning(title, [
    { numberText: "44,000", hold: true, sourceUrl: "", label: "Store count near 44,000" },
    { numberText: "9", hold: false, sourceUrl: "https://example.test/length", label: "about 9 minutes" },
    { numberText: "37,000", hold: false, sourceUrl: "https://en.wikipedia.org/wiki/Subway", label: "about 37,000 locations in 2023" }
  ]);
  assert.deepEqual(warning.numbers, ["44,000"]);
  assert.equal(warning.suggestion, "Why Subway Is Closing Thousands of Stores");
  assert.equal(title, "Why Subway Went From 44,000 Stores to Closing Thousands");
});

test("a confirmed number in the title does not warn", () => {
  const warning = titleProofWarning("about 37,000 locations in 2023", [
    { numberText: "37,000", hold: false, sourceUrl: "https://en.wikipedia.org/wiki/Subway", label: "about 37,000 locations in 2023" }
  ]);
  assert.equal(warning, null);
});

test("no confirmed number suggests a title without the number and leaves the saved title alone", () => {
  const title = "Why Subway Went From 44,000 Stores to Closing Thousands";
  const warning = titleProofWarning(title, [
    { numberText: "44,000", hold: true, sourceUrl: "", label: "Store count near 44,000" }
  ]);
  assert.deepEqual(warning.numbers, ["44,000"]);
  assert.equal(warning.suggestion, "Why Subway Is Closing Thousands of Stores");
  assert.equal(title, "Why Subway Went From 44,000 Stores to Closing Thousands");
});

test("Today tells the user when Setup has no keywords or channels", () => {
  assert.equal(copy.today.setupBlocked, "Add channels and keywords in Setup. Research cannot start without them.");
});
