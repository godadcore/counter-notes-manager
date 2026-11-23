# Learn the app

Counter Notes is a private notebook for one YouTube channel. You use it to pick a brand story, check the numbers, and copy prompts. You still write the script, make the video, and post it yourself.

## Open it

On your computer, run the site and open the address it prints. The first screen asks for the site password. Nothing else loads until the password matches.

On a phone, use the same address. A free host sleeps when nobody visits. The first screen then says "Waking up, wait 1 minute." Wait, then type the password.

## The six pages

- Today. Pick the video. Copy the research, video, thumbnail, and fact-check prompts. Read the saved lists under the prompt. Press Run research when you want a new pull. That spends YouTube quota.
- Plan. See the 30 days. Mark a day done. Split a topic into one video or a series. Type the weekly review numbers yourself.
- Proof. One card for each number that is not confirmed. Paste a full link, press Check this link, then Mark confirmed or Leave as check this. A number stays "check this" until you confirm it.
- Numbers. Type subscribers and watch hours. The bars are an estimate. The app does not download them.
- Character. The logo, a sample thumbnail, and the host.
- Setup. The search phrases and the channel ids. Save them once. Later research runs reuse them.

The phone has a menu button in the top bar. There is no bar of tabs at the bottom.

## What the research line means

The line stays hidden until the research service answers.

- "Research is on" means the service is up and no job is running.
- "Research is off" means the service did not answer.
- "Research is running." means a job is in progress. When the job knows the topic, the line adds "On" and the topic name.

You can close the page. The job keeps going. When you come back, the line is still there until the job finishes.

## A normal day

1. Open Today and read the title warning. If it says a number is not confirmed, open Proof first.
2. On Proof, paste a link that shows the number, the claim, and a year. Confirm it only when you have checked the page.
3. Go back to Today and copy the prompt you need.
4. After you post, open Plan and mark that day done. Type the weekly numbers when you have them.

## Backup

The live notes are in Turso when that database is set, or in the SQLite file on your computer when it is not. Download a spare copy from the backup action, or from `GET /api/backup` with the password. That file is a copy. It is not the live database.

Do not put the password, the YouTube key, or the Turso token in git.
