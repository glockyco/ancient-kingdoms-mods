---
name: ancient-kingdoms-save-files
description: Use when inspecting, unpacking, backing up, repairing, or runtime-verifying Ancient Kingdoms save files.
---

# Ancient Kingdoms Save Files

Use this for any work on Ancient Kingdoms save data, especially `game.dat` in the CrossOver/Steam install. Save files are player-owned state: optimize for reversibility, evidence, and minimal mutation.

## Non-negotiables

- Never include the SQLCipher key in skills, docs, commits, issue text, or final reports.
- Never run exploratory writes against the live database. Inspect a copied/plaintext export first.
- Never trust a single check. Verify with SQLite/SQLCipher integrity checks and, when practical, HotRepl/runtime load checks.
- Never call game APIs that save or update `lastsaved` just to inspect data unless the user explicitly accepts that mutation.

## Locate the save

Resolve the save path and create verified backups through `build-tool/Game/PlayerSave.cs:DatabasePath` and `build-tool/Game/PlayerSave.cs:Create`; load configuration keys through `build-tool/Configuration/LocalConfigLoader.cs:Load`.

## Find the SQLCipher key

Do not ask the user for the key and do not record it in repo files. Derive it from current game/decompiled code:

- Search `server-scripts/Database.cs` for `new SQLiteConnection(GameManager.pathFileDB, ...)` or `PRAGMA key`.
- If server scripts are stale, update/decompile scripts first using the game-version workflow, then inspect `Database.ConnectInternal`.
- Put the key in a local shell variable or environment variable for the current command only, e.g. `AK_SQLCIPHER_KEY`, and avoid writing it to files.

The key must be set before the first database read. Test it with a harmless schema read before continuing.

## Unpack for analysis

The plaintext export is sensitive. Keep it inside the timestamped work/backup directory, mention its path to the user, and do not commit.

## Inspect character corruption

Start with table/row counts, then narrow to the affected character names. Use `server-scripts/Database.cs:1968-1976` for the character-keyed table inventory.

- Detect orphaned child rows: names present in child tables but absent from `characters`.
- Detect duplicate/corrupt core rows with `NOT INDEXED` when an index is corrupt; corrupt indexes can hide physical rows.
- Compare against old `game.dat.corrupt_backup_*` files if present, but treat them as corrupt evidence sources, not safe restore targets.

Class/talent recovery requires code evidence. For skill defaults, inspect `Skill` construction and `Database.LoadSkills`/`SaveSkills`; do not infer from class level alone.

## Repair principles

- Prefer renaming/restoring primary character rows over rewriting child tables when child rows are already under the correct character names.
- If exact talent allocation is missing, do not fabricate it. Restore unspent points only when code/save evidence proves the points were earned and the original allocation is unrecoverable.
- Clear stale class-incompatible `character_skills`/`character_buffs` only when they are demonstrably attached to the wrong character/class.
- Use explicit column lists for `INSERT ... SELECT` between databases/backups. Avoid `SELECT *`; schemas can match by count yet still be fragile, and accidental `rowid` projection changes column count.

After repair, run:

```sql
PRAGMA integrity_check;
PRAGMA quick_check;
```

Then summarize the repaired records with counts from all character child tables.

## Runtime verification

At the title/start scene, `Il2Cpp.Database.connection` may be null. See `server-scripts/Database.cs:757-762` for connection initialization and `server-scripts/Database.cs:814-834` for cleanup.

Safe runtime reads:

- `Il2Cpp.Database.GetCharacters()`
- `Il2Cpp.Database.CharacterPreviewLoad(name)` for class/level preview data

Avoid `Il2Cpp.Database.CharacterLoad(name)` for inspection because it updates `lastsaved`.

Redirect the database before the first call, or a title-scene read reaches the player's file; see `skill://hotrepl-runtime-inspection`.

If item/quest caches are not loaded in the current scene, preview equipment or load lists may appear empty even though DB rows exist. In that case, rely on direct DB row counts or enter the game world before checking resolved item objects.

## Reporting

Report exactly:

- backup directory path
- unpacked plaintext copy path, if created
- integrity/quick/cipher check outputs
- rows changed and why
- runtime commands run and observed output
- any data that is not recoverable, with the evidence that proves it is missing

## Sources behind this workflow

- SQLite Online Backup API: https://sqlite.org/backup.html
- SQLite PRAGMA `integrity_check`/`quick_check`: https://sqlite.org/pragma.html#pragma_integrity_check
- SQLCipher API, `PRAGMA key`, `ATTACH ... KEY`, `sqlcipher_export`, `cipher_integrity_check`: https://www.zetetic.net/sqlcipher/sqlcipher-api/
