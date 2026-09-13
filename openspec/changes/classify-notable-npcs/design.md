## Context

The current game adds `Npc.isNotableNPC` and uses it only when it calculates positive NPC kill reputation. The DataExporter omits the field, so every downstream NPC record loses the classification. The website therefore applies the ordinary `level × 1.5` gain to King Darin and publishes `+90` instead of `+5,400`.

The map models service roles as facets of one NPC marker. Monster classifications such as Fabled use first-class marker definitions with distinct presentation and precedence.

## Goals / Non-Goals

**Goals:**

- Preserve one authoritative boolean from runtime export through SQLite and website types.
- Use one shared reputation calculation on NPC and faction pages.
- Model Notable as a classification, not as a service role.
- Give Notable NPCs first-class map and search presentation.
- Preserve ordinary NPC behavior and King Darin's existing map identity and coordinates.

**Non-Goals:**

- Change game behavior or infer other Notable NPCs.
- Change negative NPC kill reputation, loot, experience, respawn, combat, or quests.
- Reuse the Fabled label, color, or icon for Notable NPCs.
- Add a second marker registry or consumer-specific classification table.

## Decisions

### Store `is_notable` as a top-level NPC field

The exporter reads `Npc.isNotableNPC` directly and writes `is_notable`. The pipeline model and `npcs` table preserve the boolean. Website NPC, faction, search, and map queries read the same field.

A top-level field keeps the classification separate from `roles`. It also matches the treatment of monster classification flags such as `is_fabled`.

### Keep the multiplier in the shared NPC reputation utility

The NPC reputation input gains `is_notable`. Positive reputation uses `level × 1.5 × (is_notable ? 60 : 1)`. Negative reputation remains `level × 5`.

NPC detail and faction pages continue to call the shared utility. This prevents separate formulas from drifting.

### Present Notable as classification metadata

NPC list and detail data include `is_notable`. The detail header displays a Notable NPC badge beside, but separate from, service-role badges. The NPC directory exposes the classification in its visible data and filter controls. Search keywords include `notable`, and search results identify the classification.

### Register one Notable NPC map marker definition

`marker-registry.ts` owns the new marker id, label, icon, color, size, precedence, visibility, and sidebar placement. `NpcMapEntity` carries `isNotable`. The Notable marker reads the existing NPC source and has higher precedence than the ordinary NPC marker. The ordinary marker excludes notable rows, so one spawn produces one marker.

The Notable marker uses a distinct presentation and visibility control under the NPC sidebar section. It remains visible by default as an important classification. Tooltip and popup classification labels come from the resolved marker metadata. Existing role badges still come from the NPC role bitmask.

Selection continues to use the NPC entity id. The existing detail-page URL therefore resolves King Darin's current spawn without a migration or alias.

### Update explanatory mechanics and generated evidence

The reputation mechanics page states that the 60-times multiplier affects positive NPC kill reputation only. It uses King Darin's current values as the example and removes claims that all NPC gains are small or that level 50 is the maximum.

Hardcoded formula text cites the current `Npc` implementation. Generated exports, SQLite data, search data, citation records, and prerendered output are refreshed through existing commands.

## Risks / Trade-offs

- A new map visibility key changes URL and local visibility state. Use a new stable key without renaming existing keys.
- A marker category for one current NPC adds UI weight. The category is justified by an authoritative gameplay classification and supports future notable NPCs without redesign.
- A stale runtime export would leave King Darin unclassified. Runtime verification must inspect `npcs.json` and confirm that only game-marked records are notable.
- Map precedence can duplicate or hide King Darin if ordinary and Notable match rules overlap. Registry tests and browser verification must confirm one selectable marker.
