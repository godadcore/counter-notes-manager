import { createClient } from "@libsql/client";
import { pathToFileURL } from "node:url";
import { openDatabase } from "../server/db.js";
import { databasePath } from "../server/sql.js";

function quote(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("Unexpected table name.");
  return '"' + name + '"';
}

export async function copyDatabase(sourceUrl, targetUrl, token) {
  const source = createClient({ url: sourceUrl });
  const target = createClient({ url: targetUrl, authToken: token || undefined });
  const master = await source.execute("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  await target.execute("PRAGMA foreign_keys = OFF");
  for (const row of master.rows) {
    if (!row.sql) continue;
    let statement = String(row.sql);
    if (!/CREATE TABLE IF NOT EXISTS/i.test(statement)) {
      statement = statement.replace(/CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
    }
    await target.execute(statement);
  }
  const names = master.rows.map((row) => String(row.name));
  const depends = new Map(names.map((name) => [name, []]));
  for (const row of master.rows) {
    const refs = [...String(row.sql || "").matchAll(/REFERENCES\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)].map((match) => match[1]);
    depends.set(String(row.name), refs.filter((name) => depends.has(name)));
  }
  const waiting = new Map(names.map((name) => [name, depends.get(name).length]));
  const ready = names.filter((name) => waiting.get(name) === 0);
  const insertOrder = [];
  while (ready.length) {
    const name = ready.shift();
    insertOrder.push(name);
    for (const [child, refs] of depends) {
      if (!refs.includes(name)) continue;
      waiting.set(child, waiting.get(child) - 1);
      if (waiting.get(child) === 0) ready.push(child);
    }
  }
  if (insertOrder.length !== names.length) throw new Error("Could not order the tables.");
  for (const name of [...insertOrder].reverse()) {
    await target.execute("DELETE FROM " + quote(name));
  }
  let tables = 0;
  for (const name of insertOrder) {
    const data = await source.execute("SELECT * FROM " + quote(name));
    const columns = data.columns || [];
    tables += 1;
    if (!columns.length || !data.rows.length) continue;
    const sql = "INSERT INTO " + quote(name) + " (" + columns.map(quote).join(", ") + ") VALUES (" + columns.map(() => "?").join(", ") + ")";
    const statements = data.rows.map((record) => ({
      sql,
      args: columns.map((column, index) => (record[index] === undefined ? null : record[index]))
    }));
    for (let index = 0; index < statements.length; index += 80) {
      await target.batch(statements.slice(index, index + 80), "write");
    }
  }
  source.close();
  target.close();
  return tables;
}

const remote = String(process.env.TURSO_DATABASE_URL || "").trim();
const token = String(process.env.TURSO_AUTH_TOKEN || "").trim();
if (process.argv[1] && process.argv[1].endsWith("db-push.mjs")) {
  if (!remote.startsWith("libsql:") && !remote.startsWith("https:")) {
    console.error("Set TURSO_DATABASE_URL to the Turso database. Nothing was copied.");
    process.exit(1);
  }
  if (!token) {
    console.error("Set TURSO_AUTH_TOKEN. The value is not printed. Nothing was copied.");
    process.exit(1);
  }
  const local = await openDatabase(databasePath());
  local.close();
  const tables = await copyDatabase(pathToFileURL(databasePath()).href, remote, token);
  console.log("Copied " + tables + " tables. No secret was printed.");
}
