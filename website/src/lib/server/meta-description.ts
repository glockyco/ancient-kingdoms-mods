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
  /**
   * Base duration of the linked buff in seconds, if the item applies one
   * (potions/food/relics). Source: skills.duration_base on the row keyed
   * by potion_buff_id / food_buff_id / relic_buff_id. We only surface the
   * base value because per-level scaling depends on the player's Elixir
   * Endurance veteran rank (PotionItem.cs:127-138) and similar runtime
   * factors that aren't known at SSR time.
   */
  buffDurationSeconds?: number | null;
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
    case "costume":
      return "Costume";
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
      return item.is_ornamentation_token ? "Ornamentation Token" : `${q} Relic`;
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
      return potionDescription(item, ctx);
    case "food":
      return foodDescription(item, ctx);
    case "scroll":
      return scrollDescription(item);
    case "relic":
      return relicDescription(item, ctx);
    case "book":
      return bookDescription(item);
    case "mount":
      return mountDescription();
    case "backpack":
      return backpackDescription(item);
    case "pack":
      return packDescription(item, ctx);
    case "travel":
      return travelDescription(item);
    case "treasure_map":
      return treasureMapDescription();
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
      return `${quality(item)} ${formatItemType(item.item_type)}.`;
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
  return `${q} ${cat}${classes}.${level}${proc}`;
}

function equipmentDescription(item: Item): string {
  const q = quality(item);
  const slot = item.slot ?? "";
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  if (ARMOR_SLOTS.has(slot)) {
    const noun = slot === "Shield" ? "shield" : `${slotNoun(slot)} armor`;
    return `${q} ${noun}${classes}.${level}`;
  }
  if (JEWELRY_SLOTS.has(slot)) {
    return `${q} ${slotNoun(slot)}${classes}.${level}`;
  }
  return `${q} ${slot || "equipment"}${classes}.${level}`;
}

function ammoDescription(item: Item): string {
  const q = quality(item);
  const level = levelGate(item.level_required);
  return `${q} ammunition for ranged weapons.${level}`;
}

/**
 * Format a buff phrase from a context-supplied base duration.
 * Falls back to "<verb> <buff>." when no usable duration is known so the
 * sentence still conveys that an effect persists. The duration we surface
 * is the buff's `duration_base` (level=1 of LinearFloat); per-level scaling
 * exists but depends on the player's veteran progression at use time.
 */
function buffPhrase(
  verb: "Applies" | "Grants" | "Triggers",
  buffName: string,
  durationSeconds: number | null | undefined,
): string {
  if (durationSeconds && durationSeconds > 0) {
    return `${verb} ${buffName} for ${formatDuration(durationSeconds)}.`;
  }
  return `${verb} ${buffName}.`;
}

function potionDescription(item: Item, ctx: ItemMetaContext): string {
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
    ? ` ${buffPhrase("Applies", item.potion_buff_name, ctx.buffDurationSeconds)}`
    : "";
  // Source: server-scripts/PotionItem.cs — cooldownCategory "Bandages" marks the bandage subtype
  const isBandage = item.cooldown_category === "Bandages";
  const subtype = isBandage ? "Bandage" : "Potion";
  // Source: server-scripts/PotionItem.cs — potion_buff_allow_dungeon flags whether buff persists in dungeons
  const dungeon =
    !item.potion_buff_allow_dungeon && item.potion_buff_name
      ? " Dungeon use disabled."
      : "";
  return `${subtype}.${restorePhrase}${buff}${dungeon}`;
}

function foodDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/FoodItem.cs — applies buffEffect at fixed buffLevel
  const kind = item.food_type === "Drink" ? "Drink" : "Food";
  const buff = item.food_buff_name
    ? ` ${buffPhrase("Grants", item.food_buff_name, ctx.buffDurationSeconds)}`
    : "";
  const dungeon =
    !item.food_buff_allow_dungeon && item.food_buff_name
      ? " Buff disabled inside dungeons."
      : "";
  return `${kind}.${buff}${dungeon}`;
}

function scrollDescription(item: Item): string {
  // Source: server-scripts/ScrollItem.cs:9,13 — isRepairKit branches the scroll behaviour
  if (item.is_repair_kit) {
    const tier = quality(item);
    return `Repairs all equipped ${tier} or lower gear.`;
  }
  // Source: server-scripts/ScrollItem.cs:82,92 — spell rank scales with player.scrollMasteryLevel
  const skill = item.scroll_skill_name ?? "a spell";
  return `Casts ${skill}. Spell rank scales with the Scroll Mastery profession.`;
}

function relicDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RelicItem.cs:12,17-20 — isOrnamentationToken saves armor appearance
  const isOrnament = item.is_ornamentation_token;
  if (isOrnament) {
    return `Saves an armor piece's appearance to your wardrobe collection.`;
  }
  const q = quality(item);
  // Source: server-scripts/RelicItem.cs:31 — buff applied at buffEffect.maxLevel,
  // not at the relic's own buff_level. We surface base duration only;
  // ctx.buffDurationSeconds is null when the linked buff has no timer.
  const buffName = item.relic_buff_name ?? "a buff";
  const dur =
    ctx.buffDurationSeconds && ctx.buffDurationSeconds > 0
      ? ` for ${formatDuration(ctx.buffDurationSeconds)}`
      : "";
  const buff = ` Triggers ${buffName}${dur}.`;
  const dungeon = !item.relic_buff_allow_dungeon
    ? " Cannot be used inside dungeons."
    : "";
  return `${q} relic.${buff}${dungeon}`;
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
  return `One-time read that permanently increases your attributes.${phrase}`;
}

function mountDescription(): string {
  // Source: server-scripts/MountItem.cs:8, server-scripts/Player.cs:497-501 — speedMount
  // is the absolute movement speed when mounted, replacing equipped speed bonuses.
  return `Mountable creature. Replaces your base movement speed while mounted. Cannot mount in dungeons or while in combat.`;
}

function backpackDescription(item: Item): string {
  // Source: server-scripts/BackpackItem.cs:7, server-scripts/PlayerInventory.cs:29-31
  // — numSlots is added to the inventory while the bag is in the combined-backpack slot.
  const slots = item.backpack_slots > 0 ? item.backpack_slots : 0;
  const slotPhrase =
    slots > 0
      ? ` Adds ${slots} extra inventory slots while equipped in your Combined Backpack.`
      : "";
  return `Storage bag.${slotPhrase}`;
}

function packDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/PackItem.cs:6-8,15 — redeems for finalAmountReceived × finalItemReceived
  const contents = ctx.packContents ?? [];
  if (contents.length > 0) {
    const c = contents[0];
    const phrase = c.amount > 1 ? `${c.amount} × ${c.item_name}` : c.item_name;
    return `Redeems for ${phrase}.`;
  }
  return `Container that redeems for a fixed item bundle on use.`;
}

function travelDescription(item: Item): string {
  // Source: server-scripts/TravelItem.cs:25-29 — nameDestination=="Bind Point" routes to player bind
  if (item.travel_destination_name === "Bind Point") {
    return `Teleports you to your bind point. Cannot be used inside the Temple of Valaark.`;
  }
  const dest = item.travel_destination_name ?? "a fixed location";
  return `Teleports you to ${dest}. Cannot be used inside the Temple of Valaark.`;
}

function treasureMapDescription(): string {
  // Source: server-scripts/TreasureMapItem.cs:12-15 — using the map opens
  // its clue image. server-scripts/TreasureLocation.cs:61-100 — at the
  // matching dig site, using the map with a Shovel consumes it and grants
  // a Buried Treasure Chest plus +0.5% Treasure Hunter skill. Each map
  // points at exactly one dig site.
  return `Reveals one buried treasure dig site. Dig at the marked spot with a Shovel to claim a Buried Treasure Chest.`;
}

function chestContainerDescription(item: Item): string {
  // Source: server-scripts/ChestItem.cs:11,24 — yields numItemsPerChest from a weighted reward table
  const n = item.chest_num_items > 0 ? item.chest_num_items : 1;
  const itemsWord = n === 1 ? "item" : "items";
  return `Loot container. Yields ${n} ${itemsWord} from a weighted reward pool.`;
}

function randomDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RandomItem.cs:6 — yields one of items[] at random
  const n = ctx.randomOutcomes?.length ?? 0;
  if (n > 0) {
    return `Mystery container. Yields one of ${n} possible items at random.`;
  }
  return `Mystery container. Yields one item at random from a fixed pool.`;
}

function augmentDescription(item: Item): string {
  // Source: server-scripts/AugmentItem.cs, website/src/routes/items/[id]/+page.svelte:975-1031
  // — set augments grant set bonuses; socketable augments are consumed at a crafting
  // station and can be removed by Augmenter NPCs (5,000g/10,000g/15,000g per quality).
  const q = quality(item);
  if (item.augment_armor_set_name) {
    return `${q} augment in the ${item.augment_armor_set_name} armor set, contributing to its set bonuses.`;
  }
  const target = item.augment_is_defensive ? "armor piece" : "weapon";
  return `${q} augment. Permanently socketed into ${target === "armor piece" ? "an armor piece" : "a weapon"} at a crafting station, removable at an Augmenter NPC.`;
}

function fragmentDescription(item: Item): string {
  // Source: build-pipeline schema — fragment_amount_needed and fragment_result_item_name
  // are populated for items that combine into a higher-tier reward.
  const need =
    item.fragment_amount_needed > 0 ? item.fragment_amount_needed : 0;
  const result = item.fragment_result_item_name;
  if (need > 0 && result) {
    return `Collect ${need} to combine into ${result}.`;
  }
  if (result) {
    return `Combines into ${result}.`;
  }
  return `Fragment that combines into a higher-tier reward.`;
}

function recipeItemDescription(item: Item): string {
  // Source: server-scripts/RecipeItem.cs:11-22 — teaches potionLearned (any craftable),
  // refused if already known.
  const taught = item.recipe_potion_learned_name;
  if (taught) {
    return `Teaches the recipe for ${taught}. Refused if you already know it.`;
  }
  return `Recipe item. Teaches a craftable on first use.`;
}

function mergeDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/uMMORPG.Scripts.ScriptableItems/MergeItem.cs:15-48 —
  // checks inventory for itemsNeeded, consumes them and the merge token, grants resultItem.
  const result = ctx.mergeResultName ?? null;
  if (result) {
    return `Combines with required components in your inventory to create ${result}.`;
  }
  return `Combines with required components in your inventory to create a new item.`;
}

function structureDescription(item: Item): string {
  // Source: server-scripts/HousingManager.cs:21-32, server-scripts/Player.cs:4458,10138-10153
  // — players buy a named house, then place CustomStructureItems inside it.
  const price =
    item.structure_price > 0
      ? `${item.structure_price.toLocaleString()} gold`
      : "a fixed gold cost";
  return `Furniture. Costs ${price} to place inside a house you own.`;
}

function generalDescription(item: Item, ctx: ItemMetaContext): string {
  if (item.is_chest_key) return chestKeyDescription(item, ctx);
  if (item.is_key) return keyDescription(ctx);
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
    return `Chest key. Opens ${chestPhrase} across ${zonePhrase}.`;
  }
  return `Chest key.`;
}

function keyDescription(ctx: ItemMetaContext): string {
  // Source: server-scripts/Portal.cs:49 and InteractablePortal.cs:101 —
  // portals gated by a key check `player.keys` (or any party member's
  // keyring) for the matching name. Source: server-scripts/ScriptableItem.cs:39
  // — items flagged `isKey` are routed to the keyring (`player.AddKey(...)`)
  // by every loot path (PlayerLooting.cs:146, ChestItem.cs:50,
  // GatherItem.cs:455, …) instead of taking an inventory slot.
  // Source: server-scripts/GatherInventoryQuest.cs:21,47 — the keyring also
  // counts as inventory for gather-inventory quest gates that name a key.
  const portals = ctx.usages?.portals ?? [];
  if (portals.length === 0) {
    return `Keyring item.`;
  }
  const portalPhrase =
    portals.length === 1 ? "1 portal" : `${portals.length} portals`;
  const destinations = new Set(portals.map((p) => p.to_zone_id));
  if (destinations.size === 1) {
    return `Unlocks ${portalPhrase} to ${portals[0].to_zone_name}.`;
  }
  return `Unlocks ${portalPhrase} across ${destinations.size} zones.`;
}

function questItemDescription(item: Item): string {
  const flags: string[] = [];
  if (!item.sellable) flags.push("not sellable");
  if (!item.tradable) flags.push("not tradable");
  if (!item.destroyable) flags.push("not destroyable");
  const flagPhrase =
    flags.length > 0 ? ` ${capitalizeFirst(joinList(flags))}.` : "";
  return `Quest item.${flagPhrase}`;
}

function generalUsageDescription(item: Item, ctx: ItemMetaContext): string {
  const q = quality(item);
  const usages = ctx.usages;
  if (!usages) {
    return `${q} item.`;
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
    return `${q} item.`;
  }
  // Surface up to the top 2 usage categories. One category alone reads as
  // "Used in 5 quests." Two categories share the verb: "Used in 5 quests
  // and 3 recipes." Lower-ranked categories are dropped to keep the
  // description short; users land on the detail page for the full breakdown.
  const top = counts.slice(0, 2);
  const phrases = top.map(
    (c) => `${c.count} ${pluralize(c.category, c.count)}`,
  );
  return `${q} item. Used in ${joinList(phrases)}.`;
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

  return `Level ${range} ${species}${classification}.${origin}`;
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

  return `${primary}${location}.${factionPhrase}${tailPhrase}`;
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

  const head = levelPhrase ? `${typeLabel}, ${levelPhrase}.` : `${typeLabel}.`;

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

/**
 * One quest objective row, as built by the loader from the DB. The `type`
 * mirrors the family of game data the row was sourced from (kill targets,
 * gather counters, gather-inventory bags, etc.) and is used to dispatch the
 * description verb. See `+page.server.ts` for how each ScriptableQuest
 * subclass maps onto these rows.
 */
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
  // LocationQuest sub-flavor: completion fires when the player reaches the
  // end NPC rather than a world location, so the description should say
  // "Find <NPC>" instead of "Discover <place>".
  is_find_npc_quest: boolean;
  // NPC the player turns the quest in to. Often the same as the start NPC.
  // Used as the destination for kill/gather/gather_inventory/equip/alchemy
  // sentences ("Bring 6 Bellflower to Master Eliphas in Moontide Hamlet.").
  // Skipped for location quests because the place/NPC is itself the target.
  turn_in_npc_name: string | null;
  turn_in_npc_zone_name: string | null;
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

/**
 * Render an "amount + name" or just "name" fragment, dropping the count
 * when amount is 1. Keeps "Defeat 50 Troll and Troll King Grimlok." natural
 * (boss line drops the "1") while preserving counts for grunt waves.
 */
function qtyName(amount: number, name: string): string {
  return amount > 1 ? `${amount} ${name}` : name;
}

/**
 * Append the turn-in NPC + zone to a body fragment.
 *
 * Mode picks the preposition that reads naturally for the surrounding verb:
 * - "inline":  "<body> to <NPC> in <Zone>." — used for `gather_inventory`
 *              ("Bring") where the action IS delivering to the NPC, so "to"
 *              attaches to the verb without distortion.
 * - "report":  "<body>. Report to <NPC> in <Zone>." — used for kill, gather,
 *              equip, alchemy. "Defeat X to NPC" / "Brew X to NPC" reads as
 *              the wrong preposition; a separate "Report to" sentence keeps
 *              the grammar clean while still anchoring the player.
 * - "none":    "<body>." — used for `location` where the destination is
 *              itself the objective.
 *
 * Falls back to "<body>." when no NPC is known so callers can pass the mode
 * unconditionally.
 */
function appendTurnIn(
  quest: QuestDescriptionInput,
  body: string,
  mode: "inline" | "report" | "none",
): string {
  if (mode === "none" || !quest.turn_in_npc_name) return `${body}.`;
  const zone = quest.turn_in_npc_zone_name
    ? ` in ${quest.turn_in_npc_zone_name}`
    : "";
  if (mode === "inline") {
    return `${body} to ${quest.turn_in_npc_name}${zone}.`;
  }
  return `${body}. Report to ${quest.turn_in_npc_name}${zone}.`;
}

/**
 * Render a list of must-do targets with a verb prefix. Quest objectives
 * within a verb are concurrent (the player must satisfy all), so the
 * connector is always "and", never "then".
 * - 1–3 distinct entries: enumerate by name with the Oxford-comma joiner
 *   ("Bring 3 Fragment of Resilience and 3 Fragment of Serenity").
 * - 4+ entries: aggregate to "<verb> <total> items". Only realistically
 *   fires for `gather_inventory` quests with many distinct mats; in-DB
 *   worst case is 5 distinct items (Path of Scales).
 * Returns null when the list is empty so the caller can omit the sentence.
 */
function renderTargetList(
  verb: string,
  list: ReadonlyArray<{ name: string; amount: number }>,
  collective: string = "items",
): string | null {
  if (list.length === 0) return null;
  if (list.length <= 3) {
    return `${verb} ${joinList(list.map((o) => qtyName(o.amount, o.name)))}`;
  }
  const total = list.reduce((sum, o) => sum + Math.max(o.amount, 1), 0);
  return `${verb} ${total} ${collective}`;
}

/**
 * Pick the single objective sentence that matches the quest's mechanical
 * type. Each `quest_type` corresponds to one ScriptableQuest subclass with
 * a fixed gameplay loop, so the description follows that loop precisely
 * instead of stitching together every objective type the loader happened
 * to push.
 *
 * Sources verified against `server-scripts/`:
 * - `KillQuest.cs`            → counter-based, ≤2 targets.
 * - `GatherQuest.cs`          → progress-counter (NOT inventory), ≤3 items.
 * - `GatherInventoryQuest.cs` → inventory check at turn-in for both
 *                               `gatherItems[]` and `requiredItems[]`;
 *                               consumed iff `removeItemsOnComplete`.
 * - `EquipItemQuest.cs`       → all listed items must be equipped together.
 * - `LocationQuest.cs`        → single trigger; `isFindNpcQuest` flips it
 *                               from "discover place" to "find NPC".
 * - `AlchemyQuest.cs`         → counter on brewed potions, single recipe.
 */
function buildObjectiveSentence(
  quest: QuestDescriptionInput,
  objectives: QuestObjective[],
): string {
  const pickByType = (...types: QuestObjective["type"][]): QuestObjective[] =>
    objectives.filter((o) => types.includes(o.type));

  let body: string | null = null;
  // Mode picks the natural preposition for the verb. "to" reads as a
  // delivery target only after "Bring"; for every other verb a separate
  // "Report to" sentence keeps the grammar clean. Location quests have no
  // separate destination — the find/discover target IS the destination.
  let mode: "inline" | "report" | "none" = "report";

  switch (quest.quest_type) {
    case "kill":
      body = renderTargetList("Defeat", pickByType("kill"));
      break;
    case "gather":
      // Progress-counter: items don't have to stay in inventory after the
      // threshold is hit, but the player still has to pick them up. "Collect"
      // matches that loop and disambiguates from gather_inventory's "Bring".
      body = renderTargetList("Collect", pickByType("gather"));
      break;
    case "gather_inventory": {
      // gatherItems and requiredItems both gate fulfillment via inventory
      // (requiredItems also accepts equipped slots). For description
      // purposes the player action is identical: get them and walk to NPC.
      body = renderTargetList("Bring", pickByType("have", "deliver"));
      mode = "inline";
      break;
    }
    case "equip_item":
      body = renderTargetList(
        "Equip",
        pickByType("equip"),
        "pieces of equipment",
      );
      break;
    case "alchemy":
      body = renderTargetList("Brew", pickByType("brew"));
      break;
    case "location": {
      body = quest.is_find_npc_quest
        ? renderTargetList("Find", pickByType("find"))
        : renderTargetList("Discover", pickByType("discover"));
      mode = "none";
      break;
    }
    // "general" or any unrecognized type: the quest has no mechanical
    // objective the description can summarize honestly. Skip the sentence.
    default:
      body = null;
  }

  return body ? ` ${appendTurnIn(quest, body, mode)}` : "";
}

export function questDescription(
  quest: QuestDescriptionInput,
  objectives: QuestObjective[],
): string {
  const tier = questTierLabel(quest);
  const levelPhrase =
    quest.level_required > 0 ? ` for level ${quest.level_required}+` : "";
  const objectiveSentence = buildObjectiveSentence(quest, objectives);
  return `${tier}${levelPhrase}.${objectiveSentence}`;
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

  return `${capitalizeFirst(family)} recipe${levelPhrase}.${stationPhrase}${materialsPhrase}${xpPhrase}`;
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

  // typeLabel is lowercase ("mineral node", "plant"); capitalize when there's
  // no Tier prefix to lead the sentence.
  const head = tierPhrase
    ? `${tierPhrase}${typeLabel}`
    : capitalizeFirst(typeLabel);
  return `${head}.${toolPhrase}${rewardPhrase}${xpPhrase}${locationPhrase}`;
}

// =============================================================================
// Skills
// =============================================================================
//
// Skill ownership is layered: a skill can belong to classes, pets,
// mercenaries, monsters, scrolls, or any combination. The description routes
// to the most specific owner first so the player searching for it gets the
// answer they expect ("who casts this?").

/**
 * Counts of items that grant or trigger this skill, grouped by source type.
 * Source: build-pipeline `denormalizers/skills/sources.py` populates the
 * `granted_by_items` JSON column from each per-source linkage:
 *  - scroll       — items.scroll_skill_id
 *  - potion_buff  — items.potion_buff_id
 *  - food_buff    — items.food_buff_id
 *  - relic_buff   — items.relic_buff_id
 *  - weapon_proc  — items.weapon_proc_effect_id
 */
export interface SkillGrantedByCounts {
  scroll: number;
  potion_buff: number;
  food_buff: number;
  relic_buff: number;
  weapon_proc: number;
}

interface SkillDescriptionInput {
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string[];
  required_skill_points: number;
  required_spent_points: number;
  is_veteran: boolean;
  /** Number of monsters that have this skill in monster_skills. */
  monster_count: number;
  /**
   * Pets in `pets` with `is_mercenary=1` that have this skill via pet_skills.
   * Mercenaries are hired by talking to a Mercenary Recruiter NPC.
   */
  mercenary_user_count: number;
  /**
   * Pets in `pets` with `is_mercenary=0` (familiars + companions) that have
   * this skill via pet_skills. The pet itself is summoned by a class skill.
   */
  pet_user_count: number;
  /** Item-grant counts grouped by source type. See SkillGrantedByCounts. */
  granted_by: SkillGrantedByCounts;
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
 * Build the ownership phrase (if any). Routing priority puts the most
 * actionable owner first — what the player needs to look up to obtain or
 * use this skill.
 *
 * Reliable signals are JOIN-derived: pet_skills (mercenary/pet), monster_skills,
 * granted_by_items (item linkage). The bare flag columns `is_pet_skill` /
 * `is_mercenary_skill` / `is_scroll` on the skills row are NOT trusted —
 * many true mercenary/scroll skills have these flags zeroed in source data.
 */
function skillOwnershipPhrase(skill: SkillDescriptionInput): string | null {
  const classes = classesPhrase(skill.player_classes);
  const hasClasses = skill.player_classes.length >= 1;

  // Veteran tree — character-level + spent-points gated, owned by classes.
  if (skill.is_veteran && hasClasses) {
    return `Veteran skill for ${classes}`;
  }

  // Class tree — most actionable signal. Note the "also used by N monsters"
  // augmentation when monsters share a class skill.
  if (hasClasses && skill.monster_count > 0) {
    const noun = skill.monster_count === 1 ? "monster" : "monsters";
    return `${classes} skill, also used by ${skill.monster_count} ${noun}`;
  }
  if (hasClasses) {
    return `${classes} skill`;
  }

  // Mercenary ability before pet ability: a hireable mercenary is more
  // actionable than a familiar/companion locked behind a class skill.
  if (skill.mercenary_user_count > 0) {
    return "Mercenary ability";
  }
  if (skill.pet_user_count > 0) {
    return "Pet ability";
  }

  // Item-granted spells/buffs — pick the dominant single source where possible
  // so the description points the player at the kind of item they need.
  const g = skill.granted_by;
  const sourceTotal =
    g.scroll + g.potion_buff + g.food_buff + g.relic_buff + g.weapon_proc;
  if (sourceTotal > 0) {
    if (g.scroll === sourceTotal) {
      return g.scroll === 1
        ? "Spell cast from a scroll"
        : `Spell cast from ${g.scroll} scrolls`;
    }
    if (g.potion_buff === sourceTotal) {
      return g.potion_buff === 1
        ? "Applied by a potion"
        : `Applied by ${g.potion_buff} potions`;
    }
    if (g.food_buff === sourceTotal) {
      return g.food_buff === 1
        ? "Applied by a food item"
        : `Applied by ${g.food_buff} food items`;
    }
    if (g.relic_buff === sourceTotal) {
      return g.relic_buff === 1
        ? "Triggered by a relic"
        : `Triggered by ${g.relic_buff} relics`;
    }
    if (g.weapon_proc === sourceTotal) {
      return g.weapon_proc === 1
        ? "Procs from a weapon"
        : `Procs from ${g.weapon_proc} weapons`;
    }
    // Mixed sources — collapse to a generic count.
    return sourceTotal === 1
      ? "Granted by an item"
      : `Granted by ${sourceTotal} items`;
  }

  // Monsters only — last resort signal before "truly orphan".
  if (skill.monster_count > 0) {
    const noun = skill.monster_count === 1 ? "creature" : "creatures";
    return `Monster ability used by ${skill.monster_count} ${noun}`;
  }

  // Truly orphan: no class, no pet, no item, no monster. The type label
  // alone is the only honest signal.
  return null;
}

/**
 * Compose the per-skill description.
 * Format: `{typeLabel}.{tier} {ownership}.{gate}`
 * Each section is omitted when it has no useful content.
 */
export function skillDescription(skill: SkillDescriptionInput): string {
  const typeLabel = humanizeSkillType(skill.skill_type);
  const ownership = skillOwnershipPhrase(skill);

  const tierPhrase =
    skill.tier > 0 ? ` Tier ${toRomanNumeral(skill.tier)}.` : "";

  // The level/cost gate only applies when the player can actually act on it:
  //  - Veteran: cost in veteran points (with spent-points threshold).
  //  - Class skill: minimum character level to learn from a trainer.
  // Non-class owners (pet/mercenary/item/monster) gate at the *source* (the
  // pet's summon skill, the item's level requirement, etc.), not on this
  // skill row, so emitting "Unlocks at level X" there would mislead.
  // Source: server-scripts/PlayerSkills.cs:456-458 — veteran upgrades check
  //   regular character level, available veteran points, and spent points.
  // Source: server-scripts/PlayerSkills.cs:822-825 — CmdUpgradeVeteran spends
  //   available veteran points before increasing the skill level.
  // Source: server-scripts/Player.cs:5999-6009 and ScriptableSkill.cs:199-201
  //   — requiredSpentPoints means already-spent veteran points, not veteran
  //   level.
  const veteranPointText = `${skill.required_skill_points} veteran ${
    skill.required_skill_points === 1 ? "point" : "points"
  }`;
  // Veteran-tree skills with no player classes are mercenary-side veteran
  // skills the player can't learn, so the cost gate is only meaningful when
  // classes are set. Falling through to the class-skill branch in that case
  // would also be wrong — we just skip the gate.
  const isVeteranOwnedByPlayer =
    skill.is_veteran && skill.player_classes.length >= 1;
  const isClassLearned = skill.player_classes.length >= 1 && !skill.is_veteran;
  const gate = isVeteranOwnedByPlayer
    ? skill.required_spent_points > 0
      ? ` Costs ${veteranPointText} after ${skill.required_spent_points} spent veteran points.`
      : ` Costs ${veteranPointText}.`
    : isClassLearned && skill.level_required > 0
      ? ` Unlocks at level ${skill.level_required}.`
      : "";

  const ownershipPhrase = ownership ? ` ${ownership}.` : "";
  return `${typeLabel}.${tierPhrase}${ownershipPhrase}${gate}`
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
      // Source: server-scripts/Player.cs:7850 — hired at player level, gains attributes per level
      return " Recruited from any Mercenary Recruiter NPC. Hired at the player's current level and continues to gain attributes as the player levels.";
  }
}

export function petDescription(input: PetDescriptionInput): string {
  const origin = petOriginPhrase(input);
  const role = petRolePhrase(input);
  return `${input.kind} (${input.type_monster}).${origin} ${role}`;
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

  return `${role}, uses ${resource}.${lorePhrase}`;
}
