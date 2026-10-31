# Proposal

## Why

BossTracker shows hidden window bosses as up, failed chance rolls as respawn countdowns, cuts its list off without a sign, misses bosses in inactive zones and keeps stale entries from zones left behind. Players on Steam and Discord ask for respawn times in the Bestiary, zone grouping, a direction arrow and an honest "the timer elapsed, go check" state. The three player mods also each carry their own copy of shared code, so they cannot share one settings window, one layout editor or one owner of the Bestiary patch.

## What Changes

- **BREAKING** One player DLL, Pocket Compendium, replaces the BossTracker, BossSkillTracker and BetterBestiary downloads. Every feature has its own switch and settings page. Wherever Pocket Compendium can be downloaded, a warning tells players to remove the three old DLLs first.
- Respawn tracking is rebuilt on the game's spawn rules, with named states (Up, In combat, Respawns, Estimated, Chance, Due, Night or day, Guards, Altar, Seen, Not seen). It covers every zone, including inactive ones, and fixes all five current defects.
- New surfaces, each switchable and on at first start: the boss list in list or compact style, world markers at spawn points, edge arrows, map pins, Bestiary countdowns, and respawn alerts through the game's own important message.
- Filters by tier, level, zone and discovery. Watched bosses always show.
- Every panel can be moved, resized and locked.
- A host running the mod sends exact boss state to clients running the mod, through calls registered on the game's chat component. Players without the mod stay unaffected.
- The skill tracker and the full Bestiary pages keep their current behaviour inside the new DLL.
- The mod never changes the game's respawn clock.

## Capabilities

### New Capabilities

- `respawn-tracking`: which monsters are tracked, the states each can be in, how each state is derived on a host and on a client, and what a tracker may claim.
- `respawn-surfaces`: the boss list and compact style, world markers, edge arrows, map pins, Bestiary countdowns and respawn alerts.
- `mod-settings-layout`: feature switches, the settings window, filters and panel placement.
- `world-state-sharing`: how a host running the mod sends boss state to clients running the mod, and what players without the mod see.

### Modified Capabilities

- `player-mods`: the published player mods become one DLL, Pocket Compendium. The tracker naming requirement changes so fabled monsters are marked by their tier colour instead of a "Fabled" tag, and the default-placement rule is replaced by player-placed panels.

## Impact

- Code: new project `mods/PocketCompendium`, absorbing `mods/BossTracker`, `mods/BossSkillTracker`, `mods/BetterBestiary` and `mods/Shared`. Tests in `tests/BossSkillTracker.Tests` and `tests/BetterBestiary.Tests` move with them.
- Publishing: `website/mod-downloads.json` and the generated `website/static/mods/manifest.json` list one entry instead of three. `build-tool/Commands/PublishModsCommand.cs` needs no change, because it already copies one DLL per project. Links to the old DLLs, such as those in the Steam guide, stop working once the site is deployed.
- Documentation: the download tables in `README.md` and `mods/README.md`, and the three mod READMEs, merge into one Pocket Compendium README.
- Players: anyone with the old DLLs must remove them, as the download warning says. Settings and panel positions start from their defaults.
- Network: custom Mirror call hashes on `PlayerChat`, checked against collisions at start.
