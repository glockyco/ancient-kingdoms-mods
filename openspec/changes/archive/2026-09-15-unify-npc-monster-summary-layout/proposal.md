## Why

NPC detail pages separate the sprite from combat information, while monster detail pages present the same information in a compact visual summary. The inconsistent layout makes NPC combat values harder to scan even though the compendium already has complete NPC sprites and combat data.

## What Changes

- Present NPC sprites and primary combat values in the same responsive summary layout used for monsters.
- Extract the shared visual and combat-stat structure into one reusable Svelte component instead of duplicating page markup.
- Keep entity-specific metadata separate: monsters show type and class, while NPCs show race and faction when those values exist.
- Preserve the detailed combat sections and existing monster level and spawn-stat behavior.

## Capabilities

### New Capabilities

- `entity-combat-summary`: Defines the common monster and NPC combat-summary presentation, entity-specific metadata, and responsive behavior.

### Modified Capabilities

None.

## Impact

- `website/src/lib/components/`: Add the shared combat-summary component.
- `website/src/routes/monsters/[id]/+page.svelte`: Move the existing monster summary presentation into the shared component without changing resolved values.
- `website/src/routes/npcs/[id]/+page.svelte`: Replace the image-only summary with the shared combat summary and move race and faction into its metadata area.
- No exporter, pipeline, schema, or database changes are required.
