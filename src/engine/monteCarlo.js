export function triangular(rng, min, mode, max) {
  const low = Number(min);
  const mid = Number(mode);
  const high = Number(max);
  if (high === low) return low;
  const span = high - low;
  const cutoff = (mid - low) / span;
  const unit = rng();
  if (unit < cutoff) return low + Math.sqrt(unit * span * (mid - low));
  return high - Math.sqrt((1 - unit) * span * (high - mid));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

function band(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9) };
}

function boundsOk(box) {
  if (!box) return false;
  const min = Number(box.min);
  const mode = Number(box.mode);
  const max = Number(box.max);
  if (![min, mode, max].every(Number.isFinite)) return false;
  if (min < 0 || mode < 0 || max < 0) return false;
  if (mode < min || mode > max || max < min) return false;
  return true;
}

function emptyBand() {
  return { p10: 0, p50: 0, p90: 0 };
}

export function monteCarlo(plan, runs = 10000, rng = Math.random) {
  if (!plan || !boundsOk(plan.views) || !boundsOk(plan.duration) || !boundsOk(plan.rpm)) {
    return { estimate: true, runs: 0, views: emptyBand(), watchHours: emptyBand(), revenue: emptyBand() };
  }
  const count = Math.max(0, Math.round(Number(plan.videos) || 0));
  const times = Math.max(0, Math.round(Number(runs) || 0));
  const views = [];
  const watchHours = [];
  const revenue = [];
  for (let run = 0; run < times; run += 1) {
    let viewSum = 0;
    let hourSum = 0;
    let moneySum = 0;
    for (let video = 0; video < count; video += 1) {
      const sampledViews = triangular(rng, plan.views.min, plan.views.mode, plan.views.max);
      const minutes = triangular(rng, plan.duration.min, plan.duration.mode, plan.duration.max);
      const rpm = triangular(rng, plan.rpm.min, plan.rpm.mode, plan.rpm.max);
      viewSum += sampledViews;
      hourSum += sampledViews * (minutes / 60);
      moneySum += sampledViews / 1000 * rpm;
    }
    views.push(viewSum);
    watchHours.push(hourSum);
    revenue.push(moneySum);
  }
  return {
    estimate: true,
    runs: times,
    views: band(views),
    watchHours: band(watchHours),
    revenue: band(revenue)
  };
}
