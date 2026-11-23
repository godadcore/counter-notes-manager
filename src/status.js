export function isProductionFinding(item) {
  const label = String(item?.label || "").trim().toLowerCase();
  return label.startsWith("length:") || label.startsWith("runtime:") || label.startsWith("words:") || label.startsWith("word target:") || label.startsWith("word count:") || label.startsWith("target words:");
}

export function claimFindings(findings) {
  return (findings || []).filter((item) => !isProductionFinding(item));
}

export function isUnverified(status, findings) {
  if (status !== "posted" && status !== "ready") return false;
  return claimFindings(findings).some((item) => item.hold);
}

export function nextPostTopicIds(plan, days, limit = 4) {
  const ids = [];
  for (const item of plan) {
    if (!item.postId) continue;
    if (days[item.day] || days[String(item.day)]) continue;
    if (!ids.includes(item.postId)) ids.push(item.postId);
    if (ids.length >= limit) break;
  }
  return ids;
}
