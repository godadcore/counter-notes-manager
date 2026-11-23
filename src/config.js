export const config = {
  channelName: "Counter Notes",
  cadence: { min: 4, max: 7, default: 4 },
  cadenceRangeLabel: "4 to 7",
  thresholds: {
    subscribers: 1000,
    watchHoursNow: 4000,
    watchHoursLater: 8000,
    laterEffectiveOn: "2027-02-01",
    defaultWatchHours: 8000
  },
  videoTool: "generic",
  video: {
    toolName: "generic",
    maxClipSeconds: 8,
    detail: "normal"
  }
};

export function clampCadence(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return config.cadence.default;
  return Math.min(config.cadence.max, Math.max(config.cadence.min, number));
}
