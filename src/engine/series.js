function textOf(topic) {
  if (!topic || typeof topic !== "object") return "";
  return [topic.title, topic.summary, topic.angle, topic.claim].filter(Boolean).join(" ");
}

function sentencesOf(topic) {
  const blob = [topic?.summary, topic?.angle, topic?.claim].filter(Boolean).join(". ");
  return blob
    .split(/\s+\bthen\b\s+|,\s+|(?<=\.)\s+/)
    .map((line) => line.trim().replace(/^\.+|\.+$/g, "").trim())
    .filter((line) => line.length > 8);
}

export function measureTopic(topic) {
  const blob = textOf(topic);
  const parsed = parseInt(String(topic?.length || ""), 10);
  const runtime = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const yearSet = [...new Set(blob.match(/\b(?:18|19|20)\d{2}s?\b/g) || [])];
  const moneySet = [...new Set((blob.match(/\$\d[\d,]*(?:\.\d+)?/g) || []).map((item) => item.toLowerCase()))];
  const thenCount = (blob.match(/\bthen\b/gi) || []).length;
  const depth = yearSet.length + thenCount + (blob.includes(",") ? 1 : 0);
  const complexity = yearSet.length + moneySet.length + thenCount;
  return { runtime, depth, complexity, yearCount: yearSet.length, moneyCount: moneySet.length, thenCount };
}

function weekDay(index, count, cadence) {
  const slots = Math.max(1, Math.round(Number(cadence) || 1));
  if (count <= 1) return 1;
  return 1 + Math.round((index * (slots - 1)) / (count - 1));
}

function pickBeats(sentences, count) {
  if (!sentences.length) return Array.from({ length: count }, () => "Use only the numbers in the evidence notes");
  if (count === 1) return [sentences[0]];
  const picked = [];
  for (let index = 0; index < count; index += 1) {
    const at = Math.round((index * (sentences.length - 1)) / (count - 1));
    picked.push(sentences[at]);
  }
  return picked;
}

function clip(value) {
  const text = String(value || "").trim();
  return text.length > 72 ? text.slice(0, 69).trim() + "..." : text;
}

export function splitSeries(topic, cadence = 4) {
  const measure = measureTopic(topic);
  const slots = Math.min(7, Math.max(4, Math.round(Number(cadence) || 4)));
  const single = measure.runtime > 0 && measure.runtime <= 8 && measure.yearCount <= 1 && measure.thenCount === 0;
  const decision = !textOf(topic) || single || measure.runtime === 0 ? "one video" : "series";
  const because = !textOf(topic)
    ? "No topic text. Depth 0, runtime 0, complexity 0. Keep it one video."
    : "Depth " + measure.depth + ", runtime " + measure.runtime + " min, complexity " + measure.complexity + ". " + (
      decision === "one video"
        ? "One era and a short runtime fit in one video."
        : "The runtime or the number of turns needs more than one video."
    );
  if (decision === "one video") {
    return { decision, reasoning: { depth: measure.depth, runtime: measure.runtime, complexity: measure.complexity, because }, parts: [] };
  }
  const count = Math.min(slots, Math.max(2, Math.min(3, measure.depth || 2)));
  const beats = pickBeats(sentencesOf(topic), count);
  const short = topic.short || topic.title || "Part";
  const parts = beats.map((beat, index) => {
    const next = beats[index + 1];
    return {
      index: index + 1,
      title: short + ": " + clip(beat),
      hook: "Open on this: " + beat,
      keyPoints: [beat, topic.claim || "A number without evidence stays as needs a check.", "Compare with " + (topic.rival || "the closest rival") + "."],
      cliffhanger: next ? "Next: " + next : "End on one comment question.",
      weekDay: weekDay(index, count, slots)
    };
  });
  return {
    decision,
    reasoning: { depth: measure.depth, runtime: measure.runtime, complexity: measure.complexity, because },
    parts
  };
}
