import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeBackup } from "./backup.js";
import { database, databaseFile, addStat, checkPastedLink, ignoreWinner, importBrowserTools, importLocal, logEvent, readState, researchJob, restoreWinner, reviewFinding, saveSplit, setCadence, setDay, setFactCheck, setFindingUrl, setNiche, setNumbersInputs, setPerformance, setQueue, setStatus, setVideoSettings, setWeights, startResearch } from "./db.js";
import { allowsPasscode, loadPasscode, researchHeaders } from "./passcode.js";

function plainRow(row) {
  if (!row) return null;
  const out = {};
  for (const key of Object.keys(row)) out[key] = row[key];
  return out;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("That was not valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

export async function handleApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  if (!path.startsWith("/api/")) return false;
  const allowed = allowsPasscode({
    remoteAddress: req.socket?.remoteAddress,
    header: req.headers["x-counter-notes-passcode"],
    expected: loadPasscode()
  });
  if (!allowed) {
    send(res, 401, { error: "Passcode required.", code: "PASSCODE" });
    return true;
  }
  const db = await database();
  const method = req.method || "GET";

  if (method === "GET" && path === "/api/state") {
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "GET" && path === "/api/backup") {
    const day = new Date().toISOString().slice(0, 10);
    const dest = join(process.cwd(), "data", "backups", "counter-notes-" + day + ".sqlite");
    mkdirSync(dirname(dest), { recursive: true });
    rmSync(dest, { force: true });
    await writeBackup(db, dest);
    res.statusCode = 200;
    res.setHeader("content-type", "application/octet-stream");
    res.setHeader("content-disposition", "attachment; filename=\"counter-notes-" + day + ".sqlite\"");
    res.end(readFileSync(dest));
    return true;
  }
  if (method === "GET" && path === "/api/research/health") {
    let on = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch("http://127.0.0.1:8765/health", { signal: controller.signal, headers: researchHeaders() });
      const data = await response.json().catch(() => ({}));
      on = response.ok && data.ok === true;
    } catch {
      on = false;
    } finally {
      clearTimeout(timer);
    }
    send(res, 200, { on });
    return true;
  }
  if (method === "GET" && path === "/api/research/status") {
    try {
      send(res, 200, await researchJob());
    } catch {
      send(res, 200, { running: false, topicName: "", error: "", done: false, topics: 0, id: 0 });
    }
    return true;
  }

  const body = method === "GET" ? {} : await readBody(req);
  const topicStatus = path.match(/^\/api\/topics\/(\d+)\/status$/);
  const day = path.match(/^\/api\/days\/(\d+)$/);
  const finding = path.match(/^\/api\/findings\/(\d+)$/);
  const proofCheck = path.match(/^\/api\/findings\/(\d+)\/check$/);

  if (method === "PUT" && topicStatus) {
    await setStatus(db, Number(topicStatus[1]), body.status);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/cadence") {
    await setCadence(db, body.cadence);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && day) {
    await setDay(db, day[1], !!body.done);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && finding) {
    if (body.accept === true || body.accept === false) await reviewFinding(db, Number(finding[1]), body);
    else await setFindingUrl(db, Number(finding[1]), body.sourceUrl);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/queue") {
    await setQueue(db, body.queue);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/checks") {
    await setFactCheck(db, body.videoId, body.key, !!body.checked);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/weights") {
    await setWeights(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/numbers") {
    await setNumbersInputs(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "POST" && path === "/api/stats") {
    await addStat(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "POST" && path === "/api/audit") {
    await logEvent(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "POST" && path === "/api/import-local") {
    send(res, 200, await importLocal(db, body));
    return true;
  }
  if (method === "POST" && path === "/api/import-tools") {
    send(res, 200, await importBrowserTools(db, body));
    return true;
  }
  if (method === "POST" && path === "/api/series") {
    await saveSplit(db, Number(body.topicId));
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/video-settings") {
    await setVideoSettings(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/performance") {
    await setPerformance(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "PUT" && path === "/api/niche") {
    await setNiche(db, body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "POST" && proofCheck) {
    await checkPastedLink(db, Number(proofCheck[1]), body);
    send(res, 200, await readState(db));
    return true;
  }
  if (method === "POST" && path === "/api/internal/sql") {
    const sql = String(body.sql || "");
    const args = Array.isArray(body.args) ? body.args : [];
    const mode = String(body.mode || "all");
    if (!sql.trim()) {
      send(res, 400, { error: "Missing SQL." });
      return true;
    }
    try {
      if (mode === "exec") {
        await db.exec(sql);
        send(res, 200, { ok: true });
      } else if (mode === "get") {
        send(res, 200, { row: plainRow(await db.prepare(sql).get(...args)) });
      } else if (mode === "run") {
        await db.prepare(sql).run(...args);
        send(res, 200, { ok: true });
      } else {
        send(res, 200, { rows: (await db.prepare(sql).all(...args)).map(plainRow) });
      }
    } catch (error) {
      send(res, 400, { error: error.message || "The database rejected that." });
    }
    return true;
  }
  if (method === "POST" && path === "/api/research/run") {
    try {
      send(res, 200, await startResearch(body.topicId));
    } catch (error) {
      send(res, 400, { error: error.message || "Research did not start." });
    }
    return true;
  }
  if (method === "POST" && path === "/api/winners/ignore") {
    send(res, 200, await ignoreWinner(db, body));
    return true;
  }
  if (method === "POST" && path === "/api/winners/restore") {
    send(res, 200, await restoreWinner(db, body));
    return true;
  }

  send(res, 404, { error: "Unknown request." });
  return true;
}
