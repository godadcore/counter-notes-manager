# Deploy for free

Each step costs 0. You do not enter a card. If a site asks for a card, stop and leave. The host region is Frankfurt, the same region as the Turso database.

The computer you use today can be off after this works. A free web host sleeps when nobody visits. It also forgets files when it sleeps. That is why the database cannot stay as a file on the host.

## What is saved today

The real notes, proof, and research cache are in `data/counter-notes.sqlite` on this computer. Only the Node API opens that file. The Python service sends SQL to the Node API.

## The database

Turso is the free database for this app. The Node API uses `@libsql/client` for a local file and for Turso. Supabase speaks Postgres, so every query would have to be rewritten.

Leave `TURSO_DATABASE_URL` empty on this computer and the app uses the local file. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` and the same code uses Turso. That connection was opened: a test row was written and deleted, `npm run db:push` copied 16 tables, and the table counts matched. One research run then added rows on Turso only. You copy the local file yourself with `npm run db:push`. Do not paste the token into the command.

`GET /api/backup` writes a fresh SQLite copy and downloads it. The request must send the password. The GitHub Action encrypts that copy before upload. See [backup.md](backup.md). The encrypted file is a spare. It is not the live database.

## What runs in the background

Python does not start a daily job. The GitHub Action at 08:15 UTC wakes the host, tries up to 3 times, waits 30 seconds between tries, and calls `POST /api/research/run` once. A failed try prints which attempt failed. The research code still stops before the YouTube quota reserve. The Run research button on Today does the same job after the host is awake.

## 1. Password

In the host's environment settings, add `COUNTER_NOTES_PASSCODE`. Invent a long password. Do not put it in git. The same name goes in GitHub Actions secrets.

Without that value, the API returns 401 for every request, including from this computer.

## 2. Turso

1. Open https://turso.tech and sign in with GitHub. Cost: 0. Do not add a card.
2. Click Create database. Name it `counter-notes`. Pick Frankfurt, so it sits next to the Render service. The free plan is enough.
3. Create a token. Put the database URL and the token in the host as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Do not put them in git.
4. On this computer, set those two names in the environment and run `npm run db:push`. Do not paste the token into the command. The script copies the local file into that database. If either name is missing, it stops and copies nothing.

## 3. GitHub

1. Create a new empty repository on GitHub. Do not add a license in the website form if this folder already has `LICENSE`.
2. Push this folder only after you have checked `.env` is not in the commit. `git check-ignore -v .env` should print a gitignore rule.
3. Open Settings, then Secrets and variables, then Actions. Add `COUNTER_NOTES_URL` (the https address from Render, with no slash at the end) and `COUNTER_NOTES_PASSCODE` (the same password as the host).
4. The workflow file is `.github/workflows/research.yml`. It runs every day and you can also click Run workflow. Until the URL secret exists, the job fails, and that is expected.

## 4. Render

1. Open https://render.com and sign in with GitHub. Cost: 0. If Render asks for a card, do not continue. The free web service must say $0.
2. Click New, then Web Service. Pick this repository.
3. Runtime: Docker. The repo has a `Dockerfile` and `render.yaml`. Region: Frankfurt. Instance type: Free.
4. Start command: `npm start` (the Dockerfile already runs that).
5. The free instance sleeps after about 15 minutes of no visits. The first visit shows "Waking up, wait 1 minute."
6. Environment variables, names only in this repo, values only on Render:
   - `COUNTER_NOTES_PASSCODE`
   - `YOUTUBE_API_KEY`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `NODE_VERSION` set to `22`
7. Click Create Web Service. The first deploy is still $0.
8. Open the URL. The password page should appear. A request with no password should not show your videos.

Render's free Python install may be Python 3.11 or 3.12. The research code uses the standard library and the packages in `ml/requirements.txt`. If the build log says a package failed, stop. Do not add a paid instance to skip the error.

## What can break online

- Some news sites block a data-center address. The research code already stops when robots.txt says no. A block is a failed source, not a confirmed number.
- The Python service is a second process inside `npm start`. If it crashes, the page still loads and says research is off. Check this link, Ignore, and Undo need that process.
- Free hosts have no durable disk. A SQLite file written on Render disappears. Do not treat the host disk as the database.
- The free instance has 512 MB of RAM. During a real 4-topic research run on this computer, the preview process peaked at 99.7 MB and the Python process peaked at 270.9 MB. Those separate peaks add to 370.6 MB, under 450 MB. If Render kills the process, the page should still open and research should say it is off after the health check returns.
- Windows paths are not used by `npm start`. It picks `ml/.venv/bin/python` on Linux and `ml/.venv/Scripts/python.exe` on Windows.

## Keep the daily job switched on

GitHub turns off scheduled Actions in a public repository after 60 days with no activity in the repo. A push, or running the Daily research workflow by hand, counts as activity. Do one of those at least every 60 days. The schedule cannot wake itself after GitHub has switched it off.
