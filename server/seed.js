import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function topicsFromBlueprint(source) {
  const start = source.indexOf("const VIDEOS = ");
  const end = source.indexOf("\nconst WEEKS");
  if (start < 0 || end < 0) throw new Error("blueprint.js is missing the 30 topics.");
  const literal = source.slice(start + "const VIDEOS = ".length, end).trim().replace(/;\s*$/, "");
  const topics = Function(`"use strict"; return (${literal});`)();
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error("blueprint.js has no topics.");
  }
  return topics;
}

export function loadBlueprintTopics() {
  const source = readFileSync(join(root, "legacy", "blueprint.js"), "utf8");
  const topics = topicsFromBlueprint(source);
  if (topics.length !== 30) throw new Error("Expected 30 topics in blueprint.js.");
  return topics;
}
