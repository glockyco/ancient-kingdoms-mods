# Proposal

## Why

Ancient Kingdoms 0.10.4.0 adds the Chambers of Chaos, but the compendium has no account of its runs, entry item, rewards or augment upgrade chain. Its private generated rooms also break the world-position assumption behind zone shots, so full coverage must land before publishing this game version.

## What Changes

- Publish a visual Chambers of Chaos rules page and the zone 26 page, linked to the keeper and monster pool, with existing redacted-item placeholders for excluded entry items and rewards. Compare structurally different implementations on the real page after data plumbing and in-run captures are ready.
- Export the Chambers config and callable rule values, with deterministic inputs rather than values from the exporting character or run.
- Add Mordrath's `is_chambers_of_chaos_keeper` role end to end, including NPC descriptions and search.
- Model Seal of Chaos privately as a code-defined drop from qualifying non-boss elites at their live level, and Chaos Token as the guardian reward. Published elite drops, entry cost, guardian reward and catalyst price use redacted-item placeholders, never the excluded names, icons or links.
- Export `augment_upgrade` items and `augment_next_quality_id`. Model one catalyst plus one eligible loose augment becoming its next quality, including the Legendary augments' sources and both inputs' reverse uses. Connect the reward chain through the five Adventurer merchants' token offers.
- Capture at least three distinct real in-run layouts, use one as the zone shot and others on the rules page. Record seed, chamber, trial kind and room-relative camera position, validate mode and image integrity, and review frames by eye.
- Cover Riddle, Runes and Manuscript trials without publishing their riddle or puzzle content until the developer's publication answer is recorded. Spoiler hiding is a later presentation choice, not the publication gate.

## Capabilities

### New Capabilities

- `chambers-of-chaos`: rules coverage, the procedural zone, tower monster context and runtime verification.

### Modified Capabilities

- `game-data-export`: authoritative Chambers config and rules, the keeper role, catalyst type and augment upgrade links.
- `compendium-build`: complete validated placeless-zone captures and multiple illustration assets.
- `item-acquisition`: level-conditioned seal rolls, guardian rewards and canonical augment upgrade methods.
- `item-usage`: seal entry consumption and catalyst/augment reverse uses from the same methods.
- `compendium-redaction`: a closed-by-default publication gate for Chambers riddle and puzzle content across all outputs.
- `website-presentation`: in-page comparison before selecting the visual rules-page structure, and a procedural-zone adaptation that does not invent map geometry.

## Impact

- `mods/DataExporter/`, export registration and integrity readers, pipeline models/loaders/schema and NPC role bitmask.
- Shared acquisition normalization, requirements, reachability and website server/browser readers, source/use projections and renderers.
- `mods/HotReplCommands/` capture command and DTOs, zone-shot configuration, manifest validation and visual asset publication.
- Mechanics, zone, NPC, monster and item pages, search/navigation metadata and runtime/browser verification.
- Shared skill-effect text and its Pocket Compendium parity port/corpus for Chambers binding and Veteran Awareness exceptions. These are text corrections, not a new mod feature.
- `redactions.toml`, the shared removal machinery and ledger verification. Contributor and HotRepl references need the placeless capture workflow where they explain zone shots. No README addition is planned.

## Publication Policy

Every item carrying `ignore_journal` remains excluded because the developer asked for all such items to be left out of the compendium. Seal of Chaos, Chaos Token and Torn Page of Chaos therefore remain excluded alongside the other flagged items. Their private export identities remain accurate.

Published Chambers coverage uses the existing "Redacted item" behavior wherever a retained entry needs an excluded item, including eligible elite drops, entry cost, guardian reward and Chaos Catalyst's price. Placeholders retain the permitted amount or chance but disclose no excluded name, icon, link or identifier. The rules page, charts, captions and screenshots obey the same policy.

The item-publication policy and its removal set do not change, so no item-publication delta or exception is added. Correct `redactions.toml` to state the developer's request as the reason, not that flagged items are internal. Ledger changes come only from the new modeled relationships or challenge-content gate and are reviewed through their producer.

Seal of Chaos, Chaos Token and Torn Page of Chaos remain excluded. Publishing them, or any challenge content, needs the developer's permission in a later change.

## Non-Goals

- Do not select the page's final visual design in this change's planning artifacts.
- Do not publish fixed Chambers spawns, a world map or run-specific layouts as authored geography.
- Do not change game rules or Pocket Compendium behavior.
- Do not publish puzzle answers by treating a collapsed spoiler control as permission.
