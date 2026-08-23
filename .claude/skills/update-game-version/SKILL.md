---
name: update-game-version
description: Full workflow for updating to a new game version. Use when a new Ancient Kingdoms patch is released.
---

## Before you start

Do not plan from the changelog. It omits implementation details and combines changes. The server script diff is the only reliable source. Decompile first, then plan.

Ask the user for these. Skip what the user supplied:

1. the new version number
2. the full changelog text, which decides the manual website changes
3. whether the world map changed, which decides the screenshot export and the map tiles.

## Steps

```bash
# 1. Decompile the server scripts first.
#    The script reads the assembly from the install named in Local.props and
#    installs the pinned ILSpy 10.1.1.8388 into .ilspycmd/ on demand.
#    A renamed or removed field breaks the export. Find it before the long run.
#    If the install still holds the previous assembly, the script stops. Run
#    `dotnet run --project build-tool update`, then run the script again.
./scripts/update-server-scripts.sh <version>

# 2. Diff the server scripts. See "Diff analysis" below.
#    Step 1 moved the pointer to the new entry. Diff against the entry it replaced.
ls -1 .decompiled                       # the new entry and the one before it
readlink server-scripts                 # the current entry
/usr/bin/diff -b -rq .decompiled/<previous entry> server-scripts
/usr/bin/diff -b .decompiled/<previous entry>/<file>.cs server-scripts/<file>.cs
#    Read every field that mods/DataExporter/ binds to. Update the exporter first.

# 3. Changed exporter. Use this path when exporter code reads a new field.
#    Mods compile against `$(Il2CppAssembliesPath)`. MelonLoader regenerates those
#    assemblies when the updated game runs. A build before that run can fail with
#    `CS1061: 'X' does not contain a definition for 'y'`.
#    On a new workstation, install the MelonLoader x64 release first. CrossOver
#    runs the Windows game as x86-64 on Apple Silicon.
dotnet run --project build-tool update   # asks the bottle's Steam client, reports the build id
dotnet run --project build-tool launch   # returns when MelonLoader is up. Stop the game.
dotnet run --project build-tool build
dotnet run --project build-tool deploy
dotnet run --project build-tool export   # the bottle is already current

# 4. Unchanged exporter. Use this path instead of step 3.
dotnet run --project build-tool build
dotnet run --project build-tool deploy
dotnet run --project build-tool export --update

#    If the world map changed, add --screenshots to the export command.
#    `deploy` copies every Release DLL under `mods/**/bin/Release/net6.0/` to the
#    Mods directory. It does not delete stale copies.
#
#    MelonLoader logs `Game Version: UNKNOWN`. Do not read the install version from
#    that line. Use the build id that `update` reports, or the in-game main menu.

# 5. Regenerate the map tiles. Run this only when the map changed.
#    `compendium tiles` validates boss and world-boss spawn coverage before it
#    replaces website/static/tiles. If validation fails, the screenshot export is
#    bad. Repair the in-game export environment, then export again with --screenshots.
cd build-pipeline && uv run compendium tiles

# 6. Rebuild the database.
cd build-pipeline && uv run compendium build

# 7. Check the recorded redaction decisions against the new export.
#    A patch that advances an unreleased zone adds rows the configured rules remove,
#    so the lockfile falls behind. Read the drift before you accept it. An entry that
#    no configured rule reaches is a leak or a new decision. Decide it, do not sync it.
#    The pre-commit hook runs only when redaction files are staged, so run this here.
uv run compendium redactions check
uv run compendium redactions sync       # only after you understand the drift

# 8. Apply the manual website changes.
#    Write present tense and current behaviour only. Do not write "now",
#    "previously", "no longer", or "changed from X to Y". State the new rule as the
#    only rule.

# 9. Refresh the mechanics snapshots.
#    A patch that changes skill mechanics, scaling, or buffs moves the rendered
#    cards. Refresh every time, because server-script changes surface here.
cd website && pnpm build && node scripts/snapshot-mechanics.mjs
#    Account for every diff. Each one must match a manual change from step 8 or a
#    game change in the server-script diff. Stop and investigate any other diff.
node scripts/snapshot-mechanics.mjs --update

# 10. Set COMPENDIUM_VERSION in website/src/lib/constants/version.ts. Do this last.
#     The home-page banner compares this string against the live Steam version. A
#     stale value shows every visitor an amber "behind" warning.
```

## Troubleshooting

### MelonLoader reports a missing Unity dependency

MelonLoader fails with `UnityDependencies_<unity-version>.zip does not Exist!` when the game upgrades its Unity engine and the auto-download does not run. This is an upstream defect. See https://github.com/LavaGang/MelonLoader/issues/987.

Download the asset by hand, then export again:

```bash
GAME_PATH="$(sed -n 's:.*<ANCIENT_KINGDOMS_PATH>\(.*\)</ANCIENT_KINGDOMS_PATH>.*:\1:p' Local.props)"
ML_DEPS="$GAME_PATH/MelonLoader/Dependencies/Il2CppAssemblyGenerator"
curl -fL -o "$ML_DEPS/UnityDependencies_<unity-version>.zip" "https://github.com/LavaGang/MelonLoader.UnityDependencies/releases/download/<unity-version>/Managed.zip"
```

Upstream names the asset `Managed.zip`. MelonLoader caches it as `UnityDependencies_<unity-version>.zip`.

### The game dies when a character enters the world

The export fails with `Runner error: WebSocketException: The remote party closed the WebSocket connection without completing the close handshake.` and MelonLoader logs nothing.

Run the game under Wine and capture stderr. It reports `Fatal error. System.AccessViolationException` at `Il2CppInterop.Runtime.Injection.Hooks.Class_GetFieldDefaultValue_Hook.Hook`. Il2CppInterop finds `Class::GetDefaultFieldValue` by a byte-signature scan of GameAssembly.dll, and on some builds the scan matches an unrelated function.

The `mods/FieldDefaultValueHookFix` mod forces the signature-free xref traversal. Build and deploy it as a normal mod. MelonLoader 0.7.3 alone does not repair this. Take no action while the fix works.

## Layout

The server scripts are reference material for game mechanics. They are not an export source.

Each decompile is stored once under `.decompiled/`, in an entry named `steam-<build id>-<digest>`. `server-scripts` is a symlink to the current entry, and every `Source:` citation resolves through it. The store keeps the current entry and one previous entry, and the script reports what it prunes. The version argument is recorded in `SNAPSHOT.toml` and names nothing.

Never commit `.decompiled/`, `server-scripts`, `exported-data/`, or `website/data/compendium.db`. The decompiled scripts are not ours to redistribute. The export and the database are build output. Do not use `git add -f` on them.

Diff the new scripts to understand a change. Do not read the old scripts on their own.

## Committing

Commit each concern when it is complete and verified. Do not hold the work and split it at the end. One big-bang commit is prohibited.

| # | Subject | Contents |
|---|---|---|
| 1 | An exported field is added | `mods/DataExporter` model and exporter, `build-pipeline/schema.sql`, `models.py`. Lands before the export that fills the column. |
| 2 | Citations are re-anchored | `citations.lock.json` and the `Source:` comments that `citations fix` moved. Large and mechanical. Keep it apart from anything a reviewer must read. |
| 3…n | One game-mechanic change | The prose or formula edit, plus only the snapshots that edit moved. |
| n+1 | Data-only snapshot deltas | Snapshots the game's own data moved. Name the game change in the body. |
| n+2 | Redaction drift | The `redactions.lock.json` sync from step 7, on its own. |
| last | Version bump | `website/src/lib/constants/version.ts` alone. |

Stage snapshots one file at a time with `git add …/mechanics-snapshots/<skill>.txt`.

The lockfile and the `Source:` comments belong in one commit. A commit that holds one without the other fails the pre-commit gate.

`uv run compendium citations check` gates CI. It must exit 0 before the version bump.

Every commit body states why the change exists. For a data-only commit, name the game change. For a mechanic commit, cite the server script by file and line.

## Diff analysis

Diff every changed file. Do not skip a file.

### Decompiler noise

Ignore these:

- IL label renames, for example `IL_2186` to `IL_232a`
- variable renumbering, for example `pet13` to `pet14`
- `goto` target changes with no other change
- whitespace. Use `/usr/bin/diff -b`.

### Categories

| Category | Action |
|---|---|
| New or changed hardcoded formula or constant | Find the `Source: server-scripts/` comments. Update the website values. |
| New game mechanic absent from the database | Document it on the website. Decide whether it needs an exporter. |
| Removed or renamed mechanic | Remove or correct the documentation. |
| Entity stats, skill data, items | The re-export and rebuild carry it. Verify it in the database. |
| Decompiler noise or refactor | Ignore it. |

For each changed file, find the affected hardcoded values first:

```bash
grep -r "Source: server-scripts/<File>.cs" website/src build-pipeline/src
```

No match means nothing to review. Run this for one file at a time.

### UIMap.cs

Check `UIMap.cs` for a new zone in the `idZone ==` branch of `Update()` and `mapButton()`. Such a zone replaces the live map with a static illustration. Add it to `EXCLUDED_ZONE_IDS` in `website/src/lib/constants/constants.ts`. Temple of Valaark, zone 23, is there now.

### UICharacterEditor.cs

When the game adds a race, add it to `RACE_DISPLAY_NAMES` in `website/src/lib/utils/classes.ts`. Add it to `compatible_races` in `exported-data/classes.json` for each eligible class. Read the `Interactable =` guard on each class button to find which classes block it. `classes.json` is curated by hand.

### Apply() is authoritative

`Apply()` states the runtime behaviour. `ToolTip` and `ToolTipUpgrade` can disagree with it. Do not use a tooltip as evidence.

### Automatic and manual

The re-export and rebuild carry entity stats, skill data, zone data, and items. Everything hardcoded in the website is manual, and so is a new mechanic that no exporter reads.

### Website files with hardcoded game logic

Search for `Source: server-scripts/` to find every hardcoded value. These files hold most of them:

- `website/src/routes/skills/[id]/+page.svelte`, the damage pipeline and the buff, debuff, resist and cleanse formulas
- `website/src/lib/utils/formatSkillEffect.ts`, per-skill effect text. Review `HARDCODED_EFFECTS` for a skill whose logic changed, because an exported flag can now drive it
- `website/src/routes/items/[id]/+page.svelte`, item mechanics and set thresholds
- `website/src/lib/utils/format.ts`, altar tiers and gathering respawn rules
- `website/src/lib/utils/roles.ts`, NPC role text with prices
- `website/src/lib/constants/version.ts`, the version string for the home-page banner
- `website/src/routes/mechanics/combat/+page.svelte`, the combat formula reference.
