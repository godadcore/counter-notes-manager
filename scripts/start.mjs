import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const win = process.platform === "win32";
const venvPython = win ? "ml/.venv/Scripts/python.exe" : "ml/.venv/bin/python";
const python = existsSync(venvPython) ? venvPython : (win ? "python" : "python3");
const port = process.env.PORT || "4174";

const research = spawn(python, ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8765", "--app-dir", "ml"], {
  stdio: "inherit",
  env: { ...process.env, COUNTER_NOTES_API: "http://127.0.0.1:" + port + "/api/internal/sql" },
  shell: false
});

const web = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0", "--port", String(port)], {
  stdio: "inherit",
  env: process.env,
  shell: false
});

function stop() {
  research.kill();
  web.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
research.on("exit", (code) => {
  web.kill();
  process.exit(code || 0);
});
web.on("exit", (code) => {
  research.kill();
  process.exit(code || 0);
});
