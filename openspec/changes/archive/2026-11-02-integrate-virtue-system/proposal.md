## Why

Game 0.10.2.0 added the Virtue System: twelve shrines, two for each virtue, ranks and titles, blessings that change healing, defenses, Health, Accuracy, Critical Resist, damage against elites and bosses and faction gains, and new ways to earn each virtue. Hotfix 0.10.2.1 reworked how Honor earns points. The compendium covers none of it, so the eight new Adventurer's Guide articles map to no section, about twenty pages state formulas that omit an active blessing, and the new data would publish an escort with values no player meets and six Blessing pages without an effect. 0.10.2.1 is published only once this change lands.

## What Changes

- The export records each virtue from the game: its name, rank thresholds, titles, its Blessing skill and the effect text of each rank, and the points that the game holds as data. Each shrine is exported as a placement with its virtue and position.
- The pipeline publishes the virtues, their ranks and the shrines. The Compassion Escort NPC is excluded from publication.
- A Virtues mechanics page states how shrines and blessings work, the ranks and titles, how each virtue earns points and what each blessing does at each rank. Its sections cover the eight Virtues guide articles. The Valor section lists the elites and bosses a shrine can name at a level the reader enters, Compassion lists each dungeon's stranded adventurer, and the Sacrifice section computes the points an offering gives.
- Monster pages show the Honor points a fight gives, equipment pages show an item's Sacrifice value, and dungeon pages show their stranded adventurer.
- Shrines appear on the map as their own marker group with a popup that links to their virtue, and in map and site search.
- Each Blessing skill page states that a shrine grants it, how long it lasts and each rank's title and effect, and does not present its ranks as learned.
- Every page whose stated numbers an active blessing changes names that blessing and links to the Virtues page: damage, healing and lifetap, Critical Resist, maximum Health and the defenses on the character page, faction gains and their calculators, and storage rules for lost belongings.
- The 0.10.2.1 data, redaction ledger and version are published after these land.

## Capabilities

### New Capabilities

- `virtue-system`: The virtues, ranks, titles, blessings and shrines as the compendium presents them: the Virtues page, the shrine markers, the Blessing skill pages, and the naming of a blessing wherever it changes a stated number.

### Modified Capabilities

- `game-data-export`: The export records each virtue's definition and each shrine placement, independent of the exporting character's virtues and the client language.

## Impact

- Exporter: a virtue exporter and a shrine capture in `mods/DataExporter`, their models, registration and tests. A fresh export session.
- Pipeline: `build-pipeline/schema.sql`, models, loaders, the redaction configuration and ledger, map and search denormalization, tests.
- Website: a `/mechanics/virtues` route, the mechanics index, the map marker registry, popups and search, the skill page, the monster, item and zone pages, the guide coverage map, the combat, character, reputation, inventory and summons pages, skill mechanics components, the reputation calculations, the shared rules module, generated home counts.
- Pocket Compendium: the skill-effect formatter port and its parity corpus gain the Blessing summaries.
- Publication: `COMPENDIUM_VERSION` moves to 0.10.2.1 after the change.
