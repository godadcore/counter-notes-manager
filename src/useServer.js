import { useCallback, useEffect, useState } from "react";

function passcode() {
  return sessionStorage.getItem("cn-passcode") || "";
}

async function request(path, body, method) {
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  const code = passcode();
  if (code) headers["x-counter-notes-passcode"] = code;
  const response = await fetch(path, {
    method: method || (body ? "POST" : "GET"),
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The laptop could not save that.");
    error.code = data.code || "";
    throw error;
  }
  return data;
}

function parseStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function readBrowserStore() {
  const keys = ["cn-status-v2", "cn-cadence-v1", "cn-days-v2"];
  if (!keys.some((key) => localStorage.getItem(key) != null)) return null;
  return {
    statuses: parseStored("cn-status-v2", {}),
    cadence: parseStored("cn-cadence-v1", null),
    days: parseStored("cn-days-v2", {})
  };
}

function readToolStore() {
  const hasChecks = localStorage.getItem("cn-audit-v2") != null;
  const stack = parseStored("cn-stack-v1", null);
  const hasQueue = stack && Array.isArray(stack.queue) && stack.queue.length > 0;
  if (!hasChecks && !hasQueue) return null;
  return {
    factChecks: hasChecks ? parseStored("cn-audit-v2", {}) : {},
    queue: hasQueue ? stack.queue : []
  };
}

export function useServer() {
  const [state, setState] = useState(null);
  const [problem, setProblem] = useState(null);

  const refresh = useCallback(async () => {
    const next = await request("/api/state");
    setState(next);
    setProblem(null);
    return next;
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const local = readBrowserStore();
        if (local) {
          await request("/api/import-local", local, "POST");
          localStorage.removeItem("cn-status-v2");
          localStorage.removeItem("cn-cadence-v1");
          localStorage.removeItem("cn-days-v2");
        }
        const tools = readToolStore();
        if (tools) {
          await request("/api/import-tools", tools, "POST");
          localStorage.removeItem("cn-audit-v2");
          const stack = parseStored("cn-stack-v1", null);
          if (stack && typeof stack === "object") {
            stack.queue = [];
            localStorage.setItem("cn-stack-v1", JSON.stringify(stack));
          }
        }
        if (!cancel) await refresh();
      } catch (error) {
        if (!cancel) setProblem({ message: error.message, code: error.code || "" });
      }
    })();
    return () => { cancel = true; };
  }, [refresh]);

  async function change(path, body, method) {
    const next = await request(path, body, method);
    setState(next);
    return next;
  }

  return {
    state,
    problem,
    setPasscode: async (value) => {
      sessionStorage.setItem("cn-passcode", value);
      setProblem(null);
      try {
        await refresh();
      } catch (error) {
        setProblem({ message: error.message, code: error.code || "" });
      }
    },
    setStatus: (id, status) => change("/api/topics/" + id + "/status", { status }, "PUT"),
    setCadence: (cadence) => change("/api/cadence", { cadence }, "PUT"),
    setDay: (day, done) => change("/api/days/" + day, { done }, "PUT"),
    setFindingUrl: (id, sourceUrl) => change("/api/findings/" + id, { sourceUrl }, "PUT"),
    reviewFinding: (id, body) => change("/api/findings/" + id, body, "PUT"),
    checkLink: (id, sourceUrl) => change("/api/findings/" + id + "/check", { sourceUrl }, "POST"),
    saveQueue: (queue) => change("/api/queue", { queue }, "PUT"),
    setFactCheck: (videoId, key, checked) => change("/api/checks", { videoId, key, checked }, "PUT"),
    saveWeights: (weights) => change("/api/weights", weights, "PUT"),
    saveNumbers: (inputs) => change("/api/numbers", inputs, "PUT"),
    saveVideoSettings: (settings) => change("/api/video-settings", settings, "PUT"),
    savePerformance: (row) => change("/api/performance", row, "PUT"),
    splitTopic: (topicId) => change("/api/series", { topicId }, "POST"),
    saveNiche: (niche) => change("/api/niche", niche, "PUT"),
    runResearch: (topicId) => request("/api/research/run", topicId ? { topicId } : {}, "POST"),
    reload: refresh,
    ignoreWinner: (topicId, videoId) => change("/api/winners/ignore", { topicId, videoId }, "POST"),
    restoreWinner: (topicId, videoId) => change("/api/winners/restore", { topicId, videoId }, "POST"),
    addStat: (row) => change("/api/stats", row, "POST"),
    logEvent: (entry) => change("/api/audit", entry, "POST")
  };
}
