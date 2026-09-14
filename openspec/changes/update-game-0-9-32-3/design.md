## Context

See `proposal.md` for motivation. Class pages currently derive display categories from `base_skill`, `tier`, and `is_veteran`. The game does not expose a separate mastery flag. It does expose an ordered skill-template list for each class, but the exporter currently reduces that list to class membership and discards the position. This causes post-tier Bard masteries to sort with early Core skills.

The 0.9.32.3 source changes both exported data and mechanics that are not stored as skill fields. Generated data must remain derived from the game, and runtime-only behavior must remain grounded in cited source.

## Goals / Non-Goals

**Goals:**

- Preserve each class's authoritative skill-template order through export, SQLite, and page queries.
- Derive the Mastery boundary from progression structure rather than skill names or tooltip text.
- Publish hotfix data and mechanics without adding manual entity overrides.

**Non-Goals:**

- Reproduce the game's graphical skill tree.
- Add compendium surfaces for remote-player buff timers or mercenary combat AI.
- Infer undocumented effects for the Dazing Strike and melee-mercenary fixes.
- Regenerate world-map geometry because this hotfix does not change it.

## Decisions

### Export a per-class skill position

Each skill record will carry a map from class identifier to its zero-based position in that class's `skillTemplates` array. A map is required because shared skills can occupy different positions in different class lists. The pipeline will validate and store this value rather than recompute it from the unordered skill resource collection.

Alternative: sort by required spent points. Rejected because this mixes unlock requirements with authored presentation and already places Bard masteries among Core skills.

Alternative: parse `Advanced Skill` from the tooltip. Rejected because localized presentation text is not progression metadata.

### Derive Mastery from the class progression sequence

For a given class, a non-base, non-veteran, tier-zero skill is a Mastery when the authoritative class sequence places it after that class's last tiered skill and before the first zero-rank utility action or veteran skill. Other tier-zero skills remain Core. The class page will sort by the exported position, while category ordering remains Base, Core, Tier 1 through Tier 4, Mastery, and Veteran.

The exported Bard sequence puts Song of Varensea, Inspiring Crescendo, and Grand Symphony after the final tiered skill, then starts the zero-rank utility section with Fishing. This structural boundary avoids both tooltip parsing and entity ID lists.

### Separate data changes from source-only behavior

The rebuilt database will carry Dazing Strike requirements, Bardic Strike tooltip timing, Slagmaw loot, and Archmage Illidan's Notable field directly from the export. Bard aura behavior and Leadership's attribute formula will be updated in mechanics code and prose with source citations. Remote song timers and melee mercenary targeting have no compendium surface; source reconciliation will confirm that no stale user-facing claim remains.

## Risks / Trade-offs

- Class-template order becomes a published data contract. A future game reorder will produce a deliberate data diff and may move table rows.
- A malformed sequence could misclassify a trailing utility skill. Pipeline validation and Bard-specific output inspection mitigate this; the implementation must not silently invent a category.
- Aura refresh timing can be confused with the lifetime of each refreshed buff. Mechanics prose must distinguish maintained behavior from the internal expiry window.
