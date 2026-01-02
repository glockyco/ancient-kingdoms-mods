/**
 * Meta description generators for SEO.
 * Each function generates a description ≤160 characters for search engines.
 */

import { toRomanNumeral, formatItemType } from "$lib/utils/format";

const MAX_LENGTH = 160;

function truncate(text: string, max = MAX_LENGTH): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3).trim() + "...";
}

const QUALITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

// =============================================================================
// Items
// =============================================================================

interface ItemDescriptionInput {
  name: string;
  quality: number;
  slot: string | null;
  item_type: string;
  level_required: number;
}

export function itemDescription(item: ItemDescriptionInput): string {
  const quality = QUALITY_NAMES[item.quality] ?? "Common";
  const slotOrType = item.slot || formatItemType(item.item_type);
  const level = item.level_required > 0 ? ` Level ${item.level_required}.` : "";
  return truncate(
    `${item.name} - ${quality} ${slotOrType} in Ancient Kingdoms.${level}`,
  );
}

// =============================================================================
// Monsters
// =============================================================================

interface MonsterDescriptionInput {
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_elite: boolean;
  type_name: string | null;
}

interface AltarSpawnInfo {
  altar_name: string;
  zone_name: string;
}

export function monsterDescription(
  monster: MonsterDescriptionInput,
  zoneNames: string[],
  altarSpawn: AltarSpawnInfo | null,
): string {
  const levelRange =
    monster.level_min === monster.level_max
      ? `${monster.level_min}`
      : `${monster.level_min}-${monster.level_max}`;

  let type = monster.type_name ?? "Creature";
  if (monster.is_boss) type = "Boss";
  else if (monster.is_elite) type = "Elite";

  // Altar boss
  if (altarSpawn) {
    return truncate(
      `${monster.name} - Level ${levelRange} ${type} in Ancient Kingdoms. Summoned at ${altarSpawn.altar_name} in ${altarSpawn.zone_name}.`,
    );
  }

  // Regular monster
  const location =
    zoneNames.length === 0
      ? ""
      : zoneNames.length === 1
        ? ` Found in ${zoneNames[0]}.`
        : " Found in multiple zones.";

  return truncate(
    `${monster.name} - Level ${levelRange} ${type} in Ancient Kingdoms.${location}`,
  );
}

// =============================================================================
// NPCs
// =============================================================================

interface NpcRoles {
  is_merchant: boolean;
  is_quest_giver: boolean;
  can_repair_equipment: boolean;
  is_bank: boolean;
  is_skill_master: boolean;
  is_veteran_master: boolean;
  is_reset_attributes: boolean;
  is_soul_binder: boolean;
  is_inkeeper: boolean;
  is_taskgiver_adventurer: boolean;
  is_merchant_adventurer: boolean;
  is_recruiter_mercenaries: boolean;
  is_guard: boolean;
  is_faction_vendor: boolean;
  is_essence_trader: boolean;
  is_priestess: boolean;
  is_augmenter: boolean;
  is_renewal_sage: boolean;
  is_teleporter: boolean;
  is_villager: boolean;
}

interface NpcDescriptionInput {
  name: string;
  roles: NpcRoles;
}

function getNpcRoleNames(roles: NpcRoles): string[] {
  const roleNames: string[] = [];
  if (roles.is_merchant) roleNames.push("Merchant");
  if (roles.is_quest_giver) roleNames.push("Quest Giver");
  if (roles.can_repair_equipment) roleNames.push("Repair");
  if (roles.is_bank) roleNames.push("Banker");
  if (roles.is_skill_master) roleNames.push("Skill Master");
  if (roles.is_veteran_master) roleNames.push("Veteran Master");
  if (roles.is_reset_attributes) roleNames.push("Attribute Reset");
  if (roles.is_soul_binder) roleNames.push("Soul Binder");
  if (roles.is_inkeeper) roleNames.push("Innkeeper");
  if (roles.is_taskgiver_adventurer) roleNames.push("Adventurer Tasks");
  if (roles.is_merchant_adventurer) roleNames.push("Adventurer Merchant");
  if (roles.is_recruiter_mercenaries) roleNames.push("Mercenary Recruiter");
  if (roles.is_guard) roleNames.push("Guard");
  if (roles.is_faction_vendor) roleNames.push("Faction Vendor");
  if (roles.is_essence_trader) roleNames.push("Essence Trader");
  if (roles.is_priestess) roleNames.push("Priestess");
  if (roles.is_augmenter) roleNames.push("Augmenter");
  if (roles.is_renewal_sage) roleNames.push("Renewal Sage");
  if (roles.is_teleporter) roleNames.push("Teleporter");
  if (roles.is_villager) roleNames.push("Villager");
  return roleNames;
}

export function npcDescription(
  npc: NpcDescriptionInput,
  zoneNames: string[],
): string {
  const roleNames = getNpcRoleNames(npc.roles);
  const roles = roleNames.length > 0 ? roleNames.join(" & ") : "NPC";

  const location =
    zoneNames.length === 0 ? "" : ` Located in ${zoneNames.join(", ")}.`;

  return truncate(`${npc.name} - ${roles} in Ancient Kingdoms.${location}`);
}

// =============================================================================
// Zones
// =============================================================================

interface ZoneDescriptionInput {
  name: string;
  is_dungeon: boolean;
  level_min: number | null;
  level_max: number | null;
}

interface ZoneCounts {
  boss_count: number;
  elite_count: number;
  altar_count: number;
  npc_count: number;
}

export function zoneDescription(
  zone: ZoneDescriptionInput,
  counts: ZoneCounts,
): string {
  const type = zone.is_dungeon ? "Dungeon" : "Overworld";
  const levelRange =
    zone.level_min && zone.level_max
      ? `Level ${zone.level_min}-${zone.level_max} `
      : "";

  const stats = [
    `${counts.boss_count} bosses`,
    `${counts.elite_count} elites`,
    `${counts.altar_count} altars`,
    `${counts.npc_count} NPCs`,
  ].join(", ");

  return truncate(
    `${zone.name} - ${levelRange}${type} in Ancient Kingdoms. ${stats}.`,
  );
}

// =============================================================================
// Quests
// =============================================================================

interface QuestObjective {
  type:
    | "kill"
    | "gather"
    | "have"
    | "equip"
    | "deliver"
    | "discover"
    | "brew"
    | "find"
    | "other";
  name: string;
  amount: number;
}

interface QuestDescriptionInput {
  name: string;
  level_required: number;
}

export function questDescription(
  quest: QuestDescriptionInput,
  objectives: QuestObjective[],
): string {
  const objectiveStrings = objectives.map((obj) => {
    const verb =
      obj.type === "kill"
        ? "Kill"
        : obj.type === "gather"
          ? "Gather"
          : obj.type === "have"
            ? "Have"
            : obj.type === "equip"
              ? "Equip"
              : obj.type === "deliver"
                ? "Deliver"
                : obj.type === "discover"
                  ? "Discover"
                  : obj.type === "brew"
                    ? "Brew"
                    : obj.type === "find"
                      ? "Find"
                      : "";
    if (obj.amount > 1) {
      return `${verb} ${obj.amount} ${obj.name}`;
    }
    return `${verb} ${obj.name}`;
  });

  const objectivesText = objectiveStrings.join(", ");
  return truncate(
    `${quest.name} - Level ${quest.level_required} quest in Ancient Kingdoms. ${objectivesText}.`,
  );
}

// =============================================================================
// Recipes
// =============================================================================

interface RecipeIngredient {
  item_name: string;
  amount: number;
}

interface RecipeDescriptionInput {
  result_item_name: string;
  type: "Alchemy" | "Cooking" | "Crafting";
}

export function recipeDescription(
  recipe: RecipeDescriptionInput,
  ingredients: RecipeIngredient[],
): string {
  const ingredientStrings = ingredients.map((ing) =>
    ing.amount > 1 ? `${ing.amount} ${ing.item_name}` : ing.item_name,
  );

  return truncate(
    `${recipe.result_item_name} - ${recipe.type} recipe in Ancient Kingdoms. Requires ${ingredientStrings.join(", ")}.`,
  );
}

// =============================================================================
// Chests
// =============================================================================

interface ChestDescriptionInput {
  zone_name: string;
  key_required_name: string | null;
}

export function chestDescription(chest: ChestDescriptionInput): string {
  const keyInfo = chest.key_required_name
    ? `Requires ${chest.key_required_name}.`
    : "No key required.";

  return truncate(
    `Chest - Treasure chest in Ancient Kingdoms. Located in ${chest.zone_name}. ${keyInfo}`,
  );
}

// =============================================================================
// Gathering Resources
// =============================================================================

interface GatheringResourceDescriptionInput {
  name: string;
  is_plant: boolean;
  is_mineral: boolean;
  is_radiant_spark: boolean;
  level: number | null;
}

export function gatheringResourceDescription(
  resource: GatheringResourceDescriptionInput,
  zoneNames: string[],
): string {
  // Determine type
  let type: string;
  if (resource.is_plant) type = "Plant";
  else if (resource.is_mineral) type = "Mineral";
  else type = "Gatherable"; // Radiant sparks and other

  // Determine tier (only for plants and minerals)
  const hasTier =
    (resource.is_plant || resource.is_mineral) && resource.level != null;
  const tierText = hasTier ? `Tier ${toRomanNumeral(resource.level!)} ` : "";

  const location =
    zoneNames.length === 0
      ? ""
      : zoneNames.length === 1
        ? ` Found in ${zoneNames[0]}.`
        : " Found in multiple zones.";

  return truncate(
    `${resource.name} - ${tierText}${type} in Ancient Kingdoms.${location}`,
  );
}
