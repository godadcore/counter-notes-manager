import { shotTimeline } from "./videoPrompt.js";

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function leaveTime(curve, drop, runtime) {
  if (!drop || !Array.isArray(curve) || curve.length < 2) return null;
  const slot = Math.max(0, drop.index - 1);
  return (slot / (curve.length - 1)) * runtime;
}

export function weeklyReview(entries, maxClipSeconds = 8) {
  const rows = (entries || []).filter((item) => Number.isFinite(Number(item.ctr)) && Number.isFinite(Number(item.impressions)));
  if (!rows.length) return { enough: false, median: null, videos: [] };
  const medianCtr = median(rows.map((item) => Number(item.ctr)));
  const medianImpressions = median(rows.map((item) => Number(item.impressions)));
  const medianDuration = median(rows.map((item) => Number(item.avgViewDuration)));
  const videos = rows.map((item) => {
    const runtime = Number(item.runtime) || 0;
    const curve = Array.isArray(item.retention) ? item.retention.map(Number).filter((value) => Number.isFinite(value)) : [];
    let drop = null;
    if (curve.length >= 2) {
      for (let index = 1; index < curve.length; index += 1) {
        const fall = curve[index - 1] - curve[index];
        if (!drop || fall > drop.drop) drop = { index, from: curve[index - 1], to: curve[index], drop: fall };
      }
    }
    const time = leaveTime(curve, drop, runtime);
    const shots = shotTimeline(runtime, maxClipSeconds);
    const scene = time == null ? null : (shots.find((shot) => time >= shot.start && time < shot.end) || shots[shots.length - 1] || null);
    const shotNumber = scene ? shots.indexOf(scene) + 1 : null;
    const rule = shotNumber === 1 ? "open on the price" : (shotNumber ? "Change the visual in shot " + shotNumber + " before viewers leave." : "Not enough retention data for a rule.");
    const ctr = Number(item.ctr);
    const impressions = Number(item.impressions);
    const lowCtr = medianCtr != null && ctr < medianCtr;
    const belowUsual = medianImpressions != null && impressions < medianImpressions;
    const suggestion = lowCtr && belowUsual ? "Test a clearer title or a thumbnail with fewer words." : null;
    return {
      topicId: item.topicId,
      title: item.title || "",
      ctr,
      impressions,
      avgViewDuration: Number(item.avgViewDuration),
      versus: {
        ctr: ctr >= medianCtr ? "at or above your median" : "below your median",
        impressions: impressions >= medianImpressions ? "at or above your median" : "below your median",
        avgViewDuration: Number(item.avgViewDuration) >= medianDuration ? "at or above your median" : "below your median"
      },
      drop,
      scene: scene ? "Shot " + shotNumber + ", " + scene.start + "s to " + scene.end + "s" : null,
      rule,
      suggestion
    };
  });
  return {
    enough: rows.length >= 2,
    median: { ctr: medianCtr, impressions: medianImpressions, avgViewDuration: medianDuration },
    videos
  };
}
