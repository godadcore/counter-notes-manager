const NUMBER = /\$?\d[\d,]*(?:\.\d+)?%?/g;

function bare(value) {
  return String(value || "").replace(/[$,%\s]/g, "").replace(/,/g, "");
}

function stripNumber(title, match) {
  const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(escaped), "");
}

function tidyTitle(title) {
  let text = String(title || "").replace(/\s+/g, " ").trim();
  text = text.replace(/\bWent From\s+Stores to Closing Thousands\b/i, "Is Closing Thousands of Stores");
  text = text.replace(/\bfrom\s+to\b/gi, "to");
  text = text.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
  return text;
}

export function titleProofWarning(text, findings) {
  const rows = findings || [];
  const source = String(text || "");
  const open = [];
  const seen = new Set();
  for (const match of source.match(NUMBER) || []) {
    const key = bare(match);
    if (!key) continue;
    if (/^(19|20)\d{2}$/.test(key) && !rows.some((item) => bare(item.numberText) === key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const confirmed = rows.some((item) => !item.hold && item.sourceUrl && bare(item.numberText) === key);
    if (!confirmed) open.push(match);
  }
  if (!open.length) return null;
  let suggestedTitle = source;
  for (const match of open) suggestedTitle = stripNumber(suggestedTitle, match);
  suggestedTitle = tidyTitle(suggestedTitle);
  return { numbers: open, suggestion: suggestedTitle && suggestedTitle !== source ? suggestedTitle : "" };
}
