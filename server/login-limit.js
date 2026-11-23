export const FAIL_WINDOW_MS = 10 * 60 * 1000;
export const BLOCK_MS = 15 * 60 * 1000;
export const FAIL_LIMIT = 5;

const buckets = new Map();

export function resetLoginLimits() {
  buckets.clear();
}

export function clientPlace(headers = {}, socketAddress = "") {
  const forwarded = String(headers["x-forwarded-for"] || "");
  const hops = forwarded.split(",").map((item) => item.trim()).filter(Boolean);
  const last = hops[hops.length - 1];
  return String(last || socketAddress || "unknown").replace(/^::ffff:/i, "");
}

export function reviewLogin({ place, header, expected, now = Date.now(), store = buckets }) {
  const key = String(place || "unknown");
  const current = store.get(key);
  if (current && current.blockedUntil && now < current.blockedUntil) {
    return { ok: false, status: 429, code: "LOCKED" };
  }
  if (current && current.blockedUntil && now >= current.blockedUntil) store.delete(key);

  const presented = String(header || "");
  const wanted = String(expected || "");
  if (!wanted) return { ok: false, status: 401, code: "PASSCODE" };
  if (presented && presented === wanted) {
    store.delete(key);
    return { ok: true };
  }
  if (!presented) return { ok: false, status: 401, code: "PASSCODE" };

  const fresh = store.get(key);
  const failures = (fresh && fresh.failures || []).filter((time) => now - time < FAIL_WINDOW_MS);
  failures.push(now);
  if (failures.length >= FAIL_LIMIT) {
    store.set(key, { failures: [], blockedUntil: now + BLOCK_MS });
    return { ok: false, status: 429, code: "LOCKED" };
  }
  store.set(key, { failures, blockedUntil: 0 });
  return { ok: false, status: 401, code: "PASSCODE" };
}
