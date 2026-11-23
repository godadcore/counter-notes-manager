# A clean first commit

Do these steps yourself. They are not run from this file.

The old history of this folder contains Setup screenshots and the channel list. A public first commit should not include that history. Make a new YouTube key and a new site password first. Put them only in `.env`. Do not paste them into a terminal command that gets saved.

1. Close the site and the research service so no file is locked.
2. Copy `.env` somewhere outside this folder. Check that the copy is not inside the project.
3. In this folder, confirm Git ignores the secret file:

```bash
git check-ignore -v .env
```

The line it prints must name `.gitignore`. If it does not, stop.

4. Create a new empty folder. Copy the project into it, but leave out `.git`, `node_modules`, `ml/.venv`, `data/*.sqlite`, `data/backups`, and `.env`.
5. In the new folder:

```bash
git init
git add .
git status
```

6. Read `git status`. It must not list `.env`, a `.sqlite` file, or a `.pyc` file. If it does, stop and fix `.gitignore`.
7. Commit:

```bash
git commit -m "First public copy of Counter Notes."
```

8. Create a new empty GitHub repository. Do not let GitHub add a README, because this folder already has one.
9. Add that repository as `origin` and push the new `main` branch. Do not force-push the old history.
10. On GitHub, add Actions secrets named `COUNTER_NOTES_URL` and `COUNTER_NOTES_PASSCODE`. Add the same password and `YOUTUBE_API_KEY` on the host. Never put the values in the repository.
11. Put `.env` back in the new folder on your computer only. Run `npm install`. The database file stays on your computer until you run `npm run db:push` with your Turso token.
