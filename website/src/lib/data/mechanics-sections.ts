import { statName } from "$lib/stats";
import type { PageSection } from "$lib/components/page-sections";
import { COMBAT_CHAPTERS } from "$lib/data/combat-outline";
import type { MechanicsHref } from "$lib/data/mechanics";

/**
 * The contents of each mechanics page, in page order. A page renders its
 * contents list from here, and site search returns every entry as a result of
 * its own, so a section added to a page's contents is searchable too. A page
 * without a contents list has none. The combat page's contents are its
 * chapters, each followed by its topics.
 */
export const MECHANICS_SECTIONS: Record<MechanicsHref, readonly PageSection[]> =
  {
    "/mechanics/character": [
      { id: "attributes", label: "The Six Attributes" },
      {
        id: "resources",
        label: `${statName("health")}, ${statName("mana")}, ${statName("rage")}, and Songs`,
      },
      {
        id: "skills-and-specializations",
        label: "Skills, Veteran Points, and Specializations",
      },
      { id: "macros", label: "Skillbar Macros" },
    ],
    "/mechanics/experience": [
      { id: "levels", label: "Levels" },
      { id: "level-rewards", label: "Level Rewards" },
      { id: "veteran-points", label: "Veteran Points" },
      { id: "kill-xp", label: "Kill XP" },
      { id: "death-xp", label: "Death XP" },
      { id: "scroll-xp", label: "Scroll XP" },
      { id: "gathering-xp", label: "Gathering XP" },
      { id: "alchemy-xp", label: "Alchemy XP" },
      { id: "scribing-xp", label: "Scribing XP" },
      { id: "cooking-xp", label: "Cooking XP" },
      { id: "crafting-xp", label: "Crafting XP" },
      { id: "augment-xp", label: "Augment XP" },
      { id: "quest-xp", label: "Quest XP" },
      { id: "zone-discovery-xp", label: "Zone Discovery XP" },
    ],
    "/mechanics/housing": [
      { id: "furniture", label: "Furniture and home workstations" },
      { id: "appearance", label: "Barbers and appearance" },
    ],
    "/mechanics/combat": COMBAT_CHAPTERS.flatMap((chapter) => [
      { id: chapter.id, label: chapter.title },
      ...chapter.topics.map((topic) => ({ id: topic.id, label: topic.title })),
    ]),
    "/mechanics/death": [],
    "/mechanics/monster-spawns": [
      { id: "cycle", label: "The respawn cycle" },
      { id: "empty-zones", label: "What happens when everyone leaves?" },
      { id: "bosses", label: "Boss respawn timers" },
      { id: "missing-boss", label: "Why a boss is absent" },
      { id: "rare-spawns", label: "Rare spawns" },
      { id: "renewal-sages", label: "Renewal Sages" },
      { id: "spawn-windows", label: "Day and night spawns" },
      { id: "summons", label: "Kill-triggered summons" },
      { id: "leashing", label: "Chase limits and resets" },
      { id: "other-spawns", label: "Other ways monsters appear" },
    ],
    "/mercenaries#how-it-works": [],
    "/mechanics/mercenary-stats": [],
    "/mechanics/bard": [
      { id: "songs", label: "Bard Songs" },
      { id: "cadence", label: "Final Cadence" },
      { id: "charm", label: "Bard Charm" },
    ],
    "/mechanics/party": [
      { id: "party", label: "Party" },
      { id: "shared-rewards", label: "Shared Rewards" },
      { id: "loot-rolls", label: "Need, Greed, and Pass" },
      { id: "chat-and-follow", label: "Chat and Follow" },
    ],
    "/mechanics/guilds": [
      { id: "membership", label: "Guild membership" },
      { id: "guild-points", label: "Guild points" },
    ],
    "/mechanics/reputation": [
      { id: "factions", label: "The Six Factions" },
      { id: "ladder", label: "The Nine Tiers" },
      { id: "monsters", label: "Killing Monsters" },
      { id: "npcs", label: "Killing NPCs" },
      { id: "quests", label: "Completing Quests" },
      { id: "chests", label: "Looting Faction Chests" },
      { id: "pets", label: "Petting Animals" },
      { id: "unlocks", label: "What Reputation Unlocks" },
      { id: "decay", label: "Decay and Limits" },
    ],
    "/mechanics/world": [
      { id: "game-modes", label: "Game modes and Hardcore" },
      { id: "exploration", label: "Exploration and maps" },
      { id: "map-notes", label: "Personal map notes" },
      { id: "binding-and-travel", label: "Binding and travel" },
      { id: "portals", label: "Portals and entry requirements" },
      { id: "seasonal-events", label: "Seasonal events" },
    ],
    "/mechanics/regional-events": [
      { id: "availability", label: "When events happen" },
      { id: "activities", label: "What to do" },
      { id: "regions", label: "Events by region" },
      { id: "rewards", label: "Goals and rewards" },
      { id: "prosperity", label: "Prosperity" },
      { id: "invasions", label: "City invasions" },
    ],
    "/mechanics/seasonal-events": [
      { id: "schedule", label: "When they run" },
      { id: "double-xp", label: "Double XP" },
      { id: "halloween", label: "Halloween" },
      { id: "winter-festival", label: "Winter Festival" },
    ],
    "/mechanics/inventory": [
      { id: "overview", label: "Storage at a glance" },
      { id: "backpacks", label: "Backpacks" },
      { id: "bank", label: "Bank tabs and gold" },
      { id: "house-chests", label: "House chests and shared storage" },
      { id: "item-movement", label: "Item movement and stacks" },
      { id: "merchants", label: "Merchants, buyback, and repairs" },
      { id: "loot", label: "Loot pickup" },
      { id: "equipment-templates", label: "Equipment templates" },
      { id: "durability-and-repair", label: "Equipment durability and repair" },
      { id: "armor-sets", label: "Armor sets" },
      { id: "consumables", label: "Consumables and item types" },
    ],
    "/mechanics/crafting": [
      { id: "crafting", label: "Crafting at a station" },
      { id: "augments", label: "Attaching and removing augments" },
    ],
  };
