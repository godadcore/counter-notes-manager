function activeBar(thresholds, today) {
  const later = today >= thresholds.laterEffectiveOn;
  return {
    subscribers: thresholds.subscribers,
    watchHours: later ? thresholds.watchHoursLater : thresholds.watchHoursNow,
    usingLater: later,
    effectiveOn: thresholds.laterEffectiveOn,
    otherWatchHours: later ? thresholds.watchHoursNow : thresholds.watchHoursLater
  };
}

function daySpan(start, end) {
  const ms = Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z");
  return ms / 86400000;
}

function addDays(date, days) {
  const next = new Date(Date.parse(date + "T00:00:00Z") + days * 86400000);
  return next.toISOString().slice(0, 10);
}

function cleanCount(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function monetizationProgress(subs, watchHours, config, options = {}) {
  const today = options.today || new Date().toISOString().slice(0, 10);
  const thresholds = config?.thresholds;
  if (!thresholds) {
    return {
      estimate: true,
      today,
      subscribers: null,
      watchHours: null,
      subscriberGoal: null,
      watchHourGoal: null,
      otherWatchHourGoal: null,
      usingLater: false,
      effectiveOn: null,
      subscriberRatio: null,
      watchHourRatio: null,
      enoughData: false,
      enoughToProject: false,
      projectedDate: null,
      projection: "not enough data"
    };
  }
  const bar = activeBar(thresholds, today);
  const cleanSubs = cleanCount(subs);
  const cleanHours = cleanCount(watchHours);
  const stats = [...(options.stats || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let projectedDate = null;
  let projection = "not enough data";
  if (stats.length >= 2) {
    const first = stats[0];
    const last = stats[stats.length - 1];
    const days = daySpan(first.date, last.date);
    const subRate = days > 0 ? (last.subscribers - first.subscribers) / days : 0;
    const hourRate = days > 0 ? (last.watchHours - first.watchHours) / days : 0;
    const needSubs = Math.max(0, bar.subscribers - last.subscribers);
    const needHours = Math.max(0, bar.watchHours - last.watchHours);
    const subDays = needSubs === 0 ? 0 : (subRate > 0 ? needSubs / subRate : Infinity);
    const hourDays = needHours === 0 ? 0 : (hourRate > 0 ? needHours / hourRate : Infinity);
    const wait = Math.max(subDays, hourDays);
    if (Number.isFinite(wait)) {
      projectedDate = addDays(last.date, wait);
      projection = projectedDate;
    } else {
      projection = "not enough growth";
    }
  }
  return {
    estimate: true,
    today,
    subscribers: cleanSubs,
    watchHours: cleanHours,
    subscriberGoal: bar.subscribers,
    watchHourGoal: bar.watchHours,
    otherWatchHourGoal: bar.otherWatchHours,
    usingLater: bar.usingLater,
    effectiveOn: bar.effectiveOn,
    subscriberRatio: cleanSubs == null || !bar.subscribers ? null : cleanSubs / bar.subscribers,
    watchHourRatio: cleanHours == null || !bar.watchHours ? null : cleanHours / bar.watchHours,
    enoughData: stats.length > 0,
    enoughToProject: stats.length >= 2,
    projectedDate,
    projection
  };
}

export function viewsNeeded(targetHours, avgViewDurationMin) {
  const hours = cleanCount(targetHours);
  if (avgViewDurationMin === "" || avgViewDurationMin == null) return null;
  const minutes = Number(avgViewDurationMin);
  if (hours == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  return hours * 60 / minutes;
}

export function earnings(views, rpmLow, rpmMid, rpmHigh) {
  const count = cleanCount(views);
  const low = cleanCount(rpmLow);
  const mid = cleanCount(rpmMid);
  const high = cleanCount(rpmHigh);
  if (count == null || low == null || mid == null || high == null) return null;
  return { estimate: true, low: count / 1000 * low, mid: count / 1000 * mid, high: count / 1000 * high };
}
