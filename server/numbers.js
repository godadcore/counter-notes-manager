const NUMBER_RE = /\$?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|billion|million|thousand|b))?/gi;
const SKIP_FIELDS = new Set(["id", "short", "tier", "length"]);

export function extractNumbers(text) {
  const found = [];
  if (!text) return found;
  const re = new RegExp(NUMBER_RE.source, "gi");
  let match = re.exec(text);
  while (match) {
    const numberText = match[0].replace(/\s+/g, " ").trim();
    if (numberText && numberText !== "$") {
      const from = Math.max(0, match.index - 48);
      const to = Math.min(text.length, match.index + match[0].length + 48);
      found.push({
        numberText,
        snippet: text.slice(from, to).replace(/\s+/g, " ").trim()
      });
    }
    match = re.exec(text);
  }
  return found;
}

function isProductionLabel(label) {
  const text = String(label || "").trim().toLowerCase();
  return text.startsWith("length:") || text.startsWith("runtime:") || text.startsWith("words:") || text.startsWith("word target:") || text.startsWith("word count:") || text.startsWith("target words:");
}

export function numberKey(numberText) {
  return String(numberText).toLowerCase().replace(/[\s,]/g, "");
}

export function findingsForTopic(topic) {
  const byKey = new Map();
  for (const [field, value] of Object.entries(topic)) {
    if (SKIP_FIELDS.has(field) || typeof value !== "string") continue;
    for (const hit of extractNumbers(value)) {
      const key = numberKey(hit.numberText);
      const label = field + ": " + hit.snippet;
      const current = byKey.get(key);
      if (!current || label.length > current.label.length) {
        byKey.set(key, { numberText: hit.numberText, label });
      }
    }
  }
  return [...byKey.values()];
}

export function readyBlockReason(findings) {
  const holds = findings.filter((item) => (item.hold || !item.sourceUrl) && !isProductionLabel(item.label));
  if (holds.length === 0) return "";
  const noun = holds.length === 1 ? "number still needs a check" : "numbers still need a check";
  return holds.length + " " + noun + ". Add an evidence link before Ready to Post.";
}
