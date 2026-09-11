---
title: "Detail-Page Title Suffixes"
type: spec
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Detail-Page Title Suffixes

Add informative type and level suffixes to detail-page titles for entities that
currently expose only a name. Every generated title keeps the `- Ancient Kingdoms`
brand suffix.

## Current state

`itemTitle` and `itemTypeSuffix` in `lib/server/meta-description.ts` are the existing
title-generator pattern, and they are the only ones. Item titles
already include a quality and type suffix. The description-body prerequisite for
this work is complete, so title suffixes are the remaining SEO improvement.

Every new generator lands in `lib/server/meta-description.ts` beside `itemTitle`.

Detail routes and the titles they emit today:

| Page | Current title format |
|---|---|
| `/monsters/[id]` | `{monster.name} - Ancient Kingdoms` |
| `/npcs/[id]` | `{npc.name} - Ancient Kingdoms` |
| `/quests/[id]` | `{quest.name} - Ancient Kingdoms` |
| `/zones/[id]` | `{zone.name} - Ancient Kingdoms` |
| `/skills/[id]` | `{skill.name} - Ancient Kingdoms` |
| `/summons/[id]` | `{pet.name} - Ancient Kingdoms` |
| `/mercenaries/[id]` | `{pet.name} - Ancient Kingdoms` |
| `/altars/[id]` | `{altar.name} - Ancient Kingdoms` |
| `/gather-items/[id]` | `{resource.name} - Ancient Kingdoms` |
| `/factions/[id]` | `{name} - Factions - Ancient Kingdoms` |
| `/classes/[id]` | `{class.name} - Ancient Kingdoms` |
| `/chests/[id]` | `Chest - {zone_name} - Ancient Kingdoms` |

Summons and mercenaries share `lib/server/pet-page.ts:loadPetPage` and `PetDetail.svelte`.
Generate the title in `loadPetPage` beside the description, then pass it through both route pages to
`PetDetail`. Never import the server-only generator into a Svelte component. One generator branches on
all three `pet.kind` values: `Companion`, `Familiar`, and `Mercenary`. Faction names are unique, so their existing title remains
unchanged. Classes are also unique and remain unchanged. Chests are named after
their zone and already carry that context. `/traps` is an overview, not a detail
route, and is out of scope.

## Proposed formats

The suffix goes inside parentheses immediately after the entity name. The brand
suffix remains at the end.

| Page | Proposed format | Example |
|---|---|---|
| `/monsters/[id]` | `{name} (Level X {Classification}) - Ancient Kingdoms` | `Troll King Grimlok (Level 17 Boss) - Ancient Kingdoms` |
| `/quests/[id]` | `{name} ({Tier}, Level X+) - Ancient Kingdoms` | `Chronicles of the Lost Crown IV (Main Quest, Level 20+) - Ancient Kingdoms` |
| `/npcs/[id]` | `{name} ({Primary Role}) - Ancient Kingdoms` | `Talindra Norqirelle (Quest Giver) - Ancient Kingdoms` |
| `/zones/[id]` | `{name} ({Type}, Level X-Y) - Ancient Kingdoms` | `The Molten Summit (Dungeon, Level 30-40) - Ancient Kingdoms` |
| `/skills/[id]` | `{name} ({Class} Tier I) - Ancient Kingdoms` | `Fireball (Wizard Tier I) - Ancient Kingdoms` |
| `/summons/[id]` | `{name} ({Class} {Kind}) - Ancient Kingdoms` | Kind is `Companion` or `Familiar`, as loaded |
| `/mercenaries/[id]` | `{name} ({Class} Mercenary) - Ancient Kingdoms` | `Iron Guard (Warrior Mercenary) - Ancient Kingdoms` |
| `/altars/[id]` | `{name} ({Type}) - Ancient Kingdoms` | `Altar of Fire (Forgotten Altar) - Ancient Kingdoms` |
| `/gather-items/[id]` | `{name} (Tier II {Type}) - Ancient Kingdoms` | `Iron Ore (Tier II Mineral) - Ancient Kingdoms` |

## Edge cases

- Monsters with `level_min === level_max === 0` omit the level segment and retain
  the classification, such as `{name} (Boss) - Ancient Kingdoms`.
- NPCs with multiple roles use `pickPrimaryRole` from
  `lib/server/meta-description.ts`, which defines the role priority.
- Zones with both `level_min` and `level_max` set to `null` omit the level range
  and retain the zone type, such as `{name} (Dungeon) - Ancient Kingdoms`.
- Classless skills can belong to pets, items, or monsters. Use only verified ownership; absence of a class does not imply `Monster`. Omit ownership when no reliable context exists.
- Pet titles use their actual kind and omit class context when unavailable. The current database has two companions, three familiars, and six mercenaries.
- Tier 0 skills omit the tier numeral.
- Quests with `level_required = 0` omit the level segment.
- Titles should stay under 60 characters when possible and never exceed 70 characters
  when a shorter equivalent is available. Longer titles remain valid when the entity
  name and required suffix cannot fit within that target.

## Rationale

The title is the strongest page-level SEO signal and the text shown as the search
result target. Type, classification, role, tier, and level details distinguish
identically named entities and match level-specific searches. Parenthesized suffixes
also preserve the site's existing title shape and keep the entity name as the first
visible text.

## Tasks

- [ ] Add a monster title generator and wire `/monsters/[id]` to it.
- [ ] Add a quest title generator and wire `/quests/[id]` to it.
- [ ] Add an NPC title generator and wire `/npcs/[id]` to it.
- [ ] Add a zone title generator and wire `/zones/[id]` to it.
- [ ] Add a skill title generator and wire `/skills/[id]` to it.
- [ ] Add the shared pet title generator for all three kinds; call it from `loadPetPage` and pass its result through both route pages to `PetDetail`.
- [ ] Add an altar title generator and wire `/altars/[id]` to it.
- [ ] Add a gather-resource title generator and wire `/gather-items/[id]` to it.
- [ ] Add unit coverage for each generator and its missing level, tier, and class edge cases.
