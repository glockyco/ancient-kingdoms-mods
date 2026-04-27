/**
 * Meta description and title generators for SEO.
 *
 * Each generator builds a search-engine-friendly description from the same
 * normalized DB shape that powers the page UI. Strings are full-length: Google
 * indexes the entire description and only the SERP display is truncated, so
 * cutting at 160 chars would lose ranking signal for no benefit.
 */

import {
  toRomanNumeral,
  formatItemType,
  formatDuration,
} from "$lib/utils/format";

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
      // Source: server-scripts/RelicItem.cs:12,17-20 — isOrnamentationToken splits the type
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
// Description — 21+ branches, one per item_type with sub-branches
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
      return `${item.name} — ${quality(item)} ${formatItemType(item.item_type)}.`;
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
  // Source: server-scripts/WeaponItem.cs — weapon_proc_effect_id triggers on hit
  const proc = item.weapon_proc_effect_name
    ? ` Procs ${item.weapon_proc_effect_name} on hit.`
    : "";
  return `${item.name} — ${q} ${cat}${classes}.${level}${proc}`;
}

function equipmentDescription(item: Item): string {
  const q = quality(item);
  const slot = item.slot ?? "";
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  if (ARMOR_SLOTS.has(slot)) {
    const noun = slot === "Shield" ? "shield" : `${slotNoun(slot)} armor`;
    return `${item.name} — ${q} ${noun}${classes}.${level}`;
  }
  if (JEWELRY_SLOTS.has(slot)) {
    return `${item.name} — ${q} ${slotNoun(slot)}${classes}.${level}`;
  }
  return `${item.name} — ${q} ${slot || "equipment"}${classes}.${level}`;
}

function ammoDescription(item: Item): string {
  const q = quality(item);
  const level = levelGate(item.level_required);
  return `${item.name} — ${q} ammunition for ranged weapons.${level}`;
}

function potionDescription(item: Item): string {
  // Source: server-scripts/PotionItem.cs — usage_health/mana/energy/pet_health/experience
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
  // Source: server-scripts/PotionItem.cs — cooldownCategory "Bandages" marks the bandage subtype
  const isBandage = item.cooldown_category === "Bandages";
  const subtype = isBandage ? "Bandage" : "Potion";
  // Source: server-scripts/PotionItem.cs — potion_buff_allow_dungeon flags whether buff persists in dungeons
  const dungeon =
    !item.potion_buff_allow_dungeon && item.potion_buff_name
      ? " Dungeon use disabled."
      : "";
  return `${item.name} — ${subtype}.${restorePhrase}${buff}${dungeon}`;
}

function foodDescription(item: Item): string {
  // Source: server-scripts/FoodItem.cs — applies buffEffect at fixed buffLevel
  const kind = item.food_type === "Drink" ? "Drink" : "Food";
  const buff = item.food_buff_name ? ` Grants ${item.food_buff_name}.` : "";
  const dungeon =
    !item.food_buff_allow_dungeon && item.food_buff_name
      ? " Buff disabled inside dungeons."
      : "";
  return `${item.name} — ${kind}.${buff}${dungeon}`;
}

function scrollDescription(item: Item): string {
  // Source: server-scripts/ScrollItem.cs:9,13 — isRepairKit branches the scroll behaviour
  if (item.is_repair_kit) {
    const tier = quality(item);
    return `${item.name} — Repairs all equipped ${tier} or lower gear.`;
  }
  // Source: server-scripts/ScrollItem.cs:82,92 — spell rank scales with player.scrollMasteryLevel
  const skill = item.scroll_skill_name ?? "a spell";
  return `${item.name} — Casts ${skill}. Spell rank scales with the Scroll Mastery profession.`;
}

function relicDescription(item: Item): string {
  // Source: server-scripts/RelicItem.cs:12,17-20 — isOrnamentationToken saves armor appearance
  const isOrnament = item.relic_buff_id === null;
  if (isOrnament) {
    return `${item.name} — Saves an armor piece's appearance to your wardrobe collection.`;
  }
  // Source: server-scripts/RelicItem.cs:31 — buff applied at buffEffect.maxLevel, not item buff_level
  const q = quality(item);
  const buff = item.relic_buff_name ?? "a buff";
  const dungeon = !item.relic_buff_allow_dungeon
    ? " Cannot be used inside dungeons."
    : "";
  return `${item.name} — ${q} relic. Triggers ${buff} at full power.${dungeon}`;
}

function bookDescription(item: Item): string {
  // Source: server-scripts/BookItem.cs, server-scripts/Player.cs:9241-9276 — one-time read,
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
  return `${item.name} — One-time read that permanently increases your attributes.${phrase}`;
}

function mountDescription(item: Item): string {
  // Source: server-scripts/MountItem.cs:8, server-scripts/Player.cs:497-501 — speedMount
  // is the absolute movement speed when mounted, replacing equipped speed bonuses.
  return `${item.name} — Mountable creature. Replaces your base movement speed while mounted. Cannot mount in dungeons or while in combat.`;
}

function backpackDescription(item: Item): string {
  // Source: server-scripts/BackpackItem.cs:7, server-scripts/PlayerInventory.cs:29-31
  // — numSlots is added to the inventory while the bag is in the combined-backpack slot.
  const slots = item.backpack_slots > 0 ? item.backpack_slots : 0;
  const slotPhrase =
    slots > 0
      ? ` Adds ${slots} extra inventory slots while equipped in your Combined Backpack.`
      : "";
  return `${item.name} — Storage bag.${slotPhrase}`;
}

function packDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/PackItem.cs:6-8,15 — redeems for finalAmountReceived × finalItemReceived
  const contents = ctx.packContents ?? [];
  if (contents.length > 0) {
    const c = contents[0];
    const phrase = c.amount > 1 ? `${c.amount} × ${c.item_name}` : c.item_name;
    return `${item.name} — Redeems for ${phrase}.`;
  }
  return `${item.name} — Container that redeems for a fixed item bundle on use.`;
}

function travelDescription(item: Item): string {
  // Source: server-scripts/TravelItem.cs:25-29 — nameDestination=="Bind Point" routes to player bind
  if (item.travel_destination_name === "Bind Point") {
    return `${item.name} — Teleports you to your bind point. Cannot be used inside the Temple of Valaark.`;
  }
  const dest = item.travel_destination_name ?? "a fixed location";
  return `${item.name} — Teleports you to ${dest}. Cannot be used inside the Temple of Valaark.`;
}

function treasureMapDescription(item: Item): string {
  // Source: server-scripts/RelicItem.cs (treasure-map flow), Player.cs (Treasure Hunter)
  return `${item.name} — Marks a buried treasure dig site. Brings a Treasure Hunter bonus to the chest it points at.`;
}

function chestContainerDescription(item: Item): string {
  // Source: server-scripts/ChestItem.cs:11,24 — yields numItemsPerChest from a weighted reward table
  const n = item.chest_num_items > 0 ? item.chest_num_items : 1;
  const itemsWord = n === 1 ? "item" : "items";
  return `${item.name} — Loot container. Yields ${n} ${itemsWord} from a weighted reward pool.`;
}

function randomDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RandomItem.cs:6 — yields one of items[] at random
  const n = ctx.randomOutcomes?.length ?? 0;
  if (n > 0) {
    return `${item.name} — Mystery container. Yields one of ${n} possible items at random.`;
  }
  return `${item.name} — Mystery container. Yields one item at random from a fixed pool.`;
}

function augmentDescription(item: Item): string {
  // Source: server-scripts/AugmentItem.cs, website/src/routes/items/[id]/+page.svelte:975-1031
  // — set augments grant set bonuses; socketable augments are consumed at a crafting
  // station and can be removed by Augmenter NPCs (5,000g/10,000g/15,000g per quality).
  const q = quality(item);
  if (item.augment_armor_set_name) {
    return `${item.name} — ${q} augment in the ${item.augment_armor_set_name} armor set, contributing to its set bonuses.`;
  }
  const target = item.augment_is_defensive ? "armor piece" : "weapon";
  return `${item.name} — ${q} augment. Permanently socketed into ${target === "armor piece" ? "an armor piece" : "a weapon"} at a crafting station, removable at an Augmenter NPC.`;
}

function fragmentDescription(item: Item): string {
  // Source: build-pipeline schema — fragment_amount_needed and fragment_result_item_name
  // are populated for items that combine into a higher-tier reward.
  const need =
    item.fragment_amount_needed > 0 ? item.fragment_amount_needed : 0;
  const result = item.fragment_result_item_name;
  if (need > 0 && result) {
    return `${item.name} — Collect ${need} to combine into ${result}.`;
  }
  if (result) {
    return `${item.name} — Combines into ${result}.`;
  }
  return `${item.name} — Fragment that combines into a higher-tier reward.`;
}

function recipeItemDescription(item: Item): string {
  // Source: server-scripts/RecipeItem.cs:11-22 — teaches potionLearned (any craftable),
  // refused if already known.
  const taught = item.recipe_potion_learned_name;
  if (taught) {
    return `${item.name} — Teaches the recipe for ${taught}. Refused if you already know it.`;
  }
  return `${item.name} — Recipe item. Teaches a craftable on first use.`;
}

function mergeDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/uMMORPG.Scripts.ScriptableItems/MergeItem.cs:15-48 —
  // checks inventory for itemsNeeded, consumes them and the merge token, grants resultItem.
  const result = ctx.mergeResultName ?? null;
  if (result) {
    return `${item.name} — Combines with required components in your inventory to create ${result}.`;
  }
  return `${item.name} — Combines with required components in your inventory to create a new item.`;
}

function structureDescription(item: Item): string {
  // Source: server-scripts/HousingManager.cs:21-32, server-scripts/Player.cs:4458,10138-10153
  // — players buy a named house, then place CustomStructureItems inside it.
  const price =
    item.structure_price > 0
      ? `${item.structure_price.toLocaleString()} gold`
      : "a fixed gold cost";
  return `${item.name} — Furniture. Costs ${price} to place inside a house you own.`;
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
    return `${item.name} — Chest key. Opens ${chestPhrase} across ${zonePhrase}.`;
  }
  return `${item.name} — Chest key.`;
}

function keyDescription(item: Item): string {
  return `${item.name} — Key. Opens a quest door or container.`;
}

function questItemDescription(item: Item): string {
  const flags: string[] = [];
  if (!item.sellable) flags.push("not sellable");
  if (!item.tradable) flags.push("not tradable");
  if (!item.destroyable) flags.push("not destroyable");
  const flagPhrase =
    flags.length > 0 ? ` ${capitalizeFirst(joinList(flags))}.` : "";
  return `${item.name} — Quest item.${flagPhrase}`;
}

function generalUsageDescription(item: Item, ctx: ItemMetaContext): string {
  const q = quality(item);
  const usages = ctx.usages;
  if (!usages) {
    return `${item.name} — ${q} item.`;
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
    return `${item.name} — ${q} item.`;
  }
  const top = counts[0];
  const noun = pluralize(top.category, top.count);
  return `${item.name} — ${q} item. Used in ${top.count} ${noun}.`;
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
  type_name: string | null;
  is_boss: boolean;
  is_elite: boolean;
  is_fabled: boolean;
  is_hunt: boolean;
  is_summonable: boolean;
  level_min: number;
  level_max: number;
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
  // Source: build-pipeline schema — classification flags layer fabled > boss > elite > hunt
  let classification = "";
  if (monster.is_fabled) classification = " Fabled Boss";
  else if (monster.is_boss) classification = " Boss";
  else if (monster.is_elite) classification = " Elite";
  else if (monster.is_hunt) classification = " Hunt target";

  const species = monster.type_name ?? "Creature";
  const range =
    monster.level_min === monster.level_max
      ? `${monster.level_min}`
      : `${monster.level_min}-${monster.level_max}`;

  // Origin precedence: altar > summonable-only > zone list. Bestiary entries
  // that come from altar waves or scripted encounters never appear on a map.
  let origin = "";
  if (altarSpawn) {
    origin = ` Summoned at ${altarSpawn.altar_name} in ${altarSpawn.zone_name}.`;
  } else if (monster.is_summonable) {
    origin = " Spawned by altar waves or scripted encounters only.";
  } else if (zoneNames.length === 1) {
    origin = ` Found in ${zoneNames[0]}.`;
  } else if (zoneNames.length === 2 || zoneNames.length === 3) {
    origin = ` Found in ${joinList(zoneNames)}.`;
  } else if (zoneNames.length > 3) {
    origin = ` Found in ${zoneNames[0]} and ${zoneNames.length - 1} other zones.`;
  }

  return `${monster.name} — Level ${range} ${species}${classification}.${origin}`;
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
  faction: string | null;
  roles: NpcRoles;
  /** Number of quests offered by this NPC, used in the description tail. */
  questCount?: number;
}

/**
 * Role priority order: most player-facing role first. Quest-giver outranks
 * merchant because that's what users search for; faction vendors outrank plain
 * merchants because the faction context is more specific.
 */
const NPC_ROLE_PRIORITY: Array<{ flag: keyof NpcRoles; label: string }> = [
  { flag: "is_quest_giver", label: "quest giver" },
  { flag: "is_skill_master", label: "skill master" },
  { flag: "is_recruiter_mercenaries", label: "mercenary recruiter" },
  { flag: "is_faction_vendor", label: "faction vendor" },
  { flag: "is_merchant", label: "merchant" },
  { flag: "is_essence_trader", label: "essence trader" },
  { flag: "is_priestess", label: "priestess" },
  { flag: "is_augmenter", label: "augmenter" },
  { flag: "is_renewal_sage", label: "renewal sage" },
  { flag: "is_teleporter", label: "teleporter" },
  { flag: "is_bank", label: "banker" },
  { flag: "is_inkeeper", label: "innkeeper" },
  { flag: "is_soul_binder", label: "soul binder" },
  { flag: "is_veteran_master", label: "veteran master" },
  { flag: "is_reset_attributes", label: "attribute reset trainer" },
  { flag: "is_taskgiver_adventurer", label: "adventurer task giver" },
  { flag: "is_merchant_adventurer", label: "adventurer merchant" },
  { flag: "can_repair_equipment", label: "repair NPC" },
  { flag: "is_guard", label: "guard" },
  { flag: "is_villager", label: "villager" },
];

function pickPrimaryRole(roles: NpcRoles): {
  label: string;
  otherCount: number;
} {
  let primary: string | null = null;
  let total = 0;
  for (const { flag, label } of NPC_ROLE_PRIORITY) {
    if (roles[flag]) {
      total += 1;
      if (!primary) primary = label;
    }
  }
  return {
    label: primary ?? "NPC",
    otherCount: total > 0 ? total - 1 : 0,
  };
}

export function npcDescription(
  npc: NpcDescriptionInput,
  zoneNames: string[],
): string {
  const { label: primaryRole, otherCount } = pickPrimaryRole(npc.roles);
  const primary = capitalizeFirst(primaryRole);

  let location = "";
  if (zoneNames.length === 1) {
    location = ` in ${zoneNames[0]}`;
  } else if (zoneNames.length === 2 || zoneNames.length === 3) {
    location = ` in ${joinList(zoneNames)}`;
  } else if (zoneNames.length > 3) {
    location = ` across ${zoneNames.length} zones`;
  }

  const factionPhrase = npc.faction
    ? ` Allied with the ${npc.faction} faction.`
    : "";

  const tail: string[] = [];
  if (npc.questCount && npc.questCount > 0) {
    tail.push(
      npc.questCount === 1
        ? "Offers 1 quest."
        : `Offers ${npc.questCount} quests.`,
    );
  }
  if (otherCount > 0) {
    tail.push(
      otherCount === 1
        ? "Also fills 1 other role."
        : `Also fills ${otherCount} other roles.`,
    );
  }
  const tailPhrase = tail.length > 0 ? ` ${tail.join(" ")}` : "";

  return `${npc.name} — ${primary}${location}.${factionPhrase}${tailPhrase}`;
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
  chest_count: number;
  gather_count: number;
}

export function zoneDescription(
  zone: ZoneDescriptionInput,
  counts: ZoneCounts,
): string {
  const typeLabel = zone.is_dungeon ? "Dungeon" : "Overworld zone";

  // Source: schema — zones expose level_min/level_max derived from monsters.
  // No row in the current DB sets required_level > 0, so we omit any gating phrase.
  let levelPhrase = "";
  if (zone.level_min && zone.level_max) {
    levelPhrase =
      zone.level_min === zone.level_max
        ? `level ${zone.level_min}`
        : `levels ${zone.level_min}-${zone.level_max}`;
  }

  const head = levelPhrase
    ? `${zone.name} — ${typeLabel}, ${levelPhrase}.`
    : `${zone.name} — ${typeLabel}.`;

  const contentParts: string[] = [];
  if (counts.boss_count > 0)
    contentParts.push(plural(counts.boss_count, "boss", "bosses"));
  if (counts.elite_count > 0)
    contentParts.push(plural(counts.elite_count, "elite", "elites"));
  if (counts.npc_count > 0)
    contentParts.push(plural(counts.npc_count, "NPC", "NPCs"));
  if (counts.gather_count > 0)
    contentParts.push(
      plural(counts.gather_count, "gathering node", "gathering nodes"),
    );
  if (counts.chest_count > 0)
    contentParts.push(plural(counts.chest_count, "chest", "chests"));
  if (counts.altar_count > 0)
    contentParts.push(plural(counts.altar_count, "altar", "altars"));

  if (contentParts.length === 0) return head;
  return `${head} Contains ${joinList(contentParts)}.`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
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
  quest_type: string;
  level_required: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
}

function questTierLabel(quest: QuestDescriptionInput): string {
  // Source: build-pipeline schema — these flags are mutually compatible but
  // we report the most specific one in priority order.
  if (quest.is_main_quest) return "Main story quest";
  if (quest.is_epic_quest) return "Epic quest";
  if (quest.is_adventurer_quest) return "Adventurer task";
  if (quest.is_repeatable) return "Repeatable quest";
  return "Quest";
}

function questActionVerb(questType: string): string {
  switch (questType) {
    case "kill":
      return "Combat";
    case "gather":
      return "Gathering";
    case "gather_inventory":
      return "Collection";
    case "location":
      return "Exploration";
    case "deliver":
      return "Delivery";
    case "equip_item":
      return "Equip";
    case "alchemy":
      return "Alchemy";
    case "find":
      return "Find";
    case "brew":
      return "Brewing";
    case "discover":
      return "Discovery";
    default:
      return "";
  }
}

const QUEST_OBJECTIVE_VERBS: Record<QuestObjective["type"], string> = {
  kill: "defeat",
  gather: "gather",
  have: "hold",
  equip: "equip",
  deliver: "deliver",
  discover: "discover",
  brew: "brew",
  find: "find",
  other: "complete",
};

function objectivePhrase(obj: QuestObjective): string {
  const verb = QUEST_OBJECTIVE_VERBS[obj.type];
  if (obj.amount > 1) return `${verb} ${obj.amount} ${obj.name}`;
  return `${verb} ${obj.name}`;
}

export function questDescription(
  quest: QuestDescriptionInput,
  objectives: QuestObjective[],
): string {
  const tier = questTierLabel(quest);
  const action = questActionVerb(quest.quest_type);
  const tierPhrase = action ? `${action} ${tier.toLowerCase()}` : tier;
  const tierSentence = capitalizeFirst(tierPhrase);

  const levelPhrase =
    quest.level_required > 0 ? ` for level ${quest.level_required}+` : "";

  // Top 2 objectives by amount keeps the description focused; long objective
  // lists are a frequent SERP-truncation source on quest pages.
  const top = [...objectives].sort((a, b) => b.amount - a.amount).slice(0, 2);
  const objectivesPhrase =
    top.length > 0
      ? ` ${capitalizeFirst(top.map(objectivePhrase).join(" then "))}.`
      : "";

  return `${quest.name} — ${tierSentence}${levelPhrase}.${objectivesPhrase}`;
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
  /** UI label for the recipe family. */
  type: "Alchemy" | "Cooking" | "Crafting" | "Scribing";
  /** Number of result items produced per craft (crafting only). */
  result_amount?: number;
  /** Crafting station required (e.g. "forge"). null for scribing. */
  station_type?: string | null;
  /** Profession level required (alchemy/scribing). null for crafting. */
  level_required?: number | null;
  /** XP awarded per craft (crafting/alchemy). 0 for scribing. */
  xp?: number;
}

function humanizeStation(station: string | null | undefined): string | null {
  if (!station || station === "unknown") return null;
  switch (station) {
    case "alchemy_table":
      return "alchemy table";
    case "scribing_table":
      return "scribing table";
    case "cooking":
      return "campfire";
    case "forge":
      return "forge";
    case "workbench":
      return "workbench";
    case "loom":
      return "loom";
    case "sawmill":
      return "sawmill";
    default:
      return station.replace(/_/g, " ");
  }
}

function indefiniteArticle(phrase: string): "a" | "an" {
  return /^[aeiou]/i.test(phrase) ? "an" : "a";
}

export function recipeDescription(
  recipe: RecipeDescriptionInput,
  ingredients: RecipeIngredient[],
): string {
  const yields =
    recipe.result_amount && recipe.result_amount > 1
      ? `${recipe.result_amount} × ${recipe.result_item_name}`
      : recipe.result_item_name;

  const family = recipe.type.toLowerCase();
  const levelPhrase =
    recipe.level_required && recipe.level_required > 0
      ? ` requiring profession level ${recipe.level_required}`
      : "";

  const station = humanizeStation(recipe.station_type);
  const stationPhrase = station
    ? ` Crafted at ${indefiniteArticle(station)} ${station}.`
    : "";

  // Top 2 materials by amount, then "and N more" if there are more.
  const sorted = [...ingredients].sort((a, b) => b.amount - a.amount);
  const topMaterials = sorted
    .slice(0, 2)
    .map((i) => (i.amount > 1 ? `${i.amount} ${i.item_name}` : i.item_name));
  const remaining = Math.max(0, ingredients.length - 2);
  let materialsPhrase = "";
  if (topMaterials.length > 0) {
    const more = remaining > 0 ? ` and ${remaining} more` : "";
    materialsPhrase = ` Requires ${joinList(topMaterials)}${more}.`;
  }

  const xpPhrase =
    recipe.xp && recipe.xp > 0
      ? ` Awards ${recipe.xp.toLocaleString()} XP.`
      : "";

  return `${yields} — ${capitalizeFirst(family)} recipe${levelPhrase}.${stationPhrase}${materialsPhrase}${xpPhrase}`;
}

// =============================================================================
// Chests
// =============================================================================

interface ChestDescriptionInput {
  zone_name: string;
  key_required_name: string | null;
  gold_min: number;
  gold_max: number;
  item_reward_name: string | null;
  respawn_time: number;
}

export function chestDescription(chest: ChestDescriptionInput): string {
  const keyPhrase = chest.key_required_name
    ? ` Requires ${chest.key_required_name} to open.`
    : "";

  let goldPhrase = "";
  if (chest.gold_max > 0) {
    goldPhrase =
      chest.gold_min === chest.gold_max
        ? `${chest.gold_max.toLocaleString()} gold`
        : `${chest.gold_min.toLocaleString()}-${chest.gold_max.toLocaleString()} gold`;
  }

  const itemPhrase = chest.item_reward_name
    ? ` and a chance at ${chest.item_reward_name}`
    : "";

  // Source: schema chests.respawn_time — seconds between server-side resets.
  const respawnPhrase =
    chest.respawn_time > 0
      ? ` Respawns every ${formatDuration(chest.respawn_time)}.`
      : "";

  const yieldsPhrase =
    goldPhrase || itemPhrase
      ? ` Yields ${goldPhrase || "random loot"}${itemPhrase}.`
      : "";

  return `Treasure chest in ${chest.zone_name}.${keyPhrase}${yieldsPhrase}${respawnPhrase}`;
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
  tool_required_name?: string | null;
  gathering_exp?: number | null;
  item_reward_name?: string | null;
  item_reward_amount?: number | null;
}

export function gatheringResourceDescription(
  resource: GatheringResourceDescriptionInput,
  zoneNames: string[],
): string {
  let typeLabel: string;
  if (resource.is_radiant_spark) typeLabel = "radiant spark";
  else if (resource.is_mineral) typeLabel = "mineral node";
  else if (resource.is_plant) typeLabel = "plant";
  else typeLabel = "gathering node";

  // Tier numbers exist only for plants and minerals; radiant sparks scale
  // dynamically with the player's Radiant Seeker profession.
  const hasTier =
    (resource.is_plant || resource.is_mineral) && resource.level != null;
  const tierPhrase = hasTier ? `Tier ${toRomanNumeral(resource.level!)} ` : "";

  const toolPhrase = resource.tool_required_name
    ? ` Requires ${resource.tool_required_name} to gather.`
    : "";

  const rewardName = resource.item_reward_name;
  const rewardAmount = resource.item_reward_amount ?? 1;
  const rewardPhrase = rewardName
    ? ` Yields ${rewardAmount > 1 ? `${rewardAmount} ${rewardName}` : rewardName} per harvest.`
    : "";

  const xpPhrase =
    resource.gathering_exp && resource.gathering_exp > 0
      ? ` Awards ${resource.gathering_exp.toLocaleString()} gathering XP.`
      : "";

  let locationPhrase = "";
  if (zoneNames.length === 1) locationPhrase = ` Found in ${zoneNames[0]}.`;
  else if (zoneNames.length === 2 || zoneNames.length === 3)
    locationPhrase = ` Found in ${joinList(zoneNames)}.`;
  else if (zoneNames.length > 3)
    locationPhrase = ` Found in ${zoneNames[0]} and ${zoneNames.length - 1} other zones.`;

  return `${resource.name} — ${tierPhrase}${typeLabel}.${toolPhrase}${rewardPhrase}${xpPhrase}${locationPhrase}`;
}

// =============================================================================
// Skills
// =============================================================================
//
// Skill ownership is layered: a skill can belong to classes, pets,
// mercenaries, monsters, scrolls, or any combination. The description routes
// to the most specific owner first so the player searching for it gets the
// answer they expect ("who casts this?").

interface SkillDescriptionInput {
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string[];
  required_spent_points: number;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
  is_scroll: boolean;
  /** Number of monsters that have this skill in monster_skills. */
  monster_count: number;
}

const SKILL_TYPE_LABELS: Record<string, string> = {
  target_damage: "Single-target damage spell",
  area_damage: "Area-of-effect damage spell",
  target_projectile: "Ranged projectile attack",
  frontal_damage: "Frontal cone attack",
  frontal_projectiles: "Frontal projectile barrage",
  target_buff: "Single-target buff",
  area_buff: "Party-wide buff",
  target_debuff: "Single-target debuff",
  area_debuff: "Area-of-effect debuff",
  target_heal: "Single-target heal",
  area_heal: "Party-wide heal",
  passive: "Passive ability",
  summon_monsters: "Summon spell",
  summon: "Summon spell",
  area_object_spawn: "Placed area effect",
};

function humanizeSkillType(skillType: string): string {
  if (skillType in SKILL_TYPE_LABELS) return SKILL_TYPE_LABELS[skillType];
  return capitalizeFirst(skillType.replace(/_/g, " "));
}

function classesPhrase(classes: string[]): string {
  if (classes.length === 0) return "";
  if (classes.length === 6) return "Universal";
  const titled = classes.map((c) => capitalizeFirst(c));
  if (titled.length === 1) return titled[0];
  return joinList(titled);
}

/**
 * Compose the per-skill description.
 *
 * Ownership routing priority:
 * 1. veteran + has classes \u2192 veteran skill
 * 2. mercenary skill \u2192 mercenary phrase (with classes if present)
 * 3. pet skill \u2192 pet ability (with classes if present)
 * 4. scroll-only \u2192 scroll spell
 * 5. classes + monsters \u2192 class skill also used by monsters
 * 6. classes only \u2192 class skill
 * 7. monsters only \u2192 monster ability
 * 8. fallback \u2192 "Skill"
 */
export function skillDescription(skill: SkillDescriptionInput): string {
  const typeLabel = humanizeSkillType(skill.skill_type);
  const classes = classesPhrase(skill.player_classes);

  let ownership: string;
  if (skill.is_veteran && skill.player_classes.length >= 1) {
    ownership = `Veteran skill for ${classes}`;
  } else if (skill.is_mercenary_skill) {
    ownership = classes ? `Mercenary skill (${classes})` : "Mercenary skill";
  } else if (skill.is_pet_skill) {
    ownership = classes ? `Pet ability (${classes} pets)` : "Pet ability";
  } else if (skill.is_scroll && skill.player_classes.length === 0) {
    ownership = "Scroll-only spell";
  } else if (skill.player_classes.length >= 1 && skill.monster_count > 0) {
    const noun = skill.monster_count === 1 ? "monster" : "monsters";
    ownership = `${classes} skill, also used by ${skill.monster_count} ${noun}`;
  } else if (skill.player_classes.length >= 1) {
    ownership = `${classes} skill`;
  } else if (skill.monster_count > 0) {
    const noun = skill.monster_count === 1 ? "creature" : "creatures";
    ownership = `Monster ability used by ${skill.monster_count} ${noun}`;
  } else {
    ownership = "Skill";
  }

  const tierPhrase =
    skill.tier > 0 ? ` Tier ${toRomanNumeral(skill.tier)}.` : "";
  // Source: server-scripts/PlayerSkills.cs:456-458 — veteran skill upgrades check regular character level, available veteran points, and spent veteran points.
  // Source: server-scripts/PlayerSkills.cs:822-825 — CmdUpgradeVeteran spends available veteran points before increasing the skill level.
  // Source: server-scripts/Player.cs:5995-6005 and ScriptableSkill.cs:199-201 — requiredSpentPoints means already-spent veteran points, not total veteran level.
  const levelPhrase = skill.is_veteran
    ? skill.required_spent_points > 0
      ? ` Requires ${skill.required_spent_points} spent veteran points.`
      : ""
    : skill.level_required > 0
      ? ` Unlocks at level ${skill.level_required}.`
      : "";

  return `${skill.name} — ${typeLabel}.${tierPhrase} ${ownership}.${levelPhrase}`
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// Pets
// =============================================================================
//
// Source: server-scripts/SummonSkill.cs:55-76 — familiar level scales with
// summoning skill rank, companion level matches summoner, mercenaries hire at
// player level and gain attributes per level. We deliberately don't print
// numeric levels or stats: every value in the DB pets row is a build-time
// placeholder.

interface PetDescriptionInput {
  name: string;
  /** "Mercenary" | "Familiar" | "Companion". Pre-classified by pets.server.ts. */
  kind: "Mercenary" | "Familiar" | "Companion";
  type_monster: string;
  has_buffs: boolean;
  has_heals: boolean;
  /** The summon skill that creates this pet (familiars/companions). */
  summoning_skill_name: string | null;
  /** Class id of the summoning skill (lowercase, e.g. "druid"). */
  summoning_class_id: string | null;
}

function petRolePhrase(input: PetDescriptionInput): string {
  if (input.has_heals && input.has_buffs) return "Provides heals and buffs.";
  if (input.has_heals) return "Provides heals.";
  if (input.has_buffs) return "Provides buffs.";
  return "Combat-focused.";
}

function petOriginPhrase(input: PetDescriptionInput): string {
  const className = input.summoning_class_id
    ? capitalizeFirst(input.summoning_class_id)
    : null;
  switch (input.kind) {
    case "Familiar":
      // Source: server-scripts/SummonSkill.cs:76 — level = skillLevel
      if (input.summoning_skill_name && className) {
        return ` Summoned by the ${input.summoning_skill_name} skill (${className}). Level scales with the skill rank.`;
      }
      return " Summoned by a class skill. Level scales with the skill rank.";
    case "Companion":
      // Source: server-scripts/SummonSkill.cs:76 — level = min(petMaxLevel, playerLevel)
      if (input.summoning_skill_name && className) {
        return ` Summoned by the ${input.summoning_skill_name} skill (${className}). Level matches the summoner.`;
      }
      return " Summoned by a class skill. Level matches the summoner.";
    case "Mercenary":
      // Source: server-scripts/Player.cs:7846 — hired at player level, gains attributes per level
      return " Recruited from any Mercenary Recruiter NPC. Hired at the player's current level and continues to gain attributes as the player levels.";
  }
}

export function petDescription(input: PetDescriptionInput): string {
  const origin = petOriginPhrase(input);
  const role = petRolePhrase(input);
  return `${input.name} — ${input.kind} (${input.type_monster}).${origin} ${role}`;
}

// =============================================================================
// Altars
// =============================================================================
//
// Source: build-pipeline schema — altars.type is "forgotten" | "avatar".
// Forgotten altars carry a min_level_required gate; avatar altars do not
// (their min_level_required is always 0 in the current DB).

interface AltarDescriptionInput {
  name: string;
  type: "forgotten" | "avatar" | string;
  zone_name: string;
  min_level_required: number;
  total_waves: number;
  required_activation_item_name: string | null;
  uses_veteran_scaling: boolean;
  reward_common_name: string | null;
  reward_legendary_name: string | null;
}

export function altarDescription(altar: AltarDescriptionInput): string {
  const typeLabel =
    altar.type === "avatar" ? "Avatar Altar" : "Forgotten Altar";

  const activationPhrase = altar.required_activation_item_name
    ? ` Activated with ${altar.required_activation_item_name}.`
    : "";

  const wavesPhrase =
    altar.total_waves > 0 ? ` ${altar.total_waves}-wave encounter.` : "";

  // Avatar altars suppress the level line entirely (their min level is 0 by
  // design). For forgotten altars only print when there's an actual gate.
  const levelPhrase =
    altar.type === "forgotten" && altar.min_level_required > 0
      ? ` Requires character level ${altar.min_level_required}.`
      : "";

  let rewardPhrase = "";
  if (altar.reward_common_name && altar.reward_legendary_name) {
    const legendaryReward = altar.reward_legendary_name.startsWith("Legendary ")
      ? altar.reward_legendary_name
      : `Legendary ${altar.reward_legendary_name}`;
    rewardPhrase = altar.uses_veteran_scaling
      ? ` Drops ${altar.reward_common_name} through ${legendaryReward} based on player level and veteran level.`
      : ` Drops ${altar.reward_common_name} through ${altar.reward_legendary_name}.`;
  }

  return `${typeLabel} in ${altar.zone_name}.${activationPhrase}${wavesPhrase}${levelPhrase}${rewardPhrase}`;
}

// =============================================================================
// Classes
// =============================================================================
//
// Source: server-scripts class definitions — each class has a primary role,
// optional secondary role, and energy/mana resource. We use formatResourceName
// so the in-game word "Rage" shows for energy users instead of the schema
// column name.

interface ClassDescriptionInput {
  name: string;
  description: string;
  primary_role: string;
  secondary_role: string | null;
  resource_type: string;
}

function loreSnippet(description: string): string {
  if (!description) return "";
  const sanitized = description.trim().replace(/;/g, ".");
  const firstSentenceMatch = sanitized.match(/^[^.!?]+[.!?]/);
  const sentence = firstSentenceMatch
    ? firstSentenceMatch[0].trim()
    : sanitized;
  return sentence;
}

export function classDescription(klass: ClassDescriptionInput): string {
  const resource = formatResourceName(klass.resource_type);
  const role = klass.secondary_role
    ? `${klass.primary_role} with ${klass.secondary_role.toLowerCase()}`
    : klass.primary_role;
  const lore = loreSnippet(klass.description);
  const lorePhrase = lore ? ` ${lore}` : "";

  return `${klass.name} — ${role}, uses ${resource}.${lorePhrase}`;
}
