# How Counter Notes works

This is a private notebook for one YouTube channel, Counter Notes. It helps you pick a brand story, check the numbers, and copy the prompts you paste into other tools. It does not upload videos.

The words on the screen live in `src/copy.js`. On this computer the saved work lives in `data/counter-notes.sqlite`. When `TURSO_DATABASE_URL` is set, the Node API uses that Turso database instead, and a phone can open the hosted site without this computer being on the same Wi-Fi. The local file is still the copy you push from.

## Today

Today is the page you open to make one video.

It shows the video you picked, its status (Queued, Script written, Ready to post, or Posted), and four copy boxes: Research, Video, Thumbnail, and Fact check. If a number on that video still needs a check, the Video box stays locked and the page says "Check the numbers first."

Under that, Today shows the research notes for the picked video when a research run has been saved. The notes include three lists:

- Top 10: videos whose titles use a strong word (closing, collapse, decline, and words like those) and that have at least 50,000 views. At most 3 come from one channel, and the list stops at 10.
- Same topic: videos whose titles name the brand, scored the same way, even if the title has no niche word.
- Too small to count: videos that would have made a list but have fewer than 50,000 views.

Each Top 10 row has an Ignore button. Ignored videos stay out of the next list. They still count in that channel's normal-views number.

You can run research, mark the prompt used, change the status, and open a series part. A title line warns you when the title uses a number that is not confirmed. The app does not replace your saved title by itself.

The video list and the prompt wording start in `src/data.js`. Status, checks, series parts, and the saved research notes come from the SQLite file. The lists are rebuilt by the research service in `ml/` from videos it already saved. Rebuilding a list does not spend YouTube quota. A fresh research run does.

## Plan

Plan shows the 30-day posting calendar from `src/data.js`, the videos-per-week choice (4, 5, 6, or 7), and whether each day is marked done.

You can mark a day done, mark a video Posted, split a topic into one video or a series, and open a part on Today. A series decision is saved in SQLite. Each part has a hook, key points, a cliffhanger, and a slot in the week.

The weekly review on this page lets you type click-through rate, impressions, average view duration, and a retention curve. Those numbers are saved in SQLite and compared with this channel's own median. The page does not pull them from YouTube.

## Proof

Proof lists every number that still needs a check, one card per number, grouped by video.

A card shows the number, the claim, a box to paste a link, and two choices: Mark confirmed, or Leave as check this. Mark confirmed stays off until the box has a full http or https link. The site name and the date are filled in from the link and from today's date. They show as a small line after you press Check this link. There are no boxes named Link name or Link date.

Check this link asks the research service to read the page (including a text PDF) and see if the number sits next to the claim and a year. If the research service is off, the check cannot confirm anything. Mark confirmed still asks you to decide. A number stays "check this" until you confirm it. The app does not invent a confirmed figure.

Findings and their sources live in the SQLite `findings` table.

## Numbers

Numbers is a calculator. You type subscribers, watch hours, video length, RPM, and a retention curve. The page shows two monetization bars from `src/config.js`: 1,000 subscribers and 4,000 watch hours (the bar in force now), and 1,000 subscribers and 8,000 watch hours (from 2027-02-01). It also estimates views you still need, a pay range, and a topic score from weights you set.

Every figure is an estimate from what you typed. If there are no saved channel stats, the page says there is not enough data. Nothing here is downloaded from YouTube.

## Character

Character shows three pictures that ship with the site: the logo, a sample thumbnail, and the illustrated host. You do not edit them on this page. The picture files are `Logo.png`, `Thumbnail.png`, and `Character.png` in the public folder. The host description used inside prompts is the `CHARACTER` text in `src/data.js`.

## Setup

Setup is where you keep the research niche. Two boxes: keywords, one per line, and channels, one per line as `Name | channel id`.

You press Save. The list is stored in SQLite and sent to the research service. The hint under the keyword box shows the starter keywords from `src/data.js`. Those starter words are not the same as the saved list until you save them.

The research service searches YouTube with those keywords and reads the saved channel ids. It does not search for a channel by name after you have saved the id.

## The daily steps

1. Open Today and pick the video you will make.
2. Open Proof. For each number, paste a real page and check it. Mark it confirmed only when the page supports it. Leave it as check this when it does not.
3. Go back to Today. If the video box is locked, a number still needs a check.
4. Read the title warning. Keep your saved title. Use the suggested wording only if you want to.
5. Copy the research, video, thumbnail, and fact-check prompts. Make the video in your other tools.
6. Mark the prompt used, then mark the video Posted on Plan when it is live.
7. On Plan, mark the day done and, once a week, type the real results into the weekly review.
8. On Numbers, type the latest subscriber and watch-hour counts when you have them.
9. On Setup, change keywords or channel ids only when the niche should change. Then run research again from Today.

Research does not start by itself inside Python. A GitHub Action can wake the host and run it once a day. Until the site has a public address, that action has nowhere to call.

## What is built

These labels are from the code in this folder, not from old notes.

### DONE

- Six pages: Today, Plan, Proof, Numbers, Character, Setup. Phone menu is a left drawer. There is no bottom tab bar.
- One SQLite file for statuses, proof, cadence, series, weekly results, channel stats, niche, and research notes.
- One password for the site and the API, including this computer. The password is `COUNTER_NOTES_PASSCODE`. If it is missing, or the request does not send it, the API answers 401.
- Series split into one video or several parts, with the reason saved.
- Proof cards, paste-a-link, Mark confirmed, and Leave as check this. The site name and date come from the link and from today.
- Numbers calculator and the two monetization bars. Empty stats say there is not enough data.
- Character pictures on the Character page.
- Setup save for keywords and channel ids.
- Research scoring: videos under 3 minutes are left out of the scores. A channel needs 15 videos that are at least 3 minutes long. The score is views divided by that channel's normal views. Top 10 needs a strong word in the title, at least 50,000 views, at most 3 per channel, and at most 10 total. Same-topic and too-small lists follow the same view floor.
- Ignore on each Top 10 row, and an Ignored videos list with Undo. The choice is saved and the lists are rebuilt from the cache. That rebuild does not spend YouTube quota.
- Comment themes for a fixed set of phrases, plus the line that comments are opinions and not proof.
- News notes from publisher RSS feeds, not from Google News.
- A YouTube quota guard that stops before the daily reserve is used up.
- Title warning on Today. The saved title is not overwritten.
- Copy buttons, toasts, and a weekly review form.

### PARTIAL

- Check this link only confirms a number when the research service is running and the page actually shows the number beside the claim and a year. A failed check leaves the number as check this.
- The "Research is on / Research is off" line stays hidden until the first health check returns, so a slow start does not flash "Research is off".
- The daily research job is a GitHub Action. It wakes the host, tries up to 3 times, and runs research once. Python does not keep its own timer.
- On this computer, the phone and the computer share the local file only while this computer is awake and the site is running. With Turso and a host, they share that database instead.
- The first load says "Waking up, wait 1 minute." until the server answers.
- Comment themes are counted on the comments the service fetched (up to 100, most relevant) from the most-viewed same-topic videos. Those videos can be under 3 minutes. Shorts are left out of the scores, but they can still be the comment source.
- News is one publisher-RSS path. It does not read every business site, and it does not mark a number confirmed by itself.
- The suggested title is display-only.
- A fresh research run spends YouTube quota. List rebuilds do not. The quota counter is in the SQLite file and is not reset by opening the site.
- Sentence embeddings stay off unless `COUNTER_NOTES_EMBEDDINGS=1`. The default research install does not download that model.
- The GitHub Action does nothing useful until the site has a public address and the two Actions secrets are set.

### MISSING

- A host that stays up when this computer is off. The steps are written in docs/deploy.md. The Render service is created from this repo in Frankfurt. Until that URL answers in a browser, treat the host as not checked.
- Turso is connected when the two Turso variables are set. A test row was written and deleted, `npm run db:push` copied 16 tables, the counts matched, and one research run wrote its log on Turso. `GET /api/backup` still downloads a SQLite copy when the password is sent.
- Uploading a video to YouTube.
- A built-in AI that writes the script. The app only copies prompts.
- A paid host. The free setup is `render.yaml` plus the Dockerfile. A paid plan is not set up.
- Pulling subscribers, watch hours, or retention from the YouTube Studio API. You type those on Numbers and Plan.
