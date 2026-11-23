import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const win = process.platform === "win32";
const venvPython = win ? "ml/.venv/Scripts/python.exe" : "ml/.venv/bin/python";
const python = existsSync(venvPython) ? venvPython : (win ? "python" : "python3");

const child = spawn(python, ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8765", "--app-dir", "ml"], {
  stdio: "inherit",
  env: process.env,
  shell: false
});

child.on("exit", (code) => process.exit(code || 0));
