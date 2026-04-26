---
name: update-game-version
description: Full workflow for updating to a new game version. Use when a new Ancient Kingdoms patch is released.
---

## Before Starting

**Do not speculate about required changes from the changelog text alone.** The changelog is marketing copy — it omits implementation details, conflates multiple changes, and cannot tell you whether a new mechanic needs a new exporter, a schema change, or just a re-export. The server script diff is the only reliable source. Get the scripts first; plan afterward.

Ask the user for the following before doing anything (skip any already provided):

1. **New version number**
2. **Full changelog text** — needed to determine what manual website changes are required
3. **Did the world map change?** (new zones added, or zone boundaries/geometry modified)
   — determines whether to run screenshot export and regenerate map tiles

## Steps

Execute in order:

```bash
# 1. Decompile server scripts FIRST — before touching mods or running an export.
#    Steam username is read from config.toml [steam] username (this file is gitignored — trust it exists)
#    Prerequisites (one-time): brew install steamcmd && brew install dotnet@8 && dotnet tool install -g ilspycmd
#    Running this first surfaces game-side API changes (renamed/removed fields the DataExporter binds to)
#    before the long export run. A failing export caused by a renamed Il2Cpp member wastes the whole launch cycle.
#    Note: this script downloads to .steam-download/ (a separate install) — it does NOT update the
#    CrossOver bottle that --export uses. Always pass --update on the export to refresh that install.
./scripts/update-server-scripts.sh <version>

# 2. Diff server scripts and patch mods if needed (see Diff Analysis below)
diff -rq server-scripts-<old-version> server-scripts-<new-version>
diff -b server-scripts-<old>/<file>.cs server-scripts-<new>/<file>.cs
#    Pay particular attention to fields/properties referenced by mods/DataExporter/
#    (e.g. GameManager.*, ScriptableItem on enums). Update the exporter to match before building.

# 3. Build and deploy mods for the new version
dotnet run --project build-tool all

# 4. Export fresh game data (launches game, exports JSON, quits)
#    --update runs steamcmd app_update against the CrossOver bottle (separate from .steam-download/).
#    Use --screenshots if the world map changed (user confirmed in Before Starting).
dotnet run --project build-tool export --update
# dotnet run --project build-tool export --update --screenshots  # if map changed
#
# Note: MelonLoader logs `Game Version: UNKNOWN` for this game — the build does not expose
# its version string to MelonLoader. Do NOT use that line to verify the install is current.
# Instead, confirm via steamcmd's `Success! App '2241380' fully installed.` line during --update,
# or by checking the in-game main menu.
#
# If MelonLoader fails with `UnityDependencies_<unity-version>.zip does not Exist!`
# the game upgraded its Unity engine and MelonLoader's auto-download did not run
# (recurring upstream bug — see https://github.com/LavaGang/MelonLoader/issues/987).
# Fix manually:
#   ML_DEPS="$ANCIENT_KINGDOMS_PATH/MelonLoader/Dependencies/Il2CppAssemblyGenerator"
#   curl -fL -o "$ML_DEPS/UnityDependencies_<unity-version>.zip" \\
#     https://github.com/LavaGang/MelonLoader.UnityDependencies/releases/download/<unity-version>/Managed.zip
# The release asset is named `Managed.zip` upstream but MelonLoader caches it locally
# as `UnityDependencies_<unity-version>.zip`. Re-run the export after placing the file.

# 4b. Regenerate map tiles — only if map changed
# cd build-pipeline && uv run compendium tiles

# 5. Rebuild database from new exports
cd build-pipeline && uv run compendium build

# 6. Apply all manual website changes (mechanic updates, removed features, etc.)

# 7. Update game version on home page — always last, as a "seal" on the update
#    website/src/routes/+page.svelte — hardcoded version string
```

Server scripts are **reference only** — for understanding game mechanics, not for data export.
Versioned backups are stored in `server-scripts-<version>/`; the working copy is `server-scripts/`.

**`exported-data/` and `website/static/compendium.db` are gitignored** — they will not appear in `git status` after re-exporting or rebuilding. This is expected; do not attempt to commit them.

**Do not investigate the old server scripts** to understand changes — diff the new scripts first. The diff is the primary source of truth for what changed.

**Commit atomically** — one logical change per commit.

## Diff Analysis

Diff **every** changed file. Do not skip files or cherry-pick "important" ones.

### Decompiler noise to ignore

- IL label renames (`IL_2186` → `IL_232a`)
- Variable renumbering (`pet13` → `pet14`, `player29` → `player30`)
- `goto` target changes with no surrounding logic change
- Use `diff -b` to ignore whitespace differences

### What to look for

Categorize each change:

| Category | Action |
|----------|--------|
| New/changed hardcoded formula or constant | Find via `Source: server-scripts/` comments; update website values |
| New game mechanic not in DB | Document on website; evaluate if new exporter needed |
| Removed or renamed mechanic | Remove or update documentation |
| DB-auto-handled (entity stats, skill data, items) | Re-export + rebuild DB handles it; verify in DB |
| Decompiler noise or pure refactor | Ignore |

For each changed file, grep to find every affected hardcoded location before investigating manually:
```bash
grep -r "Source: server-scripts/<File>.cs" website/src build-pipeline/src
```
No matches means nothing to review. Run per changed file, not as one bulk pass.

### UIMap.cs — custom map zones

Check `UIMap.cs` for any new zones added to the `idZone ==` branch in `Update()` and `mapButton()`. These zones replace the normal world map with a custom hand-drawn sprite in-game and must be added to `EXCLUDED_ZONE_IDS` in `website/src/lib/constants/constants.ts`. Currently: Temple of Valaark (zone 23).

### UICharacterEditor.cs — new races

When a new race is added: add it to `RACE_DISPLAY_NAMES` in `website/src/lib/utils/classes.ts`; manually add to `compatible_races` in `exported-data/classes.json` for each eligible class (check the `Interactable =` guards per class button to identify which classes block it). `classes.json` is manually curated, not a pure export.

### Apply() is authoritative for runtime behavior

When investigating scaling changes, `Apply()` is the source of truth for what actually happens at runtime. Tooltip methods (`ToolTip`, `ToolTipUpgrade`) may diverge from actual behavior and should not be trusted as a substitute.

### Automatic vs. manual

- **Automatic**: Entity stats, skill data, zone data, items — re-export + rebuild DB handles these
- **Manual**: Hardcoded logic in the website (spell scaling formulas in `formatSkillEffect.ts`, class mechanic descriptions), new game mechanics not captured by exporters

### Key website locations with hardcoded game logic

Search for `Source: server-scripts/` comments to find all hardcoded values. Key files:

- `website/src/routes/skills/[id]/+page.svelte` — damage pipeline, stat scaling, buff/debuff/resist/cleanse formulas
- `website/src/lib/utils/formatSkillEffect.ts` — per-skill hardcoded effect descriptions; also review `HARDCODED_EFFECTS` entries for any skill whose logic changed to check if the entry should instead be driven by an exported flag
- `website/src/routes/items/[id]/+page.svelte` — item mechanics (Radiant Aether, economy prices, set thresholds)
- `website/src/lib/utils/format.ts` — altar tier thresholds, gathering respawn rules
- `website/src/lib/utils/roles.ts` — NPC role descriptions with prices/costs
- `website/src/routes/+page.svelte` — game version string
- `website/src/routes/mechanics/combat/+page.svelte` — combat formula reference and mechanic subsections
