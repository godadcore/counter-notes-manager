import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { readEnvFile } from "../server/passcode.js";

const values = readEnvFile(readFileSync(".env", "utf8"));
if (!process.argv[2]) {
  console.error("Name the script to run.");
  process.exit(1);
}
const child = spawn(process.execPath, process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, ...values }
});
child.on("exit", (code) => process.exit(code == null ? 1 : code));
