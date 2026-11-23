# Backup

The live notes stay in Turso. The daily GitHub Action downloads a copy and encrypts it before upload. The file in the Action is named `counter-notes.sqlite.enc`. It is not a database you can open directly.

The encryption key is the GitHub secret `BACKUP_KEY`. The same name can live in your `.env` on this computer. Do not put the key in the repository. GitHub will not show the secret back to you, so keep your own copy in `.env`.

## Save a copy by hand

On the real site, download `GET /api/backup` with the site password. That file is a normal SQLite database. It is not encrypted. Keep it somewhere private.

## Restore an Action backup

1. Open the Action run and download `counter-notes-backup`.
2. Put `BACKUP_KEY` in the environment of that computer. Do not paste the key into the command line if your shell saves history. Read it from `.env` instead.
3. Decrypt:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -salt -in counter-notes.sqlite.enc -out counter-notes.sqlite -pass env:BACKUP_KEY
```

4. Open the SQLite file with any SQLite browser, or copy the tables back into Turso with `npm run db:push` after you point that command at this file. `npm run db:push` reads the local database path. Set `COUNTER_NOTES_DB` to the decrypted file, and set the Turso names, then run it. Do not paste the token into the command.

The decrypted file is your data. Do not commit it.
