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

import { QUALITY_NAMES } from "$lib/constants/quality";

// =============================================================================
// Items
//
// Title pattern: `{Name} ({Type-suffix}) - Ancient Kingdoms`
// Description pattern is per-branch (one per item_type, with sub-branches for
// flag- and field-driven distinctions). Every gameplay claim cites its source
// in the game scripts to keep the wiki honest about what these items actually
// do, not what marketing names suggest.
// =============================================================================

import type { Item } from "$lib/queries/items";
import type { ItemUsages } from "$lib/types/item-sources";
import { formatResourceName } from "$lib/terminology";

/** Optional pre-loaded data the description may incorporate. */
export interface ItemMetaContext {
  /** Aggregated usages from getItemUsages(). Used for general-item routing. */
  usages?: ItemUsages;
  /** Pack contents pre-joined with item names. */
  packContents?: Array<{ item_name: string; amount: number }>;
  /** Random-container outcomes pre-joined with item names. */
  randomOutcomes?: Array<{ item_name: string }>;
  /** Chest-key targets, computed once from the chests table. */
  chestKeyOpens?: { chestCount: number; zoneCount: number };
  /** Merge result item name (lookup from item_sources_merge). */
  mergeResultName?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quality(item: Pick<Item, "quality">): string {
  return QUALITY_NAMES[item.quality] ?? "Common";
}

/**
 * Convert a weapon_category enum value (e.g. "WeaponSword2H") to the noun
 * that goes inside the title parenthetical and into the description body.
 * The DB enum is the asset prefix the game scripts use, not display copy.
 */
function humanizeWeaponCategory(cat: string): string {
  switch (cat) {
    case "WeaponSword":
      return "sword";
    case "WeaponSword2H":
      return "two-handed sword";
    case "WeaponDagger":
      return "dagger";
    case "WeaponWand":
      return "wand";
    case "Bow":
      return "bow";
    case "Shield":
      return "shield";
    case "Pickaxe":
      return "pickaxe";
    case "Shovel":
      return "shovel";
    default:
      return cat.toLowerCase();
  }
}

/** Title-case form of the weapon category for the title parenthetical. */
function titleCaseWeaponCategory(cat: string): string {
  const word = humanizeWeaponCategory(cat);
  return word.replace(/\b\w/g, (c) => c.toUpperCase());
}

const ARMOR_SLOTS = new Set([
  "Chest",
  "Legs",
  "Head",
  "Feet",
  "Hands",
  "Bracers",
  "Belt",
  "Shield",
]);
const JEWELRY_SLOTS = new Set(["Ring", "Neck", "Ear", "Charm", "Artifact"]);

/** Lower-cased noun form of an equipment slot for description bodies. */
function slotNoun(slot: string): string {
  if (slot === "Neck") return "necklace";
  if (slot === "Ear") return "earring";
  if (slot === "Charm") return "charm";
  if (slot === "Artifact") return "artifact";
  if (slot === "Ring") return "ring";
  if (slot === "Shield") return "shield";
  return slot.toLowerCase();
}

/**
 * Capitalize-and-join class-required JSON. The DB stores lowercase class ids
 * (e.g. ["warrior", "rogue"]); the game's UI displays them title-cased and
 * pluralised.
 */
function classListPhrase(classRequiredJson: string | null | undefined): string {
  if (!classRequiredJson) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(classRequiredJson);
  } catch {
    return "";
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return "";
  const names = (parsed as unknown[])
    .filter((x): x is string => typeof x === "string")
    .filter((c) => c !== "all")
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1) + "s");
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function levelGate(level: number): string {
  return level > 0 ? ` Requires level ${level}.` : "";
}

/** Returns " for {classListPhrase}" or empty string. */
function classRestrictionPhrase(
  classRequiredJson: string | null | undefined,
): string {
  const classes = classListPhrase(classRequiredJson);
  return classes ? ` for ${classes}` : "";
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

/**
 * Compute the page <title> for an item detail page.
 * Format: `{name} ({type-suffix}) - Ancient Kingdoms`
 */
export function itemTitle(item: Item): string {
  return `${item.name} (${itemTypeSuffix(item)}) - Ancient Kingdoms`;
}

/** The parenthetical that immediately follows the name in the page title. */
export function itemTypeSuffix(item: Item): string {
  const q = quality(item);
  switch (item.item_type) {
    case "weapon": {
      const cat = item.weapon_category
        ? titleCaseWeaponCategory(item.weapon_category)
        : "Weapon";
      return `${q} ${cat}`;
    }
    case "equipment": {
      const slot = item.slot ?? "Equipment";
      return `${q} ${slot}`;
    }
    case "ammo":
      return "Ammunition";
    case "potion":
      return "Potion";
    case "food":
      return item.food_type === "Drink" ? "Drink" : "Food";
    case "scroll":
      return item.is_repair_kit ? "Repair Scroll" : "Cast Scroll";
    case "relic":
      // Source: server-scripts/RelicItem.cs:12,17-20 \u2014 isOrnamentationToken splits the type
      return item.relic_buff_id === null ? "Ornamentation Token" : `${q} Relic`;
    case "book":
      return "Tome";
    case "mount":
      return "Mount";
    case "backpack":
      return "Bag";
    case "pack":
      return "Pack";
    case "travel":
      return "Travel Scroll";
    case "treasure_map":
      return "Treasure Map";
    case "chest":
      return "Loot Container";
    case "random":
      return "Mystery Container";
    case "augment":
      return `${q} Augment`;
    case "fragment":
      return "Fragment";
    case "recipe":
      return "Recipe";
    case "merge":
      return "Combine Token";
    case "structure":
      return "Furniture";
    case "general":
      if (item.is_chest_key) return "Chest Key";
      if (item.is_key) return "Key";
      if (item.is_quest_item) return "Quest Item";
      return `${q} Item`;
    default:
      return formatItemType(item.item_type);
  }
}

// ---------------------------------------------------------------------------
// Description \u2014 21+ branches, one per item_type with sub-branches
// ---------------------------------------------------------------------------

export function itemDescription(item: Item, ctx: ItemMetaContext = {}): string {
  switch (item.item_type) {
    case "weapon":
      return weaponDescription(item);
    case "equipment":
      return equipmentDescription(item);
    case "ammo":
      return ammoDescription(item);
    case "potion":
      return potionDescription(item);
    case "food":
      return foodDescription(item);
    case "scroll":
      return scrollDescription(item);
    case "relic":
      return relicDescription(item);
    case "book":
      return bookDescription(item);
    case "mount":
      return mountDescription(item);
    case "backpack":
      return backpackDescription(item);
    case "pack":
      return packDescription(item, ctx);
    case "travel":
      return travelDescription(item);
    case "treasure_map":
      return treasureMapDescription(item);
    case "chest":
      return chestContainerDescription(item);
    case "random":
      return randomDescription(item, ctx);
    case "augment":
      return augmentDescription(item);
    case "fragment":
      return fragmentDescription(item);
    case "recipe":
      return recipeItemDescription(item);
    case "merge":
      return mergeDescription(item, ctx);
    case "structure":
      return structureDescription(item);
    case "general":
      return generalDescription(item, ctx);
    default:
      return `${item.name} \u2014 ${quality(item)} ${formatItemType(item.item_type)}.`;
  }
}

// --- branches ---

function weaponDescription(item: Item): string {
  const q = quality(item);
  const cat = item.weapon_category
    ? humanizeWeaponCategory(item.weapon_category)
    : "weapon";
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  // Source: server-scripts/WeaponItem.cs \u2014 weapon_proc_effect_id triggers on hit
  const proc = item.weapon_proc_effect_name
    ? ` Procs ${item.weapon_proc_effect_name} on hit.`
    : "";
  return `${item.name} \u2014 ${q} ${cat}${classes}.${level}${proc}`;
}

function equipmentDescription(item: Item): string {
  const q = quality(item);
  const slot = item.slot ?? "";
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  if (ARMOR_SLOTS.has(slot)) {
    const noun = slot === "Shield" ? "shield" : `${slotNoun(slot)} armor`;
    return `${item.name} \u2014 ${q} ${noun}${classes}.${level}`;
  }
  if (JEWELRY_SLOTS.has(slot)) {
    return `${item.name} \u2014 ${q} ${slotNoun(slot)}${classes}.${level}`;
  }
  return `${item.name} \u2014 ${q} ${slot || "equipment"}${classes}.${level}`;
}

function ammoDescription(item: Item): string {
  const q = quality(item);
  const level = levelGate(item.level_required);
  return `${item.name} \u2014 ${q} ammunition for ranged weapons.${level}`;
}

function potionDescription(item: Item): string {
  // Source: server-scripts/PotionItem.cs \u2014 usage_health/mana/energy/pet_health/experience
  // and an optional buff are applied on use.
  const restored: string[] = [];
  if (item.usage_health > 0) restored.push(`${item.usage_health} Hit Points`);
  if (item.usage_mana > 0)
    restored.push(`${item.usage_mana} ${formatResourceName("mana")}`);
  if (item.usage_energy > 0)
    restored.push(`${item.usage_energy} ${formatResourceName("energy")}`);
  if (item.usage_pet_health > 0)
    restored.push(`${item.usage_pet_health} pet HP`);
  if (item.usage_experience > 0)
    restored.push(`${item.usage_experience} experience`);
  const restorePhrase =
    restored.length > 0 ? ` Restores ${joinList(restored)}.` : "";
  const buff = item.potion_buff_name
    ? ` Applies ${item.potion_buff_name}.`
    : "";
  // Source: server-scripts/PotionItem.cs \u2014 cooldownCategory "Bandages" marks the bandage subtype
  const isBandage = item.cooldown_category === "Bandages";
  const subtype = isBandage ? "Bandage" : "Potion";
  // Source: server-scripts/PotionItem.cs \u2014 potion_buff_allow_dungeon flags whether buff persists in dungeons
  const dungeon =
    !item.potion_buff_allow_dungeon && item.potion_buff_name
      ? " Dungeon use disabled."
      : "";
  return `${item.name} \u2014 ${subtype}.${restorePhrase}${buff}${dungeon}`;
}

function foodDescription(item: Item): string {
  // Source: server-scripts/FoodItem.cs \u2014 applies buffEffect at fixed buffLevel
  const kind = item.food_type === "Drink" ? "Drink" : "Food";
  const buff = item.food_buff_name ? ` Grants ${item.food_buff_name}.` : "";
  const dungeon =
    !item.food_buff_allow_dungeon && item.food_buff_name
      ? " Buff disabled inside dungeons."
      : "";
  return `${item.name} \u2014 ${kind}.${buff}${dungeon}`;
}

function scrollDescription(item: Item): string {
  // Source: server-scripts/ScrollItem.cs:9,13 \u2014 isRepairKit branches the scroll behaviour
  if (item.is_repair_kit) {
    const tier = quality(item);
    return `${item.name} \u2014 Repairs all equipped ${tier} or lower gear.`;
  }
  // Source: server-scripts/ScrollItem.cs:82,92 \u2014 spell rank scales with player.scrollMasteryLevel
  const skill = item.scroll_skill_name ?? "a spell";
  return `${item.name} \u2014 Casts ${skill}. Spell rank scales with the Scroll Mastery profession.`;
}

function relicDescription(item: Item): string {
  // Source: server-scripts/RelicItem.cs:12,17-20 \u2014 isOrnamentationToken saves armor appearance
  const isOrnament = item.relic_buff_id === null;
  if (isOrnament) {
    return `${item.name} \u2014 Saves an armor piece's appearance to your wardrobe collection.`;
  }
  // Source: server-scripts/RelicItem.cs:31 \u2014 buff applied at buffEffect.maxLevel, not item buff_level
  const q = quality(item);
  const buff = item.relic_buff_name ?? "a buff";
  const dungeon = !item.relic_buff_allow_dungeon
    ? " Cannot be used inside dungeons."
    : "";
  return `${item.name} \u2014 ${q} relic. Triggers ${buff} at full power.${dungeon}`;
}

function bookDescription(item: Item): string {
  // Source: server-scripts/BookItem.cs, server-scripts/Player.cs:9241-9276 \u2014 one-time read,
  // permanent attribute increase, then consumed.
  const gains: string[] = [];
  if (item.book_strength_gain > 0)
    gains.push(`+${item.book_strength_gain} Strength`);
  if (item.book_dexterity_gain > 0)
    gains.push(`+${item.book_dexterity_gain} Dexterity`);
  if (item.book_constitution_gain > 0)
    gains.push(`+${item.book_constitution_gain} Constitution`);
  if (item.book_intelligence_gain > 0)
    gains.push(`+${item.book_intelligence_gain} Intelligence`);
  if (item.book_wisdom_gain > 0) gains.push(`+${item.book_wisdom_gain} Wisdom`);
  if (item.book_charisma_gain > 0)
    gains.push(`+${item.book_charisma_gain} Charisma`);
  const phrase = gains.length > 0 ? ` Grants ${joinList(gains)}.` : "";
  return `${item.name} \u2014 One-time read that permanently increases your attributes.${phrase}`;
}

function mountDescription(item: Item): string {
  // Source: server-scripts/MountItem.cs:8, server-scripts/Player.cs:497-501 \u2014 speedMount
  // is the absolute movement speed when mounted, replacing equipped speed bonuses.
  return `${item.name} \u2014 Mountable creature. Replaces your base movement speed while mounted. Cannot mount in dungeons or while in combat.`;
}

function backpackDescription(item: Item): string {
  // Source: server-scripts/BackpackItem.cs:7, server-scripts/PlayerInventory.cs:29-31
  // \u2014 numSlots is added to the inventory while the bag is in the combined-backpack slot.
  const slots = item.backpack_slots > 0 ? item.backpack_slots : 0;
  const slotPhrase =
    slots > 0
      ? ` Adds ${slots} extra inventory slots while equipped in your Combined Backpack.`
      : "";
  return `${item.name} \u2014 Storage bag.${slotPhrase}`;
}

function packDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/PackItem.cs:6-8,15 \u2014 redeems for finalAmountReceived \u00d7 finalItemReceived
  const contents = ctx.packContents ?? [];
  if (contents.length > 0) {
    const c = contents[0];
    const phrase =
      c.amount > 1 ? `${c.amount} \u00d7 ${c.item_name}` : c.item_name;
    return `${item.name} \u2014 Redeems for ${phrase}.`;
  }
  return `${item.name} \u2014 Container that redeems for a fixed item bundle on use.`;
}

function travelDescription(item: Item): string {
  // Source: server-scripts/TravelItem.cs:25-29 \u2014 nameDestination=="Bind Point" routes to player bind
  if (item.travel_destination_name === "Bind Point") {
    return `${item.name} \u2014 Teleports you to your bind point. Cannot be used inside the Temple of Valaark.`;
  }
  const dest = item.travel_destination_name ?? "a fixed location";
  return `${item.name} \u2014 Teleports you to ${dest}. Cannot be used inside the Temple of Valaark.`;
}

function treasureMapDescription(item: Item): string {
  // Source: server-scripts/RelicItem.cs (treasure-map flow), Player.cs (Treasure Hunter)
  return `${item.name} \u2014 Marks a buried treasure dig site. Brings a Treasure Hunter bonus to the chest it points at.`;
}

function chestContainerDescription(item: Item): string {
  // Source: server-scripts/ChestItem.cs:11,24 \u2014 yields numItemsPerChest from a weighted reward table
  const n = item.chest_num_items > 0 ? item.chest_num_items : 1;
  const itemsWord = n === 1 ? "item" : "items";
  return `${item.name} \u2014 Loot container. Yields ${n} ${itemsWord} from a weighted reward pool.`;
}

function randomDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RandomItem.cs:6 \u2014 yields one of items[] at random
  const n = ctx.randomOutcomes?.length ?? 0;
  if (n > 0) {
    return `${item.name} \u2014 Mystery container. Yields one of ${n} possible items at random.`;
  }
  return `${item.name} \u2014 Mystery container. Yields one item at random from a fixed pool.`;
}

function augmentDescription(item: Item): string {
  // Source: server-scripts/AugmentItem.cs, website/src/routes/items/[id]/+page.svelte:975-1031
  // \u2014 set augments grant set bonuses; socketable augments are consumed at a crafting
  // station and can be removed by Augmenter NPCs (5,000g/10,000g/15,000g per quality).
  const q = quality(item);
  if (item.augment_armor_set_name) {
    return `${item.name} \u2014 ${q} augment in the ${item.augment_armor_set_name} armor set, contributing to its set bonuses.`;
  }
  const target = item.augment_is_defensive ? "armor piece" : "weapon";
  return `${item.name} \u2014 ${q} augment. Permanently socketed into ${target === "armor piece" ? "an armor piece" : "a weapon"} at a crafting station, removable at an Augmenter NPC.`;
}

function fragmentDescription(item: Item): string {
  // Source: build-pipeline schema \u2014 fragment_amount_needed and fragment_result_item_name
  // are populated for items that combine into a higher-tier reward.
  const need =
    item.fragment_amount_needed > 0 ? item.fragment_amount_needed : 0;
  const result = item.fragment_result_item_name;
  if (need > 0 && result) {
    return `${item.name} \u2014 Collect ${need} to combine into ${result}.`;
  }
  if (result) {
    return `${item.name} \u2014 Combines into ${result}.`;
  }
  return `${item.name} \u2014 Fragment that combines into a higher-tier reward.`;
}

function recipeItemDescription(item: Item): string {
  // Source: server-scripts/RecipeItem.cs:11-22 \u2014 teaches potionLearned (any craftable),
  // refused if already known.
  const taught = item.recipe_potion_learned_name;
  if (taught) {
    return `${item.name} \u2014 Teaches the recipe for ${taught}. Refused if you already know it.`;
  }
  return `${item.name} \u2014 Recipe item. Teaches a craftable on first use.`;
}

function mergeDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/uMMORPG.Scripts.ScriptableItems/MergeItem.cs:15-48 \u2014
  // checks inventory for itemsNeeded, consumes them and the merge token, grants resultItem.
  const result = ctx.mergeResultName ?? null;
  if (result) {
    return `${item.name} \u2014 Combines with required components in your inventory to create ${result}.`;
  }
  return `${item.name} \u2014 Combines with required components in your inventory to create a new item.`;
}

function structureDescription(item: Item): string {
  // Source: server-scripts/HousingManager.cs:21-32, server-scripts/Player.cs:4458,10138-10153
  // \u2014 players buy a named house, then place CustomStructureItems inside it.
  const price =
    item.structure_price > 0
      ? `${item.structure_price.toLocaleString()} gold`
      : "a fixed gold cost";
  return `${item.name} \u2014 Furniture. Costs ${price} to place inside a house you own.`;
}

function generalDescription(item: Item, ctx: ItemMetaContext): string {
  if (item.is_chest_key) return chestKeyDescription(item, ctx);
  if (item.is_key) return keyDescription(item);
  if (item.is_quest_item) return questItemDescription(item);
  return generalUsageDescription(item, ctx);
}

function chestKeyDescription(item: Item, ctx: ItemMetaContext): string {
  const opens = ctx.chestKeyOpens;
  if (opens && opens.chestCount > 0) {
    const chestPhrase =
      opens.chestCount === 1 ? "1 chest" : `${opens.chestCount} chests`;
    const zonePhrase =
      opens.zoneCount === 1 ? "1 zone" : `${opens.zoneCount} zones`;
    return `${item.name} \u2014 Chest key. Opens ${chestPhrase} across ${zonePhrase}.`;
  }
  return `${item.name} \u2014 Chest key.`;
}

function keyDescription(item: Item): string {
  return `${item.name} \u2014 Key. Opens a quest door or container.`;
}

function questItemDescription(item: Item): string {
  const flags: string[] = [];
  if (!item.sellable) flags.push("not sellable");
  if (!item.tradable) flags.push("not tradable");
  if (!item.destroyable) flags.push("not destroyable");
  const flagPhrase =
    flags.length > 0 ? ` ${capitalizeFirst(joinList(flags))}.` : "";
  return `${item.name} \u2014 Quest item.${flagPhrase}`;
}

function generalUsageDescription(item: Item, ctx: ItemMetaContext): string {
  const q = quality(item);
  const usages = ctx.usages;
  if (!usages) {
    return `${item.name} \u2014 ${q} item.`;
  }
  const counts: Array<{ category: string; count: number }> = [
    { category: "recipe", count: usages.recipes.length },
    { category: "quest", count: usages.quests.length },
    { category: "exchange", count: usages.currency.length },
    { category: "altar", count: usages.altars.length },
    { category: "portal", count: usages.portals.length },
    { category: "chest", count: usages.chests.length },
    { category: "merge", count: usages.merges.length },
  ].filter((c) => c.count > 0);
  counts.sort((a, b) => b.count - a.count);
  if (counts.length === 0) {
    return `${item.name} \u2014 ${q} item.`;
  }
  const top = counts[0];
  const noun = pluralize(top.category, top.count);
  return `${item.name} \u2014 ${q} item. Used in ${top.count} ${noun}.`;
}

function pluralize(category: string, n: number): string {
  switch (category) {
    case "recipe":
      return n === 1 ? "recipe" : "recipes";
    case "quest":
      return n === 1 ? "quest" : "quests";
    case "exchange":
      return n === 1 ? "vendor exchange" : "vendor exchanges";
    case "altar":
      return n === 1 ? "altar activation" : "altar activations";
    case "portal":
      return n === 1 ? "portal" : "portals";
    case "chest":
      return n === 1 ? "chest unlock" : "chest unlocks";
    case "merge":
      return n === 1 ? "merge" : "merges";
    default:
      return category;
  }
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  type: "Alchemy" | "Cooking" | "Crafting" | "Scribing";
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
