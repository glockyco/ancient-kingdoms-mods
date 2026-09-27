## Why

Game version 0.9.34.0 added the Adventurer's Guide, an in-game help system with 64 articles. About half of the rules that it explains are absent from the compendium, for example party capacity, loot rolls, guilds, death and remains, Bard songs, and crafting at a station. Players arrive with the guide's vocabulary, and the compendium has no page for many of those terms.

## What Changes

- Export the guide's articles from the running game into a new `game_guide.json` file, and load them into the compendium database.
- Map every article to the compendium section that covers its topic. A check fails when an article has no section, when a mapped section is absent, or when the article text changed since the section was reviewed.
- Make each article title a search entry that opens the mapped section.
- Add eight mechanics pages: Party and Loot, Guilds, Death and Remains, Character Build, Bard Songs and Charm, Crafting and Augments, Housing and Appearance, and World and Travel.
- Extend existing pages with the guide's rules that they do not state: inventory, combat, monster spawns, reputation, professions, quests, altars, mercenaries, and summons.
- Add a short class guide to each class page. Show utility skills on class pages, and show each skill's level requirement and prerequisites in the class skill table.
- Group the mechanics index by the guide's categories.
- Rewrite each fact in the compendium's own words and verify it against the decompiled game code. Where the guide and the code disagree, the page follows the code.

## Capabilities

### New Capabilities

- `game-guide-coverage`: export of the in-game guide, the mapping of every article to a compendium section, the coverage check, and search entries for article titles.

### Modified Capabilities

- `class-skill-presentation`: class pages show utility skills in their own category, and the class skill table shows level requirements and prerequisites.

## Impact

- `mods/DataExporter`: a new exporter and model for the guide.
- `build-pipeline`: a new loader and table.
- `website`: the entity manifest and search documents, a coverage map and its test, eight new routes, and edits to existing routes and the class query.
- A new game export is required before the pipeline can build, because the loader fails when `game_guide.json` is absent.
