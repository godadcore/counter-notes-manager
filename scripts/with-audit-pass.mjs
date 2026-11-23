import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { readEnvFile } from "../server/passcode.js";

const values = readEnvFile(readFileSync(".env", "utf8"));
const passcode = values.COUNTER_NOTES_PASSCODE || "";
if (!passcode) {
  console.error("COUNTER_NOTES_PASSCODE is not set. Nothing ran.");
  process.exit(1);
}
if (!process.argv[2]) {
  console.error("Name the script to run.");
  process.exit(1);
}

const child = spawn(process.execPath, process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, AUDIT_PASSCODE: passcode, COUNTER_NOTES_DEMO: "" }
});
child.on("exit", (code) => process.exit(code == null ? 1 : code));
