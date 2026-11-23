import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function readEnvFile(text) {
  const values = {};
  for (const line of String(text || "").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

export function loadPasscode(env = process.env, fileText = null) {
  if (env.COUNTER_NOTES_PASSCODE) return env.COUNTER_NOTES_PASSCODE;
  const text = fileText == null && existsSync(join(process.cwd(), ".env"))
    ? readFileSync(join(process.cwd(), ".env"), "utf8")
    : fileText;
  return readEnvFile(text || "").COUNTER_NOTES_PASSCODE || "";
}

export function isLoopback(address) {
  const ip = String(address || "").replace(/^::ffff:/i, "");
  return ip === "127.0.0.1" || ip === "::1";
}

export function allowsPasscode({ header, expected }) {
  if (!expected) return false;
  return String(header || "") === expected;
}

export function researchHeaders(extra = {}) {
  const headers = { ...extra };
  const code = loadPasscode();
  if (code) headers["x-counter-notes-passcode"] = code;
  return headers;
}
