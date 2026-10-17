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
      { id: "furniture", label: "Furniture and Home Workstations" },
      { id: "appearance", label: "Barbers and Appearance" },
    ],
    "/mechanics/combat": COMBAT_CHAPTERS.flatMap((chapter) => [
      { id: chapter.id, label: chapter.title },
      ...chapter.topics.map((topic) => ({ id: topic.id, label: topic.title })),
    ]),
    "/mechanics/death": [],
    "/mechanics/monster-spawns": [
      { id: "cycle", label: "The Respawn Cycle" },
      { id: "empty-zones", label: "Empty Zones Are Switched Off" },
      { id: "bosses", label: "Boss Respawn Timers" },
      { id: "missing-boss", label: "Why a Boss Is Absent" },
      { id: "rare-spawns", label: "Rare Spawns" },
      { id: "renewal-sages", label: "Renewal Sages" },
      { id: "spawn-windows", label: "Day and Night Spawns" },
      { id: "summons", label: "Kill-Triggered Summons" },
      { id: "leashing", label: "Chase Limits and Resets" },
      { id: "other-spawns", label: "Other Ways Monsters Appear" },
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
      { id: "membership", label: "Guild Membership" },
      { id: "guild-points", label: "Guild Points" },
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
      { id: "game-modes", label: "Game Modes and Hardcore" },
      { id: "exploration", label: "Exploration and Maps" },
      { id: "map-notes", label: "Personal Map Notes" },
      { id: "binding-and-travel", label: "Binding and Travel" },
      { id: "portals", label: "Portals and Entry Requirements" },
      { id: "seasonal-events", label: "Seasonal Events" },
    ],
    "/mechanics/inventory": [
      { id: "overview", label: "Storage at a Glance" },
      { id: "backpacks", label: "Backpacks" },
      { id: "bank", label: "Bank Tabs and Gold" },
      { id: "house-chests", label: "House Chests and Shared Storage" },
      { id: "item-movement", label: "Item Movement and Stacks" },
      { id: "merchants", label: "Merchants, Buyback, and Repairs" },
      { id: "loot", label: "Loot Pickup" },
      { id: "equipment-templates", label: "Equipment Templates" },
      { id: "durability-and-repair", label: "Equipment Durability and Repair" },
      { id: "armor-sets", label: "Armor Sets" },
      { id: "consumables", label: "Consumables and Item Types" },
    ],
    "/mechanics/crafting": [
      { id: "crafting", label: "Crafting at a Station" },
      { id: "augments", label: "Attaching and Removing Augments" },
    ],
  };
