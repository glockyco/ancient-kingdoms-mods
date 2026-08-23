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
#    Reads server/server_Data/Managed/Assembly-CSharp.dll straight out of the game
#    install in Local.props (the CrossOver bottle), so there is nothing to download
#    and the scripts always match the build the exporter runs against. The script
#    installs the pinned ILSpy 10.1.1.8388 locally and invokes its managed
#    ilspycmd.dll through dotnet; no global DOTNET_ROOT needed.
#    Running this first surfaces game-side API changes (renamed/removed fields the DataExporter binds to)
#    before the long export run. A failing export caused by a renamed Il2Cpp member wastes the whole launch cycle.
#    The bottle's own Steam client usually has the patch already; the script aborts
#    if the install still carries the previous snapshot's assembly. Bring it current
#    with `dotnet run --project build-tool update` and re-run.
./scripts/update-server-scripts.sh <version>

# 2. Diff server scripts and patch mods if needed (see Diff Analysis below)
#    The step above moved server-scripts to the new entry. The store also holds the
#    entry it replaced, which is what to diff against. List the store to name it:
ls -1 .decompiled                       # the new entry and the one before it
readlink server-scripts                 # which of them is current
/usr/bin/diff -b -rq .decompiled/<previous entry> server-scripts
/usr/bin/diff -b .decompiled/<previous entry>/<file>.cs server-scripts/<file>.cs
#    Pay particular attention to fields/properties referenced by mods/DataExporter/
#    (e.g. GameManager.*, ScriptableItem on enums). Update the exporter to match before building.

# 3. Refresh Il2Cpp interop before building a changed exporter
#    On a fresh macOS workstation, install the MelonLoader x64 release into the
#    game directory first. CrossOver runs the Windows game as x86-64 even on
#    Apple Silicon. The build tool supplies the required Wine version.dll override.
#    When exporter code reads a field introduced by the patch, run this complete
#    sequence. Mods compile against `$(Il2CppAssembliesPath)`, and MelonLoader
#    regenerates those interop assemblies when the updated game runs after a Steam
#    update. Building first can fail with
#    `CS1061: 'X' does not contain a definition for 'y'`.
#    1. Ask the bottle's Steam client to bring the game current. The command starts that
#       client, requests a validation, and waits on the application manifest, reporting the
#       build id it settles on:
dotnet run --project build-tool update
#    2. Launch the updated game. This returns once MelonLoader is up, after
#       Il2Cpp interop regeneration. Stop the game before continuing:
dotnet run --project build-tool launch
#    3. Build the mods:
dotnet run --project build-tool build
#    4. Deploy every built Release DLL:
dotnet run --project build-tool deploy
#    5. Export without --update because the bottle is already current:
dotnet run --project build-tool export
#    Use `dotnet run --project build-tool export --screenshots` instead if the
#    world map changed.
#
#    `deploy` copies every Release DLL it finds under
#    `mods/**/bin/Release/net6.0/` into the CrossOver Mods directory. It does not
#    special-case BossMod and it does not delete stale copies.

# 4. For an unchanged exporter, build and deploy, then use the single-shot export path:
dotnet run --project build-tool build
dotnet run --project build-tool deploy
# 5. Export fresh game data (launches game, exports JSON, quits)
#    --update asks the bottle's Steam client to bring the game current before exporting.
#    Use --screenshots if the world map changed (user confirmed in Before Starting).
dotnet run --project build-tool export --update
# dotnet run --project build-tool export --update --screenshots  # if map changed
#
# Note: MelonLoader logs `Game Version: UNKNOWN` for this game — the build does not expose
# its version string to MelonLoader. Do NOT use that line to verify the install is current.
# Instead, confirm via the build id that `update` reports from the Steam application manifest,
# or by checking the in-game main menu.
#
# If MelonLoader fails with `UnityDependencies_<unity-version>.zip does not Exist!`
# the game upgraded its Unity engine and MelonLoader's auto-download did not run
# (recurring upstream bug — see https://github.com/LavaGang/MelonLoader/issues/987).
# Fix manually by reading `ANCIENT_KINGDOMS_PATH` from the MSBuild XML in `Local.props`:
#   GAME_PATH="$(sed -n 's:.*<ANCIENT_KINGDOMS_PATH>\(.*\)</ANCIENT_KINGDOMS_PATH>.*:\1:p' Local.props)"
#   ML_DEPS="$GAME_PATH/MelonLoader/Dependencies/Il2CppAssemblyGenerator"
#   curl -fL -o "$ML_DEPS/UnityDependencies_<unity-version>.zip" "https://github.com/LavaGang/MelonLoader.UnityDependencies/releases/download/<unity-version>/Managed.zip"
# The release asset is named `Managed.zip` upstream but MelonLoader caches it locally
# as `UnityDependencies_<unity-version>.zip`. Re-run the export after placing the file.
#
# If the game dies with no MelonLoader log line as soon as a character enters the
# world, `build-tool export` fails with:
# `Runner error: WebSocketException: The remote party closed the WebSocket connection without completing the close handshake.`
# Run the game directly under Wine and capture stderr. It reveals
# `Fatal error. System.AccessViolationException` at
# `Il2CppInterop.Runtime.Injection.Hooks.Class_GetFieldDefaultValue_Hook.Hook`.
# Il2CppInterop locates `Class::GetDefaultFieldValue` by scanning GameAssembly.dll
# for hardcoded byte signatures. On some builds the scan matches an unrelated
# function. The `mods/FieldDefaultValueHookFix` mod forces Il2CppInterop's
# signature-free xref traversal instead. Build and deploy it like any other mod.
# No action is needed unless the fix stops working. MelonLoader 0.7.3 alone does
# not fix this.

# 5b. Regenerate map tiles — only if map changed
#     compendium tiles validates boss/world-boss spawn coverage before replacing
#     website/static/tiles. If validation fails, the screenshot export is bad:
#     fix the in-game export environment and re-run the applicable export command with --screenshots.
# cd build-pipeline && uv run compendium tiles

# 6. Rebuild database from new exports
cd build-pipeline && uv run compendium build

# 7. Apply all manual website changes (mechanic updates, removed features, etc.)
#    Write docs describing how the game works NOW — present tense, current behavior only.
#    No historical framing ("now", "previously", "no longer", "changed from X to Y"): the
#    site documents the current patch, not a changelog. State the new rule as the only rule.

# 8. Refresh mechanics snapshots
#    Patches that change skill mechanics, scaling, or buff/debuff behavior shift the
#    rendered mechanics cards on /skills/<id> pages. The committed snapshots in
#    website/test-fixtures/mechanics-snapshots/ become stale and any subsequent
#    contributor running snapshot-mechanics.mjs gets a misleading regression signal.
#    Always refresh as part of the version bump, even when no skill changes are
#    obvious from the changelog — server-script tweaks often surface here.
cd website && pnpm build && node scripts/snapshot-mechanics.mjs
#    Review every reported diff. Each one MUST correspond to either:
#      - an intended manual website change in step 7, or
#      - a game mechanics change visible in the server-scripts diff.
#    Unexplained diffs are a signal to stop and investigate before accepting.
#    Once every diff is accounted for, accept them as the new baseline:
node scripts/snapshot-mechanics.mjs --update
#    Stage `website/test-fixtures/mechanics-snapshots/` alongside the related
#    code change (the mechanics-card edit, the formatSkillEffect.ts update, etc.)
#    so each commit's snapshot delta is justified by code in the same commit.

# 9. Update game version on home page — always last, as a "seal" on the update
#    website/src/lib/constants/version.ts — set COMPENDIUM_VERSION
#    The home-page banner reads this and compares against the live Steam version
#    fetched server-side, so getting it right matters: a stale value here
#    becomes visible to every visitor as an amber "behind" warning.
```

Server scripts are **reference only** — for understanding game mechanics, not for data export.
Each decompile is stored once under `.decompiled/`, in an entry named `steam-<build id>-<digest>`
from values the script reads off the installation. `server-scripts` is a symlink to the current
entry, and it is the path every `Source:` citation resolves against. The store keeps the current
entry and the one before it, which is what the diff step above compares against; the script prunes
anything older and says what it removed. The version you pass on the command line is recorded in
`SNAPSHOT.toml` and names nothing.

**Gitignored, never commit:** `.decompiled/`, `server-scripts`, `exported-data/`, and `website/data/compendium.db`. The decompiled scripts are not ours to redistribute, and the export/DB artifacts are reproducible build output. They will not appear in `git status` after re-running the workflow — this is expected. Do not `git add` them, do not `git add -f` them.

**Do not investigate the old server scripts** to understand changes — diff the new scripts first. The diff is the primary source of truth for what changed.

## Committing

**Commit as you go, not at the end.** One logical change per commit. A single big-bang commit for
the whole update is prohibited, and so is reaching the version bump with everything still
uncommitted: by then the working tree holds several unrelated concerns and no one can review them
apart. Commit each concern as soon as it is complete and verified.

The usual sequence for one update:

| # | Subject | Contents |
|---|---|---|
| 1 | An exported field is added | `mods/DataExporter` model and exporter, `build-pipeline/schema.sql`, `models.py`. Lands **before** the export run, because the export is what fills the new column. One commit per field or per coherent group of fields. |
| 2 | Citations are re-anchored | `citations.lock.json` and the `Source:` comments that `citations fix` relocated. A game patch shifts hundreds of line numbers; this diff is large, mechanical, and must not be mixed with anything a reviewer has to think about. |
| 3…n | One game-mechanic change each | The prose or formula edit, plus only the snapshot files that edit caused. One combat formula, one cleanse rule, one scaling change per commit. |
| n+1 | Data-only snapshot deltas | Snapshots that moved because the game's data changed, with no code change of ours. Say in the body which game change moved them. |
| last | Version bump | `website/src/lib/constants/version.ts` alone. |

Stage per-skill snapshot files individually (`git add …/mechanics-snapshots/<skill>.txt`) so each
commit carries only the snapshot deltas its own code or data change caused (see step 8).

`uv run compendium citations check` gates CI, so it exits 0 before the version bump, not after.

A commit body explains why the change exists. For a data-only commit that is the game change
behind it; for a mechanic commit it is the server-script evidence, cited by file and line.

## Diff Analysis

Diff **every** changed file. Do not skip files or cherry-pick "important" ones.

### Decompiler noise to ignore

- IL label renames (`IL_2186` → `IL_232a`)
- Variable renumbering (`pet13` → `pet14`, `player29` → `player30`)
- `goto` target changes with no surrounding logic change
- Use `/usr/bin/diff -b` to ignore whitespace differences

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
- `website/src/lib/constants/version.ts` — game version string and patch date used by the home-page banner
- `website/src/routes/mechanics/combat/+page.svelte` — combat formula reference and mechanic subsections
