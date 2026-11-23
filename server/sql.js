import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

export function databasePath() {
  if (process.env.COUNTER_NOTES_DB) return process.env.COUNTER_NOTES_DB;
  const name = process.env.COUNTER_NOTES_DEMO === "1" ? "demo.sqlite" : "counter-notes.sqlite";
  return join(process.cwd(), "data", name);
}

export function databaseUrl() {
  if (process.env.COUNTER_NOTES_DEMO === "1") return pathToFileURL(databasePath()).href;
  const remote = String(process.env.TURSO_DATABASE_URL || "").trim();
  if (remote) return remote;
  return pathToFileURL(databasePath()).href;
}

export function isFileDatabase(url = databaseUrl()) {
  return url.startsWith("file:");
}

function plainArgs(args) {
  return args.map((value) => (value === undefined ? null : value));
}

function plainRows(result) {
  const names = result.columns || [];
  return result.rows.map((row) => {
    const out = {};
    if (names.length) {
      names.forEach((name, index) => {
        out[name] = row[index];
      });
      return out;
    }
    for (const key of Object.keys(row)) out[key] = row[key];
    return out;
  });
}

export async function createDb(url) {
  if (url.startsWith("file:") && !url.includes(":memory:")) {
    mkdirSync(dirname(fileURLToPath(url)), { recursive: true });
  }
  const remote = !url.startsWith("file:");
  const token = String(process.env.TURSO_AUTH_TOKEN || "").trim();
  const client = createClient({ url, authToken: remote && token ? token : undefined });
  let tx = null;

  function runner() {
    return tx || client;
  }

  return {
    url,
    prepare(sql) {
      return {
        async get(...args) {
          const result = await runner().execute({ sql, args: plainArgs(args) });
          return plainRows(result)[0];
        },
        async all(...args) {
          const result = await runner().execute({ sql, args: plainArgs(args) });
          return plainRows(result);
        },
        async run(...args) {
          await runner().execute({ sql, args: plainArgs(args) });
        }
      };
    },
    async exec(sql) {
      const command = sql.trim().replace(/;+\s*$/, "").toUpperCase();
      if (command === "BEGIN") {
        if (!tx) tx = await client.transaction("write");
        return;
      }
      if (command === "COMMIT") {
        if (tx) {
          await tx.commit();
          tx = null;
        }
        return;
      }
      if (command === "ROLLBACK") {
        if (tx) {
          await tx.rollback();
          tx = null;
        }
        return;
      }
      if (tx) throw new Error("A script cannot run inside an open transaction.");
      await client.executeMultiple(sql);
    },
    close() {
      client.close();
    }
  };
}
