---
name: ancient-kingdoms-save-files
description: Use when inspecting, unpacking, backing up, repairing, or runtime-verifying Ancient Kingdoms save files.
---

# Ancient Kingdoms Save Files

Use this for any work on Ancient Kingdoms save data, especially `game.dat` in the CrossOver/Steam install. Save files are player-owned state: optimize for reversibility, evidence, and minimal mutation.

## Non-negotiables

- Never edit a live save before creating a timestamped backup in the same directory.
- Never include the SQLCipher key in skills, docs, commits, issue text, or final reports.
- Never run exploratory writes against the live database. Inspect a copied/plaintext export first.
- Never trust a single check. Verify with SQLite/SQLCipher integrity checks and, when practical, HotRepl/runtime load checks.
- Never call game APIs that save or update `lastsaved` just to inspect data unless the user explicitly accepts that mutation.

## Locate the save

Current CrossOver layout:

```text
$WINE_PREFIX/drive_c/Program Files (x86)/Steam/steamapps/common/Ancient Kingdoms/ancientkingdoms_Data/game.dat
```

Use `Local.props` for `ANCIENT_KINGDOMS_PATH` and `WINE_PREFIX`; do not hard-code a user path if the repo config can provide it.

Check for sidecars before backup:

```text
game.dat
game.dat-wal
game.dat-shm
game.dat.corrupt_backup_*
```

In WAL mode, committed changes may still live in `game.dat-wal`. Prefer a clean game shutdown or a SQL checkpoint before file-copy backups. If the game is running, either use SQLite/SQLCipher backup/export APIs or copy the main database and WAL together.

## Find the SQLCipher key

Do not ask the user for the key and do not record it in repo files. Derive it from current game/decompiled code:

- Search `server-scripts/Database.cs` for `new SQLiteConnection(GameManager.pathFileDB, ...)` or `PRAGMA key`.
- If server scripts are stale, update/decompile scripts first using the game-version workflow, then inspect `Database.ConnectInternal`.
- Put the key in a local shell variable or environment variable for the current command only, e.g. `AK_SQLCIPHER_KEY`, and avoid writing it to files.

The key must be set before the first database read. Test it with a harmless schema read before continuing.

## Backup workflow

1. Stop the game if possible. If it must stay open, use SQLCipher export/backup instead of raw file copy.
2. Create a timestamped directory next to the save:
   `game-dat-backup-before-<reason>-YYYYMMDD-HHMMSS/`.
3. Copy `game.dat` and any present `game.dat-wal`/`game.dat-shm` sidecars.
4. Record file sizes and SHA-256 hashes in your notes or an inspection report.
5. Verify the source before repair:
   - `PRAGMA integrity_check;`
   - `PRAGMA quick_check;`
   - for SQLCipher builds that support it, `PRAGMA cipher_integrity_check;`.

`integrity_check` should return `ok`. `quick_check` is faster but less complete. SQLCipher's `cipher_integrity_check` validates page HMAC/envelope consistency and returns rows only for errors.

## Unpack for analysis

Use a plaintext copy for ad hoc inspection, never the original encrypted file:

```sql
PRAGMA key = '<from AK_SQLCIPHER_KEY>';
ATTACH DATABASE '<backup-or-work-dir>/game-unpacked.sqlite' AS plaintext KEY '';
SELECT sqlcipher_export('plaintext');
DETACH DATABASE plaintext;
```

The plaintext export is sensitive. Keep it inside the timestamped work/backup directory, mention its path to the user, and do not commit it.

## Inspect character corruption

Start with table/row counts, then narrow to the affected character names:

- `characters` core row: name, class, level, XP, stats, `skillPoints`, `veteranPoints`, `attributePoints`, gold, zone, save time.
- Child tables keyed by character name: `character_equipment`, `character_inventory`, `character_bank`, `character_skills`, `character_quests`, `character_buffs`, `characters_mercenaries`, `mercenary_equipment`, `mercenary_inventory`.
- Detect orphaned child rows: names present in child tables but absent from `characters`.
- Detect duplicate/corrupt core rows with `NOT INDEXED` when an index is corrupt; corrupt indexes can hide physical rows.
- Compare against old `game.dat.corrupt_backup_*` files if present, but treat them as corrupt evidence sources, not safe restore targets.

Class/talent recovery requires code evidence. For skill defaults, inspect `Skill` construction and `Database.LoadSkills`/`SaveSkills`; do not infer from class level alone.

## Repair principles

- Do all changes in a transaction.
- Make the smallest data move that restores the game's intended keys.
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

Use HotRepl when the user wants live verification or static checks are insufficient:

```sh
dotnet run --project build-tool deploy-host --hotrepl-repo /path/to/HotRepl
dotnet run --project build-tool launch --wait
hotrepl --url ws://127.0.0.1:18590 doctor --json
hotrepl --url ws://127.0.0.1:18590 info --json
hotrepl --url ws://127.0.0.1:18590 run world.summary '{}' --json
```

At the title/start scene, `Il2Cpp.Database.connection` may be null. If you need DB reads only, `Il2Cpp.Database.Connect()` can initialize it, and `Il2Cpp.Database.CloseConnection()` should be called afterward.

Safe runtime reads:

- `Il2Cpp.Database.GetCharacters()`
- `Il2Cpp.Database.CharacterPreviewLoad(name)` for class/level preview data

Avoid `Il2Cpp.Database.CharacterLoad(name)` for inspection because it updates `lastsaved`.

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
