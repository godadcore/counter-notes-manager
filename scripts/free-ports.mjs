import { execSync } from "node:child_process";

const ports = [5174, 8765];

function listeningPids(port) {
  const out = execSync("netstat -ano", { encoding: "utf8" });
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const local = parts[1] || "";
    const pid = parts[parts.length - 1] || "";
    if (!local.endsWith(":" + port)) continue;
    if (!/^\d+$/.test(pid) || Number(pid) < 10) continue;
    pids.add(pid);
  }
  return [...pids];
}

for (const port of ports) {
  const pids = listeningPids(port);
  if (!pids.length) {
    console.log("Port " + port + " is free.");
    continue;
  }
  for (const pid of pids) {
    execSync("taskkill /F /PID " + pid);
  }
  console.log("Port " + port + " was in use. Freed it by stopping process " + pids.join(", ") + ".");
}
