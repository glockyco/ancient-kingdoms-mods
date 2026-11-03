# Proposal

## Why

A player wrote on Discord that Pocket Compendium makes the game stutter while walking. Once a second, respawn tracking searches the whole scene for monsters to find the nine bosses and elites that altar events and placeholder deaths spawn as new objects. On a host in The Lone-Lands that search took about 45 ms and made a frame of about 65 ms once a second, which shows as a judder while the view scrolls. Without the search the same walk had no such frames.

## What Changes

- The tracker learns of an altar or placeholder spawn when the game starts the monster, instead of searching the scene for it every second.
- The tracker searches the scene once when a tracking session starts, for spawns that the game started before, such as a living altar boss on a server the player joins.
- Each tracked altar or placeholder monster reads the spawns the game started and has not destroyed: the last living one, otherwise the first one in the scene, as the search picked before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `respawn-tracking`: tracking adds no recurring long frame, because the tracker searches the scene only when a session starts and learns of later altar and placeholder spawns when the game starts them.

## Impact

- `mods/PocketCompendium/Core/Tracking/Tracker.cs`, `TrackedMonster.cs` and a new patch of the game's monster start, `MonsterStartPatch.cs`.
- A Pocket Compendium release, so players get the fix through the update notice.
