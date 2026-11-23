import { CHARACTER } from "../data.js";
import { isProductionFinding } from "../status.js";

export const CHARACTER_BLOCK = CHARACTER;

const NUMBER_RE = /\$?\d[\d,]*(?:\.\d+)?%?/g;

const CAMERAS = [
  "medium close, eye level, slow push in",
  "wide, slight low angle, locked off",
  "close on the clipboard, eye level, small tilt down",
  "over the shoulder, eye level, slow pan to the chart"
];

const EXPRESSIONS = [
  "focused, like he just read the receipt",
  "skeptical, one eyebrow up",
  "calm, waiting on the number",
  "direct, the question is settled"
];

const MUSIC = [
  "quiet investigative pulse",
  "low tension under the question",
  "a thin pulse while the chart moves",
  "a short resolve on the payoff"
];

const TRANSITIONS = ["hard cut", "cut on the chart", "match cut to the price tag", "cut to the host"];

export function runtimeSeconds(length) {
  const text = String(length || "");
  const minutes = text.match(/(\d+)\s*min/i);
  if (minutes) return Number(minutes[1]) * 60;
  const seconds = text.match(/(\d+)\s*sec/i);
  if (seconds) return Number(seconds[1]);
  const plain = parseInt(text, 10);
  return Number.isFinite(plain) && plain > 0 ? plain * 60 : 0;
}

export function numberTokens(text) {
  return String(text || "").match(NUMBER_RE) || [];
}

function norm(token) {
  return String(token || "").toLowerCase().replace(/[$,%\s]/g, "").replace(/,/g, "");
}

export function acceptedFindings(findings) {
  return (findings || []).filter((item) => !item.hold && /^https?:\/\/\S+$/i.test(item.sourceUrl || "") && item.numberText);
}

export function videoLocked(findings) {
  return (findings || []).some((item) => item.hold && !isProductionFinding(item));
}

function sourced(token, accepted) {
  const key = norm(token);
  if (!key) return true;
  return accepted.some((item) => norm(item.numberText) === key);
}

function stripUnsourced(text, accepted) {
  return String(text || "").replace(NUMBER_RE, (token) => sourced(token, accepted) ? token : "").replace(/\s+/g, " ").trim();
}

export function shotTimeline(runtime, maxClipSeconds) {
  const total = Math.max(0, Math.round(Number(runtime) || 0));
  const cap = Math.min(60, Math.max(1, Math.round(Number(maxClipSeconds) || 8)));
  if (!total) return [];
  const shots = [];
  let cursor = 0;
  while (cursor < total) {
    const limit = shots.length === 0 ? Math.min(5, cap, total) : Math.min(cap, total - cursor);
    const end = cursor + limit;
    shots.push({ start: cursor, end });
    cursor = end;
  }
  return shots;
}

function onScreen(topic, index) {
  const thumb = String(topic.thumb || "").trim();
  const words = thumb.split(/\s+/).filter(Boolean);
  if (index === 0 && words.length >= 3 && words.length <= 5) return thumb;
  const bank = ["READ THE RECEIPT", "HOLD THE QUESTION", "SHOW THE CHART", "PAY OFF THE LOOP"];
  return bank[index % bank.length];
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function scorecard(doc) {
  const shots = doc?.shots || [];
  const first = shots[0];
  const last = shots[shots.length - 1];
  const titleNumbers = numberTokens(doc?.title);
  const factKeys = new Set((doc?.facts || []).map((item) => norm(item.numberText)));
  const titleOk = titleNumbers.every((token) => factKeys.has(norm(token)));
  const visualOk = shots.length > 0 && shots.every((shot, index) => {
    if (!shot.visualChange) return false;
    if (index === 0) return true;
    return shot.visualChange !== shots[index - 1].visualChange;
  });
  const openOk = Boolean(doc?.retention?.openLoop) && Boolean(doc?.retention?.payoff)
    && Number(doc.retention.plantedShot) < Number(doc.retention.payoffShot);
  const thumbWords = wordCount(doc?.thumb);
  const thumbText = doc?.publish?.thumbnail || "";
  const thumbOk = thumbWords >= 3 && thumbWords <= 5 && /Thumbnail\.png/i.test(thumbText) && /left/i.test(thumbText) && /#FF0000|red/i.test(thumbText);
  const sourceOk = !doc?.locked && unsourcedNumbers(doc).length === 0 && (doc?.facts || []).every((item) => item.sourceUrl);
  const hookOk = Boolean(first) && first.end <= 5 && String(first.narration).includes(doc.title) && String(first.narration).includes(doc.thumb);
  const checks = [
    { id: "hook", label: "Title and thumbnail promise is delivered in the first shot.", pass: hookOk },
    { id: "title", label: "Title does not claim anything the fact list does not support.", pass: titleOk },
    { id: "visual", label: "A chart or visual change appears in every shot.", pass: visualOk },
    { id: "open-loop", label: "Open loop planted and paid off.", pass: openOk },
    { id: "thumbnail", label: "Thumbnail uses at most 3 to 5 words and matches the channel template.", pass: thumbOk },
    { id: "source", label: "Every number is confirmed, or the prompt stays locked.", pass: sourceOk }
  ];
  return { checks, pass: checks.every((item) => item.pass) };
}

export function unsourcedNumbers(doc) {
  if (!doc || doc.locked) return [];
  const accepted = doc.facts || [];
  const chunks = [];
  for (const shot of doc.shots || []) {
    chunks.push(shot.narration, shot.onScreen, shot.chart?.values, shot.chart?.axes);
  }
  chunks.push(doc.title, doc.thumb, doc.angle);
  const tokens = chunks.flatMap((chunk) => numberTokens(chunk));
  return [...new Set(tokens.filter((token) => !sourced(token, accepted)))];
}

function chartFor(finding) {
  if (!finding) {
    return {
      type: "none",
      axes: "No axes until a figure is verified",
      values: "none",
      sourceName: "",
      sourceUrl: "",
      sourceDate: ""
    };
  }
  return {
    type: "bar",
    axes: "Item and the verified figure",
    values: finding.numberText,
    sourceName: finding.sourceName || "Proof",
    sourceUrl: finding.sourceUrl,
    sourceDate: finding.sourceDate || ""
  };
}

function renderShot(shot) {
  const chart = shot.chart;
  return `SHOT ${shot.index}
Time: ${shot.start}s to ${shot.end}s
Camera: ${shot.camera}
Host action: ${shot.action}
Expression: ${shot.expression}
CHARACTER BLOCK: ${shot.character}
Background: ${shot.background}
Narration: ${shot.narration}
On-screen text: ${shot.onScreen}
Chart: type ${chart.type}. Axes: ${chart.axes}. Values: ${chart.values}. Proof: ${chart.sourceName}. URL: ${chart.sourceUrl}. Date: ${chart.sourceDate}.
Transition: ${shot.transition}
Music: ${shot.music}`;
}

function hashtags(topic) {
  const raw = String(topic.keywords || topic.short || topic.title || "");
  const tags = ["CounterNotes"];
  for (const word of raw.split(/[^a-zA-Z]+/)) {
    if (word.length > 2 && !tags.includes(word)) tags.push(word);
    if (tags.length >= 8) break;
  }
  return tags.map((tag) => "#" + tag).join(" ");
}

export function buildScenePrompt(topic, findings, options = {}) {
  const accepted = acceptedFindings(findings);
  const locked = videoLocked(findings) || numberTokens([topic?.title, topic?.thumb, topic?.angle, topic?.claim, topic?.scene, topic?.summary].join(" ")).some((token) => !sourced(token, accepted));
  const toolName = String(options.toolName || "generic").trim() || "generic";
  const maxClipSeconds = Number(options.maxClipSeconds) > 0 ? Number(options.maxClipSeconds) : 8;
  const detail = options.detail === "high" ? "high" : "normal";
  const title = topic?.title || "Untitled";
  const thumb = topic?.thumb || "CHECK THE RECEIPT";
  if (locked) {
    return {
      locked: true,
      toolName,
      maxClipSeconds,
      detail,
      title,
      thumb,
      shots: [],
      facts: [],
      text: ""
    };
  }
  const runtime = runtimeSeconds(topic?.length);
  const spans = shotTimeline(runtime, maxClipSeconds);
  const openLoop = "The open loop: the receipt is still hiding the real comparison.";
  const payoff = "The payoff: the receipt shows only the verified figures, and the comparison is done.";
  const parts = options.parts || [];
  const part = options.part || null;
  const partIndex = part ? parts.findIndex((item) => item.index === part.index) : -1;
  const previous = partIndex > 0 ? parts[partIndex - 1] : null;
  const next = partIndex >= 0 ? parts[partIndex + 1] : null;
  const recap = part
    ? (previous ? "Recap: " + stripUnsourced(previous.cliffhanger || previous.hook || previous.title, accepted) : "Recap: this is the first part.")
    : "";
  const endScreen = part
    ? (next ? "End screen: the next part is " + stripUnsourced(next.title, accepted) + "." : (previous ? "End screen: the previous part is " + stripUnsourced(previous.title, accepted) + "." : "End screen: this is the only part."))
    : "";
  const cliffhanger = part ? stripUnsourced(part.cliffhanger || "The next question is still on the receipt.", accepted) : "";
  const facts = accepted.map((item) => ({
    numberText: item.numberText,
    sourceName: item.sourceName || "",
    sourceUrl: item.sourceUrl,
    sourceDate: item.sourceDate || "",
    label: item.label || ""
  }));
  const angle = stripUnsourced(topic?.angle || "Stay with the verified figures.", accepted) || "Stay with the verified figures.";
  const claim = stripUnsourced(topic?.claim || "The claim needs evidence.", accepted);
  const rival = stripUnsourced(topic?.rival || "the closest rival", accepted);
  const shots = spans.map((span, index) => {
    const finding = facts.length ? facts[index % facts.length] : null;
    const chart = chartFor(finding);
    const camera = CAMERAS[index % CAMERAS.length];
    let narration = angle;
    if (index === 0) {
      narration = title + ". " + thumb + ". " + openLoop;
      if (recap) narration = recap + " " + narration;
    } else if (index === spans.length - 1) {
      narration = payoff + (cliffhanger ? " Cliffhanger: " + cliffhanger : "") + (endScreen ? " " + endScreen : "");
    } else if (finding) {
      narration = "The verified figure is " + finding.numberText + " from " + (finding.sourceName || "the evidence") + ". Set that beside " + rival + ".";
    }
    const background = detail === "high"
      ? (topic.scene || "a dark counter") + ". Ambient movement: the yellow price tag turns slightly. Micro-detail: clipboard clip, slate shirt fold, tag string."
      : (topic.scene || "a dark counter") + ". The price tag rests in his hand.";
    return {
      index: index + 1,
      start: span.start,
      end: span.end,
      camera,
      action: "He holds the clipboard and the yellow price tag while he makes the point.",
      expression: EXPRESSIONS[index % EXPRESSIONS.length],
      character: CHARACTER_BLOCK,
      background,
      narration,
      onScreen: onScreen({ ...topic, thumb }, index),
      chart,
      transition: TRANSITIONS[index % TRANSITIONS.length],
      music: index === spans.length - 1 ? "a short resolve on the payoff" : MUSIC[index % MUSIC.length],
      visualChange: camera + " | " + chart.type + " " + chart.values
    };
  });
  const publishThumb = `YouTube thumbnail, 16:9. Match Thumbnail.png.
Dark background, bold white words, one red #FF0000 accent.
Host, large on the left: ${CHARACTER_BLOCK}
The only words on the image: "${thumb}".
One chart on the right, using a verified figure only.
Same illustrated style as the previous Counter Notes thumbnails. Not a photograph and not a stick figure.`;
  const factLines = facts.map((item) => item.numberText + " from " + (item.sourceName || "evidence") + " on " + (item.sourceDate || "undated") + " " + item.sourceUrl);
  const doc = {
    locked: false,
    toolName,
    maxClipSeconds,
    detail,
    title,
    runtime,
    angle,
    rival,
    claim,
    thumb,
    character: CHARACTER_BLOCK,
    shots,
    facts,
    retention: {
      openLoop,
      payoff,
      plantedShot: 1,
      payoffShot: Math.max(2, shots.length),
      weakest: "Mark the retention curve on the last shot, where the open loop is paid off."
    },
    series: part ? { recap, cliffhanger, endScreen } : null,
    publish: {
      title: part ? part.title : title,
      description: angle + (factLines.length ? " Proof: " + factLines.join(" ") : ""),
      hashtags: hashtags(topic),
      thumbnail: publishThumb,
      disclosure: "In YouTube Studio, answer the synthetic-media disclosure question before you publish."
    }
  };
  doc.dossier = options.dossier || null;
  doc.text = renderPrompt(doc);
  doc.shots = doc.shots.map((shot) => ({ ...shot, text: renderShot(shot) }));
  return doc;
}

export function renderPrompt(doc) {
  const master = `TOOL: ${doc.toolName}. Max clip: ${doc.maxClipSeconds} seconds. Detail: ${doc.detail}.

1. MASTER BLOCK
Title: ${doc.title}
Runtime: ${doc.runtime} seconds
Angle: ${doc.angle}
Rival: ${doc.rival}
Claim that must survive a fact check: ${doc.claim}
Dark visual style: background #0F0F0F, white type, YouTube red #FF0000 on the key number.
CHARACTER BLOCK: ${doc.character}`;
  const shotList = doc.shots.map((shot) => shot.text || renderShot(shot)).join("\n\n");
  const hook = `3. HOOK RULE
The first shot delivers this title and this thumbnail inside the first 5 seconds: ${doc.title} / ${doc.thumb}.
No filler intro. Do not open with a welcome.`;
  const retention = `4. RETENTION PLAN
Open loop, planted in shot ${doc.retention.plantedShot}: ${doc.retention.openLoop}
Payoff, in shot ${doc.retention.payoffShot}: ${doc.retention.payoff}
A new camera or chart change happens on every shot.
Weakest point to watch: ${doc.retention.weakest}`;
  const series = doc.series
    ? `5. SERIES
${doc.series.recap}
Cliffhanger at the end: ${doc.series.cliffhanger}
${doc.series.endScreen}`
    : `5. SERIES
This is one video. No recap and no next part.`;
  const publish = `6. PUBLISH BLOCK
Title: ${doc.publish.title}
Description: ${doc.publish.description}
Hashtags: ${doc.publish.hashtags}
Thumbnail prompt:
${doc.publish.thumbnail}
${doc.publish.disclosure}`;
  const facts = `7. FACT LIST
${doc.facts.length ? doc.facts.map((item) => "- " + item.numberText + " | " + (item.sourceName || "evidence") + " | " + (item.sourceDate || "undated") + " | " + item.sourceUrl).join("\n") : "- No verified figures in this prompt."}`;
  const researchText = doc.dossier && (typeof doc.dossier === "string" ? doc.dossier : doc.dossier.text);
  const research = researchText ? `8. RESEARCH DOSSIER\n${researchText}` : "";
  return [master, "2. SHOT LIST\n" + shotList, hook, retention, series, publish, facts, research].filter(Boolean).join("\n\n");
}
