---
name: update-game-version
description: Full workflow for updating to a new game version. Use when a new Ancient Kingdoms patch is released.
---

## Before Starting

Ask the user for the following before doing anything (skip any already provided):

1. **New version number**
2. **Full changelog text** — needed to determine what manual website changes are required
3. **Did the world map change?** (new zones added, or zone boundaries/geometry modified)
   — determines whether to run screenshot export and regenerate map tiles

## Steps

Execute in order:

```bash
# 1. Build and deploy mods for the new version
dotnet run --project build-tool all

# 2. Export fresh game data (launches game, exports JSON, quits)
#    Use --screenshots if the world map changed (user confirmed in Before Starting)
dotnet run --project build-tool export
# dotnet run --project build-tool export --screenshots  # if map changed
#
# IMPORTANT: Verify the MelonLoader log says "Game Version: <new version>"
# If it still says the old version, Steam hasn't updated the local client yet.
# In that case: wait for Steam to download the update, then re-run this step.
# (The server scripts decompile via steamcmd downloads independently and is unaffected.)

# 2b. Regenerate map tiles — only if map changed
# cd build-pipeline && uv run compendium tiles

# 3. Decompile server scripts
#    Steam username is read from config.toml [steam] username (this file is gitignored — trust it exists)
#    Prerequisites (one-time): brew install steamcmd && brew install dotnet@8 && dotnet tool install -g ilspycmd
./scripts/update-server-scripts.sh <version>

# 4. Diff server scripts (see analysis guidance below)
diff -rq server-scripts-<old-version> server-scripts-<new-version>
diff -b server-scripts-<old>/<file>.cs server-scripts-<new>/<file>.cs

# 5. Rebuild database from new exports
cd build-pipeline && uv run compendium build

# 6. Apply all manual website changes (mechanic updates, removed features, etc.)

# 7. Update game version on home page — always last, as a "seal" on the update
#    website/src/routes/+page.svelte — hardcoded version string
```

Server scripts are **reference only** — for understanding game mechanics, not for data export.
Versioned backups are stored in `server-scripts-<version>/`; the working copy is `server-scripts/`.

**Do not investigate the old server scripts** to understand changes — diff the new scripts first. The diff is the primary source of truth for what changed.

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

### UIMap.cs — custom map zones

Check `UIMap.cs` for any new zones added to the `idZone ==` branch in `Update()` and `mapButton()`. These zones replace the normal world map with a custom hand-drawn sprite in-game and must be added to `EXCLUDED_ZONE_IDS` in `website/src/lib/constants/constants.ts`. Currently: Temple of Valaark (zone 23).

### Apply() is authoritative for runtime behavior

When investigating scaling changes, `Apply()` is the source of truth for what actually happens at runtime. Tooltip methods (`ToolTip`, `ToolTipUpgrade`) may diverge from actual behavior and should not be trusted as a substitute.

### Automatic vs. manual

- **Automatic**: Entity stats, skill data, zone data, items — re-export + rebuild DB handles these
- **Manual**: Hardcoded logic in the website (spell scaling formulas in `formatSkillEffect.ts`, class mechanic descriptions), new game mechanics not captured by exporters

### Key website locations with hardcoded game logic

Search for `Source: server-scripts/` comments to find all hardcoded values. Key files:

- `website/src/routes/skills/[id]/+page.svelte` — damage pipeline, stat scaling, buff/debuff/resist/cleanse formulas
- `website/src/lib/utils/formatSkillEffect.ts` — per-skill hardcoded effect descriptions
- `website/src/routes/items/[id]/+page.svelte` — item mechanics (Radiant Aether, economy prices, set thresholds)
- `website/src/lib/utils/format.ts` — altar tier thresholds, gathering respawn rules
- `website/src/lib/utils/roles.ts` — NPC role descriptions with prices/costs
- `website/src/routes/+page.svelte` — game version string
