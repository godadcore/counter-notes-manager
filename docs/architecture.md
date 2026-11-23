# Architecture

Counter Notes is two programs and one database file.

## Pages

The browser app is React. Vite serves it. The pages are hash routes:

| Hash | Page | What it reads |
| --- | --- | --- |
| `#stack` | Today | Topics, findings, series, and the saved research dossier |
| `#plan` | Plan | The 30-day plan in `src/data.js`, plus saved days, series, and weekly results |
| `#sources` | Proof | Findings that still need a check |
| `#numbers` | Numbers | Channel stats and calculator inputs you typed |
| `#hub` | Character | Picture files in `public/` |
| `#setup` | Setup | The niche keywords and channel ids in the database |

`src/App.jsx` picks the page. `src/useServer.js` loads `/api/state` and sends changes back. Words on the screen come from `src/copy.js`.

## The Node server

`server/attach.js` hangs the API on the Vite dev server and on `vite preview`. `server/api.js` is the list of routes. `server/db.js` is the only code that opens the database. It uses `@libsql/client`.

With no Turso variables, the URL is the local file `data/counter-notes.sqlite`. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` and the same code opens that Turso database instead. Set `COUNTER_NOTES_DB` to use another local file. Set `COUNTER_NOTES_DEMO=1` to use `data/demo.sqlite` and, when the niche list is empty, fill it from `data/sample-demo.json`. That sample file has no real channel.

`data/*.sqlite` is gitignored. A fresh clone starts empty, then `server/seed.js` copies the topic list from `src/data.js` into the new file. The niche list stays empty until you save Setup, or until demo mode fills the sample list.

## The research service

`ml/app.py` is a FastAPI app. The Node server calls it at `http://127.0.0.1:8765` for a research run, an ignore, and a pasted-link check. The status line stays hidden until the first health check returns. It then says "Research is on" or "Research is off". While a job is running it says "Research is running." and adds the topic name when the job has one.

The service does not open the database file. It sends each statement to `POST /api/internal/sql` on the Node API, with the same password. Node stores dossiers, a video cache, a quota counter, and ignored video ids. Scoring rules live in `ml/counter_notes/core.py`. Fetching lives in `ml/counter_notes/collect.py`.

A list rebuild uses the cache. It does not call YouTube. A new research run does call YouTube when `YOUTUBE_API_KEY` is set, and it stops before the daily reserve is used up.

## The daily job

Python does not start a daily thread. A sleeping host cannot spend YouTube quota by waking up on its own.

The daily run is the GitHub Action in `.github/workflows/research.yml`. It wakes the host, tries up to 3 times, waits 30 seconds between tries, and then calls research once. The research code still stops before the quota reserve.

There is also a Run research button on Today. That button works only while the Python process is up.

## What has to stay running

- The Node site, for any page, and for every database call.
- The Python service, for research, ignore, and link checks.
- Either this computer, for the local file, or Turso, when those two variables are set. A live Turso database was used: the app wrote a probe row, `npm run db:push` copied 16 tables with matching counts, and one research run wrote its log rows on Turso.
