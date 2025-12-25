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
  { key: "is_inkeeper", label: "Innkeeper", category: "service" },
  {
    key: "is_recruiter_mercenaries",
    label: "Mercenary Recruiter",
    category: "service",
  },
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
    description: "Offers quests to players.",
  },
  is_taskgiver_adventurer: {
    description: "Offers daily adventurer quests.",
    details: ["Requires level 40"],
  },
  is_merchant: {
    description: "Sells items to players.",
  },
  is_merchant_adventurer: {
    description: "Sells adventurer-related items and rewards.",
  },
  is_faction_vendor: {
    description: "Sells faction-exclusive items.",
    details: ["Requires 15,000+ faction reputation"],
  },
  is_essence_trader: {
    description:
      'Trades magic+ equipment for <a href="/items/primal_essence" class="text-blue-600 dark:text-blue-400 hover:underline">Primal Essence</a>.',
    details: ["Requires magic or better gear in inventory"],
  },
  is_bank: {
    description: "Provides access to your bank storage.",
    details: [
      "30 slots per tab, up to 10 tabs",
      "Tab costs: 1k → 5k → 10k → 25k → 50k → 75k → 100k → 250k → 500k gold",
    ],
  },
  can_repair_equipment: {
    description: "Repairs damaged equipment for gold.",
  },
  is_skill_master: {
    description: "Resets your class skill points.",
    details: [
      "Cost: 100g (lvl 1-9), 250g (10-19), 500g (20-29), 1k (30-39), 3k (40+)",
    ],
  },
  is_veteran_master: {
    description: "Resets your veteran skill points.",
    details: [
      'Cost: 10,000 gold + <a href="/items/token_of_redemption" class="text-blue-600 dark:text-blue-400 hover:underline">Token of Redemption</a>',
    ],
  },
  is_reset_attributes: {
    description: "Resets your attribute points.",
    details: [
      "Cost: 100g (lvl 1-9), 250g (10-19), 500g (20-29), 1k (30-39), 3k (40+)",
    ],
  },
  is_soul_binder: {
    description: "Binds your respawn point to the current area.",
  },
  is_inkeeper: {
    description: "Sells food and drinks.",
    details: ["Cost: 25 gold"],
  },
  is_recruiter_mercenaries: {
    description: "Hire and manage mercenaries (up to 6 stored).",
    details: [
      "Requires level 10",
      "Active limit: 1 (lvl 10-19), 2 (20-29), 3 (30-49), 4 (50)",
    ],
  },
  is_priestess: {
    description:
      'Converts <a href="/items/cursed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Cursed Runes</a> into <a href="/items/blessed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Blessed Runes</a>.',
    details: ["Cost: 75 gold per rune", "Requires Cursed Runes in inventory"],
  },
  is_augmenter: {
    description: "Removes augments from equipment.",
    details: ["Requires augmented gear in inventory or equipped"],
  },
  is_guard: {
    description: "Protects the area and may attack hostile players.",
  },
  // is_renewal_sage: handled dynamically in NPC detail page
  // is_teleporter: handled dynamically in NPC detail page (destination varies)
  // is_villager: no description needed (not shown in Services section)
};
