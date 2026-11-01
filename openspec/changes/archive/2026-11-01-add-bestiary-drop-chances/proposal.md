# Proposal

## Why

Players choose which monster to farm by its drops and their chances, and Pocket Compendium's Bestiary pages show the drops without any chance. The table value the game stores misleads on boss pages, because a boss always drops at least one equipment piece and two with a Fatecharm, so most equipment drops far more often than its table says. The website already computes the real chance per kill. The pages also no longer show which drops a player has found, because Pocket Compendium draws every drop in full colour where the game dims the ones not found yet.

## What Changes

- Each drop on a Bestiary page shows its chance per kill, computed as the website computes it.
- A drop that the zone's Fatecharm makes likelier carries that Fatecharm's icon, and its tooltip gives both chances and names the Fatecharm.
- An item the table lists several times shows once, with the chance of at least one copy.
- Drops the player has found are marked, from the game's own record. Drops not found yet keep their full colour and tooltip.
- A switch on the Bestiary pages settings page turns the chances off.
- The look of the chance, the Fatecharm mark and the found mark, and all their wording, are chosen through comparisons with screenshots. The loot rules the page relies on are observed in the running game before it ships.

## Capabilities

### New Capabilities

- `bestiary-drops`: what a Bestiary page shows about each drop beyond the item itself: its chance per kill, a Fatecharm's effect on it, and whether the player has found it.

### Modified Capabilities

- `player-mods`: the requirement that a page lists every drop allows one slot per item when chances are on.

## Impact

- Code: a C# port of the website's loot chance calculation in `mods/PocketCompendium/Features/BestiaryPages/`, the loot renderer, and the Bestiary pages settings.
- Tests: a parity corpus generated from the website's calculation, read by a C# test, in the pattern of the skill effect corpus.
- Website: no change, unless the parity work finds a defect in the site's numbers.
- Documentation: the Bestiary section of `mods/PocketCompendium/README.md`.
