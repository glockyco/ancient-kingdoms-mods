## Context

`Seo.svelte:12-48` takes a complete title from each route. `meta-description.ts:122-125` builds item titles; other route components often embed their own title. The prerendered output contains 3,682 HTML pages. Of these, 402 pages participate in 142 duplicate-title groups: chests 133, items 103, skills 95, gathering resources 33, quests 15, monsters 7, zones 6, altars 5, professions 4, and summons 1. These are counts of pages involved, not excess pages; cross-family groups contribute to each family. The same output has 2,002 pages in 425 duplicate-description groups, including 1,081 items and 569 skills.
Four unsuffixed fishing-family pages canonicalize to their first suffixed placement (`gather-items/[id]/+page.server.ts:94-103,133-143`; `+page.svelte:516-520`). They are non-indexable aliases, so only 3,678 prerendered HTML pages are self-canonical. Of those, 398 participate in the same 142 title-collision groups. The 402-page measurement includes the four aliases; the title gate excludes them. The home page is served dynamically and appears separately as a bare sitemap URL.

Commit `6583ff92` removed both `itemTypeSuffix` and the item-title parenthetical. Its previous version called `WeaponDagger` a “Dagger”, although `items.drakespear` is a spear with that category. It also printed raw equipment slots such as `Ear`, `Neck`, and `Chest`, rather than the verified display names `Earring`, `Necklace`, and a chest-equipment description. The old switch assigned some names from broad item flags and defaulted to a raw internal category. Those mappings described implementation fields, not necessarily the named object. `formatEquipmentCategory` now presents `WeaponDagger` as `1H Weapon (Light)` (`website/src/lib/utils/format.ts:97-118`). Reinstating the removed switch would revive the defect.

## Goals / Non-Goals

**Goals:** A complete, measured title contract for every indexable prerendered page. Prefer the shortest truthful descriptor that identifies its subject, even when the subject appears in several families.

**Non-Goals:** Make every meta description unique. The 2,002 duplicate-description pages need a separate, content-based quality change. Adding names mechanically to those descriptions would merely mask boilerplate and distort their role as summaries. Leave the existing descriptions unchanged in this change. Do not promise a search-engine character cutoff; the length budget guides useful human-readable titles.

## Decisions

### Use a reviewed family label, then verified detail, then stable identity

Assemble `{entity or subject} ({family or verified context}) - Ancient Kingdoms`. For chests, use `Chest in {zone}` as the subject. A name already containing its family term may keep that term without a redundant parenthetical if no other page collides. Use display names and existing loader data rather than inferred meaning from enum names. Every self-canonical page, including static guides and overview pages, participates in the global collision check.

Try these tie-breakers in order: (1) a short verified kind, class, role, level, zone, or subtype; (2) a distinct verified placement position; (3) a stable public identity derived from the canonical route's entity ID. Do not use a changing ordinal such as “Chest #3” unless that number is a durable, displayed domain identifier. A route suffix is a last resort when two placements really share their visible attributes. Apply tie-breaking against the full title set, not just within a route family. Handle same-name entities without asserting ownership from an unreliable skill flag, dynamic pet level from a placeholder, or an unverified chest label.

### Family rules and examples

The examples illustrate the preferred output for rows or routes observed in the current database/prerender. Context after a comma is included only when needed and verified. All examples retain the brand suffix.

| Family | Primary rule | Example |
|---|---|---|
| Items | Name + reviewed item type; add quality or a verified subtype only to resolve a collision. Never call all light weapons daggers. | `Winter Orange (Food) - Ancient Kingdoms`; `Drakespear (Light Weapon) - Ancient Kingdoms` |
| Skills | Name + Skill; add class/tier only for verified player ownership, otherwise a verified item/pet/monster association or stable ID. Tier 0 has no Roman numeral. | `Winter Orange (Skill) - Ancient Kingdoms` |
| Monsters | Name + Monster; add verified boss/fabled classification or level when useful; level 0 does not mean a level-zero encounter. | `The Archon (Monster, Level 9) - Ancient Kingdoms` |
| NPCs | Name + NPC; add a verified primary role or zone when useful. | `Iarth Bonegloom (Quest Giver NPC) - Ancient Kingdoms` |
| Quests | Name + Quest; add verified story tier or positive minimum character level when needed. | `Despair (Main Quest, Level 10+) - Ancient Kingdoms` |
| Zones | Name + Zone or Dungeon; include verified level range when helpful, and omit unknown bounds. | `Despair (Dungeon, Levels 12–53) - Ancient Kingdoms` |
| Summons | Name + the verified Familiar or Companion kind; never use the pet row's placeholder level. | `Blue Fairy (Familiar) - Ancient Kingdoms` |
| Mercenaries | Existing name already says Mercenary; use class if it is not present in the name. | `Ranger Mercenary - Ancient Kingdoms` |
| Altars | Name + zone; add coordinates or stable placement ID only for same-zone collisions. | `Forgotten Altar (Twilight Forest) - Ancient Kingdoms` |
| Gathering resources | Name + verified plant/mineral/fishing kind or tier; canonical spot variants add zone and coordinates. Unsuffixed aliases retain the first spot's canonical identity. | `Calm Fishing Spot (Crescent Coast, 656.44, 319.35) - Ancient Kingdoms` |
| Factions | Name + Faction; keep the existing faction qualifier if already truthful. | `Army of Order - Factions - Ancient Kingdoms` |
| Classes | Name + Class; do not infer class from an item's restriction. | `Warrior (Class) - Ancient Kingdoms` |
| Chests | Chest + zone; add verified position and then stable ID when positions coincide. Never expose `Chest RF Interiors` as a player-facing name. | `Chest in Everfrost (146.505, 674.686) - Ancient Kingdoms` |
| Recipes | Result item name + verified Alchemy/Cooking/Crafting/Scribing Recipe; avoid duplicate “Recipe” wording. | `Runed Scroll of Lethargy (Scribing Recipe) - Ancient Kingdoms` |
| Professions | Name + Profession; the four measured collisions are with quests or other families. | `Herbalism (Profession) - Ancient Kingdoms` |

Use the existing map coordinate convention for position values and preserve sufficient precision to distinguish points. If rounded positions collide, use the unrounded known position or a stable route ID. An unsuffixed fishing route has no `gathering_resources` row (`gather-items/[id]/+page.server.ts:17-32`). It renders the first spot's details with a selector and all spawn zones (`+page.svelte:58-79,90-113`), but canonicalizes to that first spot. Do not require its title to identify a separate indexable page. A page title is not a map-label replacement; visible page headings remain independent.

### Length and verification

Aim at 60 characters with the brand; use at most 70 when a shorter equivalent is available. Prefer dropping optional level, class, or role detail before shortening a name or a necessary identity. Keep the full entity name and brand even when the shortest truthful unique title exceeds 70. The existing longest title is 65 characters. Add a post-prerender check that reads decoded `<title>` text and each page's canonical link, excludes noncanonical aliases, maps self-canonical pages to canonical URLs, and fails with every colliding URL, empty title, omitted brand, or avoidably excessive length. Include collision cases in focused generator tests and use the complete prerendered output as the final proof. Do not assert regexes over source files.

**Alternatives rejected:** Restore `itemTypeSuffix` unchanged: it mislabeled `Drakespear`. Add an opaque ID to every title: unique, but needlessly obscures useful context. Use a fixed numeric ordinal per collision group: unstable when new entities are inserted. Depend on title generators alone: cross-family collisions remain invisible.

## Risks / Trade-offs

- [A new export introduces unfamiliar labels] → Verify against displayed data and fail on missing required classifications; do not create a silent default.
- [Two placements have the same rounded coordinates] → Compare the entire output and append their stable identity only if needed.
- [Some long names exceed the preferred budget] → Keep truthful names and brand rather than truncate them.

## Migration Plan

Add shared title builders, migrate all detail callers, and verify every indexable prerendered page before deployment. Keep the former deployment if the collision gate fails. Rollback uses the previous deployment; it does not restore the misleading item switch.
