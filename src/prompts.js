import { config } from "./config.js";
import { CHARACTER, SOURCE_CHECKS, VIDEOS } from "./data.js";

const RANGE = config.cadenceRangeLabel;

export function wordTarget(length) {
  const mins = parseInt(length, 10) || 8;
  return mins * 145;
}

export function cadenceLine(cadence) {
  return `Videos per week: ${RANGE} long videos a week. This week's target is ${cadence}.`;
}

export function ideasPromptText(statusOf, cadence) {
  const lines = VIDEOS.map((video) => {
    const label = statusOf(video.id).toUpperCase();
    return `${String(video.id).padStart(2, "0")}. [${label}] ${video.title} (${video.length}, ${video.tier})`;
  }).join("\n");
  return `Build the Counter Notes publishing board.

Channel: Counter Notes
Niche: everyday restaurants, retail stores, and consumer products. Explain why they win, fail, or lose to a rival using timelines, prices, and simple charts. Stay off tech products.
Voice: Colton, a confident US male.
${cadenceLine(cadence)}
Money: YouTube AdSense.
Budget: free tools only. HP laptop, 8GB to 12GB RAM, about 227GB of storage.
Character: ${CHARACTER}. Put this same person in the logo and in every 16:9 thumbnail.

The slate below is locked. Do not swap in new topics. For every video marked QUEUED, write:
- a one-sentence spoken hook
- a 2 to 4 word thumbnail line
- the single number a human must fact-check before posting

${lines}`;
}

export function scriptPromptText(video, cadence) {
  const words = wordTarget(video.length);
  return `Write a YouTube script for Counter Notes. It will be read by Colton, a confident US male.

Write the way a sharp person talks after they actually checked the receipt. Short sentences. Real numbers. Contractions are good. Do not open with "welcome back" or "in this video". Do not use filler like delve, tapestry, landscape, unlock, robust, or "let's dive in".

Title: ${video.title}
Runtime: ${video.length}, about ${words} words
Angle: ${video.angle}
Rival to compare: ${video.rival}
Number that must survive a fact check: ${video.claim}

Use these sections, in this order:
1. Hook, first 20 seconds. Open on one surprising price, store count, or margin.
2. The rise. How the brand first won customers, with dates.
3. The turn. The decision that changed the math.
4. The comparison. Same metric, same years, against ${video.rival}.
5. The takeaway. One lesson a shopper or an owner can use this week.
6. The close. One comment question, then a plain line that Counter Notes posts ${RANGE} long videos a week. This week's target is ${cadence}.

For every section, add these cues:
- On-screen text: 3 to 5 words
- Host: what ${CHARACTER} does in that moment
- Chart: the timeline, price, or bar that is on screen
- Music: a short mood label, such as quiet investigative pulse

Visual style: minimalist and clean. Dark background #0F0F0F, white type, YouTube red #FF0000 on the key number.
Production: no new paid software. Simple scenes that render on an HP laptop with 8GB to 12GB RAM.

Any number that is not verified stays as needs a check. Do not state it as a fact.`;
}

export function thumbPromptText(video, concept) {
  return `YouTube thumbnail, 16:9. Match Thumbnail.png.
Dark background, bold white words, one red #FF0000 shape.
Host, large on the left: ${CHARACTER}
Action: ${concept.action}.
The only words on the image: "${concept.text}".
Chart or price on the right. Crisp outlines, high contrast, same cartoon style as Character.png.`;
}

export function thumbConcepts(video) {
  return [
    { name: "The number", text: video.thumb, action: `standing beside ${video.scene}, price tag raised toward the key figure` },
    { name: "The split", text: "HOW IT CHANGED", action: `standing on the line between a rising white bar and a falling red bar about ${video.rival}` },
    { name: "The receipt", text: "CHECK THE MATH", action: `holding the clipboard next to a giant receipt where this claim is circled: ${video.claim}` }
  ];
}

export function auditItems(video) {
  return [
    { key: "dates", label: `Dates in "${video.title}" match a public timeline.` },
    { key: "numbers", label: `Revenue, store counts, and market share are checked. Hook number: ${video.claim}` },
    { key: "price", label: "Every price on screen is the real shelf price, menu price, or fare for that year." },
    { key: "rival", label: `The comparison with ${video.rival} uses the same years and the same metric.` },
    { key: "original", label: "Script, charts, and thumbnail are original to Counter Notes." },
    { key: "fairuse", label: "Logos and product shots are brief commentary, not the whole frame or the whole video." },
    { key: "voice", label: "A read-aloud pass sounds like a person. Stiff lines are cut." },
    { key: "promise", label: "Title, thumbnail text, and narration promise the same story." }
  ];
}

export function auditPromptText(video, audit) {
  const lines = auditItems(video).map((item) => {
    const mark = audit[video.id + ":" + item.key] ? "x" : " ";
    return `- [${mark}] ${item.label}`;
  }).join("\n");
  return `Fact audit for Counter Notes. Do this before publishing.

Video: ${video.title}
Claim to prove or rewrite: ${video.claim}

Check each line against a public page such as a company report, a regulator filing, or a named news story. If you cannot verify a number, mark it needs a check. Do not invent a link.

${lines}

Originality and fair use:
- The narration, charts, and thumbnail must be made for this channel.
- A logo may appear only as part of the commentary, not as the entire thumbnail.
- Do not copy another channel's script, edit, or thumbnail layout.

Reply with PASS or FIX on each line, the evidence name, and a replacement sentence where you mark FIX.`;
}

export function videoTags(video) {
  const extra = ["Counter Notes", "business documentary", "brand breakdown", "retail history", "everyday economics", "why brands fail", "consumer brands", "company story", "business strategy"];
  const parts = [video.title.toLowerCase().replace(/[^a-z0-9 ]/g, ""), ...video.keywords.split(",").map((part) => part.trim()), ...extra];
  const seen = new Set();
  const unique = [];
  parts.forEach((part) => {
    const key = part.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(part);
  });
  return unique.slice(0, 15).join(", ");
}

export function videoHashtags(video) {
  const words = video.keywords.split(",").map((part) => "#" + part.replace(/[^a-zA-Z0-9]/g, "")).filter((tag) => tag.length > 1);
  const base = ["#CounterNotes", "#BusinessStories", "#BrandBreakdown", "#RetailHistory", "#EverydayEconomics"];
  return words.concat(base).slice(0, 12).join(" ");
}

export function videoDescription(video) {
  return `${video.summary}

This Counter Notes breakdown follows the price, the store count, and the decision that changed the business.

What you will see:
- How the brand first won customers
- The turn that changed the math
- A side-by-side look at ${video.rival}
- One takeaway you can spot on a normal shopping trip

Timestamps:
0:00 The number that starts the story
0:50 How the lead was built
2:30 The turn
5:00 The comparison
7:00 The takeaway

Counter Notes posts ${RANGE} long videos a week.

This video is commentary and education. It is not financial advice.

${videoHashtags(video)}`;
}

export function masterPromptText(cadence) {
  return `You are the writer and producer for Counter Notes.

Channel name: Counter Notes
Niche: everyday brand and business stories, not tech. Restaurants, retail stores, and consumer products. Why they succeed, fail, or lose to a rival. Use clean timelines, price comparisons, and simple charts.
Look: minimalist. Background #0F0F0F, cards #181818 and #222222, text #FFFFFF, notes #A3A3A3, accent #FF0000.
Character: ${CHARACTER}. This person is the logo and the host of every 16:9 thumbnail.
Voice: Colton, US male.
${cadenceLine(cadence)}
Money: YouTube AdSense.
Gear: free tools only, HP laptop, 8GB to 12GB RAM, about 227GB storage.

Write like a person who has worked a register. No stiff AI phrasing. Every factual number stays as needs a check until an evidence link is stored.`;
}

export function humanizerMasterText(cadence) {
  return `Humanize this Counter Notes script for Colton, a US male narrator.

Rules:
- Sound like a sharp storyteller, not a memo.
- Open on a number, a price, or a store count.
- One idea per sentence. Use contractions.
- Keep every date, price, and store count, but mark any figure you cannot prove with [NOT CHECKED].
- Add a chart cue and a host cue every few lines.
- Host look: ${CHARACTER}.
- Cut these habits: delve, tapestry, landscape, unlock, robust, "in today's video", "let's dive in", "it's important to note".
- End with one comment question and a plain subscribe line for ${RANGE} long videos a week. This week's target is ${cadence}.

Paste the stiff draft under this line:

`;
}

export function adsenseSnippet(cadence) {
  return `function monthlyAdSense(viewsPerVideo, videosPerMonth, cpm) {
  return (viewsPerVideo * videosPerMonth * cpm) / 1000;
}

// Default week is ${cadence} long videos, about ${cadence * 4} videos a month.
// The allowed range is ${RANGE} long videos a week.
`;
}

export function cssSnippet() {
  return `:root {
  --bg: #0F0F0F;
  --surface: #181818;
  --surface-2: #222222;
  --text: #FFFFFF;
  --muted: #A3A3A3;
  --red: #FF0000;
}
`;
}

export function statusSnippet() {
  return `const postingStatus = {
  queued: "Queued",
  scripted: "Scripted",
  ready: "Ready to Post",
  posted: "Posted"
};
`;
}

function notesBlock(notes) {
  const trimmed = (notes || "").trim();
  if (!trimmed) return "No proof notes yet. Do not invent a number. Mark every missing figure as check this.";
  return trimmed;
}

export function researchPromptText(topic, notes, cadence) {
  return `Research this Counter Notes story before any script is written.

Channel: Counter Notes
Niche: everyday brands, restaurants, retail stores, and consumer products. Timelines, price comparisons, and simple charts.
Voice later: Colton, US male.
${cadenceLine(cadence)}

Topic: ${topic.title}
Working angle: ${topic.angle}
Rival: ${topic.rival}
Claim to verify: ${topic.claim}

My proof notes:
${notesBlock(notes)}

Return a fact sheet only:
- A timeline with years
- Prices, store counts, and margins, each with where a human should confirm it
- One comparison against the rival using the same years and the same metric
- The single chart this video needs
- A 2 to 4 word thumbnail line
- Any number you cannot prove, marked as check this

Do not write the spoken script yet.`;
}

export function stackScriptPrompt(topic, notes, cadence) {
  const extra = `Link notes from my own check. Use these numbers only when a link URL is attached. If a line conflicts with the claim, follow the notes and mark the conflict [NOT CHECKED]:
${notesBlock(notes)}`;
  if (!topic.custom) return scriptPromptText(topic, cadence) + "\n\n" + extra;
  return `Write a YouTube script for Counter Notes. It will be read by Colton, a confident US male.

Write the way a sharp person talks after they actually checked the receipt. Short sentences. Real numbers. Contractions are good. Do not open with "welcome back" or "in this video". Do not use filler like delve, tapestry, landscape, unlock, robust, or "let's dive in".

Title: ${topic.title}
Runtime: ${topic.length}, about ${wordTarget(topic.length)} words
Angle: ${topic.angle}
Rival to compare: ${topic.rival}
Number that must survive a fact check: ${topic.claim}

Use these sections, in this order:
1. Hook, first 20 seconds. Open on one surprising price, store count, or margin.
2. The rise. How the brand first won customers, with dates.
3. The turn. The decision that changed the math.
4. The comparison. Same metric, same years, against ${topic.rival}.
5. The takeaway. One lesson a shopper or an owner can use this week.
6. The close. One comment question, then a plain line that Counter Notes posts ${RANGE} long videos a week. This week's target is ${cadence}.

For every section, add these cues:
- On-screen text: 3 to 5 words
- Host: what ${CHARACTER} does in that moment
- Chart: the timeline, price, or bar that is on screen
- Music: a short mood label, such as quiet investigative pulse

Visual style: minimalist and clean. Dark background #0F0F0F, white type, YouTube red #FF0000 on the key number.
Production: no new paid software. Simple scenes that render on an HP laptop with 8GB to 12GB RAM.

${extra}`;
}

export function stackThumbPrompt(topic, overlay) {
  return thumbPromptText(topic, {
    text: overlay,
    action: `standing on the left beside ${topic.scene}, clipboard in one hand and yellow price tag in the other`
  });
}

export function factPromptText(topic, notes) {
  return `Fact check for a Counter Notes video. Do not write a script.

Topic: ${topic.title}
Claim: ${topic.claim}
Rival: ${topic.rival}

Proof notes I pasted:
${notesBlock(notes)}

For each number, date, and price:
- Say whether the notes support it
- Name the kind of page a human should open, such as a company filing, a menu archive, a news report, or a store-count chart
- Keep the figure if the notes include a link
- Replace a weak figure with check this
- Flag any mismatch between the claim and the notes

End with three lines only:
1. SAFE TO SCRIPT, or NEEDS CHECK
2. The one chart
3. A 2 to 4 word thumbnail line`;
}

export function withPart(text, part, total, cadence) {
  if (!part) return text;
  const points = (part.keyPoints || []).map((point) => "- " + point).join("\n");
  return `Series part ${part.index} of ${total}.
Title: ${part.title}
Hook: ${part.hook}
Key points:
${points}
Cliffhanger: ${part.cliffhanger}
Schedule: slot ${part.weekDay} of ${cadence} long videos this week.

${text}`;
}

export { SOURCE_CHECKS };
