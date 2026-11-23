export const defaultWeights = { demand: 1, freshness: 1, fit: 1, competition: 1 };

function factor(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function topicScore(topic, weights = defaultWeights) {
  if (!topic || typeof topic !== "object") return null;
  const demand = factor(topic.demand);
  const freshness = factor(topic.freshness);
  const fit = factor(topic.fit);
  const competition = factor(topic.competition);
  const demandWeight = factor(weights?.demand ?? 1);
  const freshnessWeight = factor(weights?.freshness ?? 1);
  const fitWeight = factor(weights?.fit ?? 1);
  const competitionWeight = factor(weights?.competition ?? 1);
  const pieces = [demand, freshness, fit, competition, demandWeight, freshnessWeight, fitWeight, competitionWeight];
  if (pieces.some((value) => value == null)) return null;
  const denom = competition * competitionWeight;
  if (denom === 0) return null;
  return (demand * demandWeight * freshness * freshnessWeight * fit * fitWeight) / denom;
}

export function retentionDrop(curve) {
  if (!Array.isArray(curve) || curve.length < 2) return null;
  if (curve.some((value) => !Number.isFinite(Number(value)) || value === "" || value == null)) return null;
  let best = null;
  for (let index = 1; index < curve.length; index += 1) {
    const from = Number(curve[index - 1]);
    const to = Number(curve[index]);
    const drop = from - to;
    if (!best || drop > best.drop) best = { index, from, to, drop };
  }
  return best;
}
