## Context

The Adventurer's Guide (`UIWiki`, `GameWikiContent`) loads its articles from JSON text assets under `Resources/Wiki` and generates skill entries from `PlayerSkills.skillTemplates`. A dump from game 0.9.34.0 holds 64 articles in seven categories and 415 skill entries. The compendium already covers every guide skill with more detail than the guide: all ranks, prerequisites, and scaling. It covers about half of the article rules.

## Goals / Non-Goals

**Goals:**

- Cover every guide article in a compendium section, and keep that coverage checked across game updates.
- Let a player reach a section through the guide's own terms.
- Add the missing rules at the level of detail that a player needs to act on.

**Non-Goals:**

- Republishing the guide text. The compendium writes its own sentences and cites the code.
- The guide's skill browser, its skill-tree picture, and its rank stepper. Skill pages already show every rank.
- A map-notes editor on the compendium map.
- Other languages. The site is English only.

## Decisions

### Export English text only

`GameGuideExporter` calls `GameWikiContent.Load()` and writes the entries that have an article. It writes `titleEn` and `bodyEn` directly instead of the selected-locale text, so the export does not depend on the game's language setting.

### The coverage map lives in the website

`website/src/lib/data/game-guide/coverage.ts` maps each article identifier to an `href` and to the SHA-256 digest of the reviewed English body. The search registry needs the `href` values at runtime, so the map is TypeScript beside the registry. A database test (`coverage.db.test.ts`) compares the map with the `game_guide_articles` table and checks that each mapped anchor exists as a literal `id="…"` attribute in the route source. A dynamic route resolves to its `[id]` directory.

Alternative: a pipeline command in Python. It would duplicate the map or need a second format, and it could not see route sources as simply.

### Search uses a new entity family

The entity manifest gains `guide_topic`, backed by `game_guide_articles`. Its detail link comes from the coverage map, like the achievement anchors. The document content is the article body, so body words match too.

### Section anchors

Every mapped section uses this anchor. Pages MUST create exactly these identifiers.

| Article | Section |
|---|---|
| `classes.<class>` | `/classes/<class>#class-guide` |
| `combat.targeting` | `/mechanics/combat#targeting` |
| `combat.attributes` | `/mechanics/character#attributes` |
| `combat.resources` | `/mechanics/character#resources` |
| `combat.damage-defense` | `/mechanics/combat#combat-advantage` |
| `combat.skills-veteran-specs` | `/mechanics/character#skills-and-specializations` |
| `combat.buffs-wards-cleanse` | `/mechanics/combat#effects-and-control` |
| `combat.bard-songs` | `/mechanics/bard#songs` |
| `combat.bard-charm` | `/mechanics/bard#charm` |
| `combat.death-resurrection` | `/mechanics/death#death` |
| `companions.mercenary-roster` | `/mercenaries#roster` |
| `companions.commands-stances` | `/mercenaries#commands` |
| `companions.mercenary-equipment` | `/mercenaries#equipment` |
| `companions.auto-consume` | `/mercenaries#auto-consume` |
| `companions.support-tanking-dodging` | `/mercenaries#ai-behavior` |
| `companions.death-resurrection` | `/mercenaries#resurrection` |
| `companions.pets-familiars` | `/summons#pets-and-familiars` |
| `companions.friendly-whistles` | `/summons#friendly-followers` |
| `social.party-basics` | `/mechanics/party#party` |
| `social.shared-rewards` | `/mechanics/party#shared-rewards` |
| `social.loot-rolls` | `/mechanics/party#loot-rolls` |
| `social.chat-follow` | `/mechanics/party#chat-and-follow` |
| `social.guild-membership` | `/mechanics/guilds#membership` |
| `social.guild-points` | `/mechanics/guilds#guild-points` |
| `professions.herbalism` | `/professions/herbalism#how-it-works` |
| `professions.mining` | `/professions/mining#how-it-works` |
| `professions.fishing` | `/professions/fishing#how-it-works` |
| `professions.hunting` | `/professions/hunter#how-it-works` |
| `professions.radiant-sparks` | `/professions/radiant_seeker#how-it-works` |
| `professions.alchemy` | `/professions/alchemy#how-it-works` |
| `professions.cooking` | `/professions/cooking#how-it-works` |
| `professions.scroll-mastery` | `/professions/scroll_mastery#how-it-works` |
| `professions.crafting` | `/mechanics/crafting#crafting` |
| `items.augments` | `/mechanics/crafting#augments` |
| `items.furniture` | `/mechanics/housing#furniture` |
| `items.barber-appearance` | `/mechanics/housing#appearance` |
| `items.equipment-durability` | `/mechanics/inventory#durability-and-repair` |
| `items.armor-sets` | `/mechanics/inventory#armor-sets` |
| `items.inventory-stacks` | `/mechanics/inventory#item-movement` |
| `items.backpacks` | `/mechanics/inventory#backpacks` |
| `items.bank` | `/mechanics/inventory#bank` |
| `items.equipment-templates` | `/mechanics/inventory#equipment-templates` |
| `items.consumables-types` | `/mechanics/inventory#consumables` |
| `items.merchants-repair` | `/mechanics/inventory#merchants` |
| `items.houses-storage` | `/mechanics/inventory#house-chests` |
| `world.game-modes` | `/mechanics/world#game-modes` |
| `world.exploration-and-maps` | `/mechanics/world#exploration` |
| `world.map-notes` | `/mechanics/world#map-notes` |
| `world.binding-and-travel` | `/mechanics/world#binding-and-travel` |
| `world.portals-and-entry` | `/mechanics/world#portals` |
| `world.dungeon-renewal` | `/mechanics/monster-spawns#renewal-sages` |
| `world.boss-encounters` | `/mechanics/monster-spawns#missing-boss` |
| `world.factions-and-ranks` | `/mechanics/reputation#ladder` |
| `world.quest-objectives` | `/quests#how-quests-work` |
| `world.quest-availability` | `/quests#requirements-and-repeats` |
| `world.adventurers-guild` | `/professions/adventuring#how-it-works` |
| `world.events-and-trials` | `/altars#how-altars-work` |
| `world.journal-and-slayer` | `/professions/slayer#how-it-works` |

Two inventory anchors change. `#equipment-and-death` becomes `#durability-and-repair`, because death moves to `/mechanics/death`. `#vendor-buyback` becomes `#merchants`. Every inbound link moves with them.

### Level of detail

A section states the rules that change what a player does, with the numbers that matter. It does not restate the guide's general advice or the game's input controls, except where a control is itself the rule. Existing pages keep their structure. New pages follow the existing mechanics page pattern: `Seo`, `Breadcrumb`, `PageSections`, and one `Card.Root` for each section.

## Risks / Trade-offs

- [The guide is edited in a patch] → The digest check names each changed article, and the reviewer updates the section and the digest together.
- [A guide statement is wrong] → The code decides, and the defect goes to `docs/game-bugs/`.
- [A renamed anchor breaks an external link] → Accepted for two inventory anchors whose content moves.
