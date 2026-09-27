/**
 * NPC role configuration for display throughout the site.
 */

import type { NpcRoles } from "$lib/types/npcs";

/** Role category for icon grouping */
export type RoleCategory =
  | "quest"
  | "merchant"
  | "service"
  | "special"
  | "combat"
  | "renewal"
  | "travel";

export interface RoleConfig {
  /** Database key (e.g., "is_merchant") */
  key: keyof NpcRoles;
  /** Display label */
  label: string;
  /** Role category for icon selection */
  category: RoleCategory;
}

export interface RoleDescription {
  /** Description of what this role does */
  description: string;
  /** Additional details like costs or requirements */
  details?: string[];
}

/**
 * Configuration for each NPC role.
 * Order determines display order in badges.
 *
 * Categories:
 * - quest: Quest-related (Quest Giver, Daily Quests)
 * - merchant: Merchants (Merchant, Adv. Merchant, Faction Vendor, Essence Trader)
 * - service: Services (Banker, Repairs, Skill Master, etc.)
 * - special: Special services (Priestess, Augmenter)
 * - combat: Combat (Guard)
 * - renewal: Renewal Sage
 */
export const ROLE_CONFIG: RoleConfig[] = [
  { key: "is_quest_giver", label: "Quest Giver", category: "quest" },
  { key: "is_taskgiver_adventurer", label: "Daily Quests", category: "quest" },
  { key: "is_merchant", label: "Merchant", category: "merchant" },
  {
    key: "is_merchant_adventurer",
    label: "Adv. Merchant",
    category: "merchant",
  },
  { key: "is_faction_vendor", label: "Faction Vendor", category: "merchant" },
  { key: "is_essence_trader", label: "Essence Trader", category: "merchant" },
  { key: "is_bank", label: "Banker", category: "service" },
  { key: "can_repair_equipment", label: "Repairs", category: "service" },
  { key: "is_skill_master", label: "Skill Master", category: "service" },
  { key: "is_veteran_master", label: "Veteran Master", category: "service" },
  { key: "is_reset_attributes", label: "Attribute Reset", category: "service" },
  { key: "is_soul_binder", label: "Soul Binder", category: "service" },
  { key: "is_barber", label: "Barber", category: "service" },
  { key: "is_inkeeper", label: "Innkeeper", category: "service" },
  {
    key: "is_recruiter_mercenaries",
    label: "Mercenary Recruiter",
    category: "service",
  },
  { key: "is_guild_management", label: "Guild Manager", category: "service" },
  { key: "is_priestess", label: "Priestess", category: "special" },
  { key: "is_augmenter", label: "Augmenter", category: "special" },
  { key: "is_guard", label: "Guard", category: "combat" },
  { key: "is_renewal_sage", label: "Renewal Sage", category: "renewal" },
  { key: "is_teleporter", label: "Teleporter", category: "travel" },
];

/**
 * Get active roles for an NPC.
 * Returns RoleConfig objects for roles where the NPC has that role enabled.
 */
export function getActiveRoles(roles: NpcRoles): RoleConfig[] {
  return ROLE_CONFIG.filter((config) => roles[config.key] === true);
}

/**
 * Get active role keys for an NPC.
 * Useful for filtering in data tables.
 */
export function getActiveRoleKeys(roles: NpcRoles): string[] {
  return ROLE_CONFIG.filter((config) => roles[config.key] === true).map(
    (config) => config.key,
  );
}

/**
 * Get role config by key.
 */
export function getRoleConfig(key: string): RoleConfig | undefined {
  return ROLE_CONFIG.find((config) => config.key === key);
}

/**
 * Get role label by key.
 */
export function getRoleLabel(key: string): string {
  return getRoleConfig(key)?.label ?? key;
}

/**
 * Normalize partial role data to a complete NpcRoles object.
 * Useful when parsing JSON that may have missing fields.
 */
export function normalizeRoles(partial: Partial<NpcRoles>): NpcRoles {
  return {
    is_merchant: partial.is_merchant ?? false,
    is_barber: partial.is_barber ?? false,
    is_quest_giver: partial.is_quest_giver ?? false,
    can_repair_equipment: partial.can_repair_equipment ?? false,
    is_bank: partial.is_bank ?? false,
    is_skill_master: partial.is_skill_master ?? false,
    is_veteran_master: partial.is_veteran_master ?? false,
    is_reset_attributes: partial.is_reset_attributes ?? false,
    is_soul_binder: partial.is_soul_binder ?? false,
    is_inkeeper: partial.is_inkeeper ?? false,
    is_taskgiver_adventurer: partial.is_taskgiver_adventurer ?? false,
    is_merchant_adventurer: partial.is_merchant_adventurer ?? false,
    is_recruiter_mercenaries: partial.is_recruiter_mercenaries ?? false,
    is_guard: partial.is_guard ?? false,
    is_faction_vendor: partial.is_faction_vendor ?? false,
    is_essence_trader: partial.is_essence_trader ?? false,
    is_priestess: partial.is_priestess ?? false,
    is_augmenter: partial.is_augmenter ?? false,
    is_guild_management: partial.is_guild_management ?? false,
    is_renewal_sage: partial.is_renewal_sage ?? false,
    is_teleporter: partial.is_teleporter ?? false,
    is_villager: partial.is_villager ?? false,
  };
}

/**
 * Static descriptions for each role.
 * Used on the NPC detail page Services section.
 * Note: is_renewal_sage has dynamic description based on NPC data, handled separately.
 */
export const ROLE_DESCRIPTIONS: Partial<
  Record<keyof NpcRoles, RoleDescription>
> = {
  is_quest_giver: {
    description: "This NPC offers quests.",
  },
  is_taskgiver_adventurer: {
    description: "This NPC offers daily adventurer quests.",
    details: ["You must reach level 40."],
  },
  is_merchant: {
    description: "This NPC sells items.",
  },
  is_merchant_adventurer: {
    description: "This NPC sells adventurer items and rewards.",
  },
  is_faction_vendor: {
    description: "This NPC sells items exclusive to its faction.",
    details: ["You need at least 15,000 reputation with this faction."],
  },
  is_essence_trader: {
    description:
      'Trade Magic-quality or better equipment for <a href="/items/primal_essence" class="text-blue-600 dark:text-blue-400 hover:underline">Primal Essence</a>.',
    details: ["Bring Magic-quality or better equipment in your inventory."],
  },
  // Source: server-scripts/UIBank.cs:294-307 — tab costs use the number of tabs already unlocked.
  is_bank: {
    description: "This NPC gives you access to your bank.",
    details: [
      "Each tab has 30 slots. You can unlock up to 10 tabs.",
      "Tabs cost 200, 1,000, 2,000, 5,000, 10,000, 15,000, 20,000, 50,000, then 100,000 gold.",
    ],
  },
  can_repair_equipment: {
    description: "This NPC repairs damaged equipment for gold.",
  },
  is_skill_master: {
    description: "This NPC resets your class skill points.",
    details: [
      "The reset costs 100 gold at levels 1–9, 250 at 10–19, 500 at 20–29, 1,000 at 30–39, or 3,000 at 40+.",
    ],
  },
  is_veteran_master: {
    description: "This NPC resets your veteran skill points.",
    details: [
      'The reset costs 10,000 gold and a <a href="/items/token_of_redemption" class="text-blue-600 dark:text-blue-400 hover:underline">Token of Redemption</a>.',
    ],
  },
  is_reset_attributes: {
    description: "This NPC resets your attribute points.",
    details: [
      "The reset costs 100 gold at levels 1–9, 250 at 10–19, 500 at 20–29, 1,000 at 30–39, or 3,000 at 40+.",
    ],
  },
  is_soul_binder: {
    description: "This NPC sets your respawn point to the current area.",
  },
  // Source: server-scripts/Npc.cs:1752-1775 — the innkeeper offers a drink for 25 gold.
  is_inkeeper: {
    description: "This NPC sells food and drinks.",
    details: ["An innkeeper drink costs 25 gold."],
  },
  // Source: server-scripts/Npc.cs:BarberPrice — BarberPrice is 100 gold.
  is_barber: {
    description: "This NPC changes your character's appearance.",
    details: ["The change costs 100 gold."],
  },
  // Source: server-scripts/Npc.cs:InteractNpc — the mercenary recruiter opens at level 10.
  // Source: server-scripts/UIMercenaries.cs:297-299,359-372,732-734 — active mercenary limits follow level thresholds 20, 30, and 40.
  // Source: server-scripts/UIMercenaries.cs:43,380 — the roster holds ten mercenaries.
  is_recruiter_mercenaries: {
    description: "You can hire and manage up to 10 mercenaries here.",
    details: [
      "You must reach level 10 to hire mercenaries.",
      "You can have 1 active mercenary at levels 10–19, 2 at 20–29, 3 at 30–39, and 4 at 40+.",
    ],
  },
  // Source: server-scripts/Npc.cs:1861-1875
  is_priestess: {
    description:
      'This NPC converts <a href="/items/cursed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Cursed Runes</a> in your inventory into <a href="/items/blessed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Blessed Runes</a> for 75 gold each.',
    details: ["Bring Cursed Runes in your inventory."],
  },
  // Source: server-scripts/UINpcTrading.cs:214-219,279-284 — quality 2 (magic) = 10,000g, quality 3 (epic) = 15,000g, else 5,000g
  is_augmenter: {
    description: "This NPC removes augments from equipment.",
    details: [
      "Removal costs 5,000 gold for other augment qualities, 10,000 for Magic, or 15,000 for Epic.",
      "You get the removed augment back in your inventory.",
      "Bring augmented equipment in your inventory or wear it.",
    ],
  },
  is_guild_management: {
    description: "This NPC creates guilds and manages memberships.",
    details: ["A new guild costs 10,000 gold.", "A guild can have 10 members."],
  },
  is_guard: {
    description: "This guard protects the area and can attack hostile players.",
  },
  // is_renewal_sage: handled dynamically in NPC detail page
  // is_teleporter: handled dynamically in NPC detail page (destination varies)
  // is_villager: no description needed (not shown in Services section)
};

export interface RoleRules {
  /** Compendium section that explains the rules behind this service */
  href: string;
  label: string;
}

/**
 * Where the compendium explains each service an NPC offers. The NPC detail
 * page links these from its Services section.
 */
export const ROLE_RULES: Partial<Record<keyof NpcRoles, RoleRules>> = {
  is_quest_giver: { href: "/quests#how-quests-work", label: "How quests work" },
  is_taskgiver_adventurer: {
    href: "/professions/adventuring#how-it-works",
    label: "How assignments work",
  },
  is_merchant: {
    href: "/mechanics/inventory#merchants",
    label: "Buying, selling, and buyback",
  },
  is_merchant_adventurer: {
    href: "/professions/adventuring#adventurer-vendor-unlocks",
    label: "Adventurer vendor rewards",
  },
  is_faction_vendor: {
    href: "/mechanics/reputation#unlocks",
    label: "What reputation unlocks",
  },
  is_bank: {
    href: "/mechanics/inventory#bank",
    label: "Bank storage and tab costs",
  },
  can_repair_equipment: {
    href: "/mechanics/inventory#durability-and-repair",
    label: "Durability and repair",
  },
  is_skill_master: {
    href: "/mechanics/character#skills-and-specializations",
    label: "Skills and specializations",
  },
  is_veteran_master: {
    href: "/mechanics/character#skills-and-specializations",
    label: "Skills and specializations",
  },
  is_reset_attributes: {
    href: "/mechanics/character#attributes",
    label: "What each attribute does",
  },
  is_soul_binder: {
    href: "/mechanics/world#binding-and-travel",
    label: "Binding and travel",
  },
  is_barber: {
    href: "/mechanics/housing#appearance",
    label: "Barbers and appearance",
  },
  is_inkeeper: {
    href: "/mechanics/inventory#consumables",
    label: "Food, drink, and buffs",
  },
  is_recruiter_mercenaries: {
    href: "/mercenaries#roster",
    label: "Hiring and managing mercenaries",
  },
  is_guild_management: {
    href: "/mechanics/guilds#membership",
    label: "Guild membership",
  },
  is_augmenter: {
    href: "/mechanics/crafting#augments",
    label: "Attaching and removing augments",
  },
  is_renewal_sage: {
    href: "/mechanics/monster-spawns#renewal-sages",
    label: "Renewing dungeon monsters",
  },
  is_teleporter: {
    href: "/mechanics/world#binding-and-travel",
    label: "Binding and travel",
  },
};
