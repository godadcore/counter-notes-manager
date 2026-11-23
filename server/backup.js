import { rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { isFileDatabase } from "./sql.js";

function quote(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("Unexpected table name.");
  return '"' + name + '"';
}

function insertOrder(tables) {
  const names = tables.map((row) => String(row.name));
  const depends = new Map(names.map((name) => [name, []]));
  for (const row of tables) {
    const refs = [...String(row.sql || "").matchAll(/REFERENCES\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)].map((match) => match[1]);
    depends.set(String(row.name), refs.filter((name) => depends.has(name)));
  }
  const waiting = new Map(names.map((name) => [name, depends.get(name).length]));
  const ready = names.filter((name) => waiting.get(name) === 0);
  const order = [];
  while (ready.length) {
    const name = ready.shift();
    order.push(name);
    for (const [child, refs] of depends) {
      if (!refs.includes(name)) continue;
      waiting.set(child, waiting.get(child) - 1);
      if (waiting.get(child) === 0) ready.push(child);
    }
  }
  if (order.length !== names.length) throw new Error("Could not order the tables.");
  return order;
}

export async function writeBackup(db, dest) {
  if (isFileDatabase()) {
    const quoted = dest.replaceAll("\\", "/").replaceAll("'", "''");
    await db.exec("VACUUM INTO '" + quoted + "'");
    return;
  }
  rmSync(dest, { force: true });
  const copy = createClient({ url: pathToFileURL(dest).href });
  const tables = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  for (const row of tables) {
    if (!row.sql) continue;
    let statement = String(row.sql);
    if (!/CREATE TABLE IF NOT EXISTS/i.test(statement)) {
      statement = statement.replace(/CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
    }
    await copy.execute(statement);
  }
  for (const name of insertOrder(tables)) {
    const rows = await db.prepare("SELECT * FROM " + quote(name)).all();
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const sql = "INSERT INTO " + quote(name) + " (" + columns.map(quote).join(", ") + ") VALUES (" + columns.map(() => "?").join(", ") + ")";
    const statements = rows.map((row) => ({ sql, args: columns.map((column) => row[column] ?? null) }));
    for (let index = 0; index < statements.length; index += 80) {
      await copy.batch(statements.slice(index, index + 80), "write");
    }
  }
  copy.close();
}
