---
name: update-game-version
description: Full workflow for updating to a new game version. Use when a new Ancient Kingdoms patch is released.
---

## Steps

Execute in order:

```bash
# 1. Build and deploy mods for the new version
dotnet run --project build-tool all

# 2. Export fresh game data (launches game, exports JSON, quits)
dotnet run --project build-tool export

# 3. Decompile server scripts
#    Steam username is read from config.toml [steam] username
#    Prerequisites (one-time): brew install steamcmd && brew install dotnet@8 && dotnet tool install -g ilspycmd
./scripts/update-server-scripts.sh <version>

# 4. Diff server scripts (see analysis guidance below)
diff -rq server-scripts-<old-version> server-scripts-<new-version>
diff -b server-scripts-<old>/<file>.cs server-scripts-<new>/<file>.cs

# 5. Rebuild database from new exports
cd build-pipeline && uv run compendium build

# 6. Update game version on home page
#    website/src/routes/+page.svelte — hardcoded version string
```

Server scripts are **reference only** — for understanding game mechanics, not for data export.
Versioned backups are stored in `server-scripts-<version>/`; the working copy is `server-scripts/`.

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
| Removed feature | Manual pet move command removed | Remove from documentation |
| Skill behavior change | Rogue stealth persistence rules | Update mechanic descriptions |
| AI/behavioral change | Pet follow distance | Low priority, document if guides exist |
| Architecture refactor | VFX code moved between files | Ignore |

### Automatic vs. manual

- **Automatic**: Entity stats, skill data, zone data, items — re-export + rebuild DB handles these
- **Manual**: Hardcoded logic in the website (spell scaling formulas in `formatSkillEffect.ts`, class mechanic descriptions), new game mechanics not captured by exporters

### Key website locations with hardcoded game logic

- `website/src/lib/utils/formatSkillEffect.ts` — spell scaling formulas
- `website/src/routes/+page.svelte` — game version display
