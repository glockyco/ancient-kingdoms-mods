## Why

Ancient Kingdoms 0.9.32.3 changes Bard mechanics and authoritative game data. The Bard class page also labels mastery skills as Core skills, so users can reasonably conclude that the post-tier mastery songs are missing.

## What Changes

- Update the export, generated database, citations, and published version to Ancient Kingdoms 0.9.32.3.
- Present class mastery skills after Tier 4 instead of mixing them into the Core category.
- Preserve the separate Base and Core categories for skills that are not masteries.
- Update Bard mechanics for aura songs and the new Leadership attribute formula.
- Publish Bardic Strike timing from the updated game data.
- Regenerate Slagmaw loot and Archmage Illidan's Notable classification from authoritative data.
- Reconcile the Dazing Strike, remote song timer, and melee mercenary changes where the compendium describes those behaviors.

## Capabilities

### New Capabilities

- `class-skill-presentation`: Defines how class pages classify and order base, core, tier, mastery, and veteran skills.

### Modified Capabilities

- `skill-mechanics-card`: Adds the current Bard aura and Leadership formulas to the displayed mechanics contract.
- `notable-npc-classification`: Requires newly classified Notable NPCs to appear as Notable on compendium surfaces.

## Impact

- DataExporter and the export-to-SQLite pipeline may need compatibility updates for changed game fields.
- Class skill queries and the Bard class page need mastery classification and ordering changes.
- Skill mechanics formatters, mechanics prose, source citations, and snapshots may change.
- Exported data, generated databases, redaction decisions, and the published version will be regenerated.
