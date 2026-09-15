## Context

The monster detail page owns a three-column combat summary with the sprite in the center, resistance values on the left, and offensive values plus entity classifications on the right. The NPC detail page receives the same primary combat values and a primary visual asset, but its summary card contains only the sprite. NPC combat values are fixed at the NPC's level. Monster values can depend on the selected spawn or level.

All 234 published NPCs have a primary visual asset and complete primary combat values. Race and faction are optional; Naia Leolynn currently has neither.

## Goals / Non-Goals

**Goals:**

- Keep one implementation of the shared combat-summary structure and responsive behavior.
- Preserve each page's existing stat-resolution ownership.
- Keep entity-specific metadata extensible without adding monster or NPC branches to the shared component.
- Preserve prerendered, no-JavaScript output and accessible labels.

**Non-Goals:**

- Change exported data, database schemas, stat formulas, or spawn selection.
- Merge monster and NPC domain types.
- Remove the detailed combat-stat sections.
- Invent metadata when an optional game field is absent.

## Decisions

### Use a focused shared presentation component

Add `EntityCombatSummary.svelte` under `website/src/lib/components/`. It will own the section shell, responsive grid, common combat icons, compact health formatting, sprite sizing, and the six common stat groups. Scalar props will carry the resolved values and image metadata.

The component will not query data or calculate level-dependent values. The monster page will continue to resolve spawn and level values. The NPC page will pass its existing level-resolved values directly.

Copying the layout into the NPC page would create two implementations that can drift. A generic entity model would couple unrelated domain data and move calculation ownership into a presentation component.

### Provide entity metadata through a Svelte snippet

The component will accept an optional metadata snippet rendered after physical damage, magical damage, and defense. The monster page will supply its current Type and Class rows. The NPC page will supply Race and linked Faction rows when present.

A snippet keeps domain-specific links, icons, and conditions in their owning pages. It avoids a growing set of nullable metadata props and avoids domain checks inside the shared component.

### Align NPC header and summary metadata

Move NPC Race and Faction from the header metadata line into the summary card. Add the NPC level to the header metadata line, matching the monster page's information hierarchy. Keep kill-reputation effects in the header.

### Preserve the detailed combat sections

The visual summary is a scan-friendly overview. Existing detailed sections remain because they include secondary values such as mana, block chance, critical chance, accuracy, special flags, and gold drops.

## Risks / Trade-offs

- Extracting the established monster layout could cause visual regression. Browser verification must compare a monster before and after the extraction at desktop and narrow viewports.
- Long faction names can pressure the right column. The metadata snippet must retain the existing wrapping and minimum-width behavior.
- Optional metadata can leave fewer right-column rows. The shared grid must remain balanced without placeholder content.
