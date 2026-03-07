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

| Category | Example | Action |
|----------|---------|--------|
| New mechanic | Warrior merc invulnerability | Document on website; may need new exporter |
| Formula/constant change | Damage scaling, resist thresholds | Update hardcoded values in website |
| Stat scaling change | New class-conditional multiplier in GetHealBonus | Check key website locations for hardcoded formulas |
| Removed feature | Manual pet move command removed | Remove from documentation |
| Skill behavior change | Rogue stealth persistence rules | Update mechanic descriptions |
| AI/behavioral change | Pet follow distance | Low priority, document if guides exist |
| Architecture refactor | VFX code moved between files | Ignore |

### UIMap.cs — custom map zones

Check `UIMap.cs` for any new zones added to the `idZone ==` branch in `Update()` and `mapButton()`. These zones replace the normal world map with a custom hand-drawn sprite in-game and must be added to `EXCLUDED_ZONE_IDS` in `website/src/lib/constants/constants.ts`. Currently: Temple of Valaark (zone 23).

### Apply() is authoritative for runtime behavior

When investigating scaling changes, `Apply()` is the source of truth for what actually happens at runtime. Tooltip methods (`ToolTip`, `ToolTipUpgrade`) may diverge from actual behavior and should not be trusted as a substitute.

### Automatic vs. manual

- **Automatic**: Entity stats, skill data, zone data, items — re-export + rebuild DB handles these
- **Manual**: Hardcoded logic in the website (spell scaling formulas in `formatSkillEffect.ts`, class mechanic descriptions), new game mechanics not captured by exporters

### Key website locations with hardcoded game logic

- `website/src/lib/utils/formatSkillEffect.ts` — spell scaling formulas
- `website/src/routes/skills/[id]/+page.svelte` — buff/debuff scaling formulas in the mechanics section
- `website/src/routes/+page.svelte` — game version display
