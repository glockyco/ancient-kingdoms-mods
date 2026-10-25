/**
 * Meta description and title generators for SEO.
 *
 * Descriptions summarize the outcome and conditions a player needs. Keep the
 * full mechanics on the detail page rather than repeating every loaded field.
 * Descriptions are not truncated to a fixed character limit.
 */

import {
  toRomanNumeral,
  formatItemType,
  formatEquipmentCategory,
  formatDuration,
  formatNumber,
  formatSkillType,
  formatPercent,
} from "$lib/utils/format";

import { QUALITY_NAMES } from "$lib/constants/quality";
import { ALL_CLASS_IDS, getResourceDisplayName } from "$lib/utils/classes";
import {
  formatStat,
  formatStatField,
  statFieldName,
  statFieldPhraseName,
  statName,
} from "$lib/stats";
import { ITEM_STAT_FIELDS } from "$lib/constants/items";
import type { StatId } from "$lib/generated/stat-vocabulary";
import { getRoleLabel } from "$lib/utils/roles";

// =============================================================================
// Items
//
// Detail titles can include loaded family, class, source and zone context.
// Description pattern is per-branch (one per item_type, with sub-branches for
// flag- and field-driven distinctions). Every gameplay claim cites its source
// in the game scripts to keep the wiki honest about what these items actually
// do, not what marketing names suggest.
// =============================================================================

import type { Item } from "$lib/queries/items";
import type { ItemSources, ItemUsages } from "$lib/types/item-sources";
import { seasonInSentence, type Season } from "$lib/data/seasonal-events";

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
  /** Result item name from the canonical merge method. */
  mergeResultName?: string | null;
  /**
   * Base duration of the linked buff in seconds, if the item applies one
   * (potions/food/relics). Source: skills.duration_base on the row keyed
   * by potion_buff_id / food_buff_id / relic_buff_id. We only surface the
   * base value because the applied level depends on the player's veteran rank,
   * which is unknown at SSR time.
   * Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — non-bandage potions can use Elixir Endurance. Bandages keep their base buff level.
   * Source: server-scripts/Pet.cs:2141-2154 — mercenary utility potions resolve their buff level from the owner's veteran rank.
   */
  buffDurationSeconds?: number | null;
  /** Whether the linked relic buff is a cleanse spell. */
  relicIsCleanse?: boolean;
  /** Rank count of the spell a scroll casts. */
  scrollSkillMaxRank?: number | null;
  /** Complete shared effect summary, including its duration, at the applied buff rank. */
  buffEffect?: string | null;
  /** Loaded treasure_locations row for this map. */
  treasureLocation?: { zone_name: string; reward_name: string | null } | null;
  sources?: ItemSources;
  seasons?: readonly Season[];
  /** Ingredients of the representative crafting recipe loaded for the item. */
  recipeIngredients?: RecipeIngredient[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quality(item: Pick<Item, "quality">): string {
  return QUALITY_NAMES[item.quality] ?? "Common";
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
    .sort()
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1) + "s");
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function levelGate(level: number): string {
  return level > 1 ? ` Requires level ${level}.` : "";
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

/** Compute the page title for an item detail page. */
export function itemTitle(item: Item): string {
  return `${item.name} - Ancient Kingdoms`;
}

// ---------------------------------------------------------------------------
// Description — 21+ branches, one per item_type with sub-branches
// ---------------------------------------------------------------------------

export function itemDescription(item: Item, ctx: ItemMetaContext = {}): string {
  if (ctx.seasons?.length) {
    const description = itemBaseDescription(item, {
      ...ctx,
      sources: undefined,
    });
    return description + seasonalItemSourcePhrase(ctx);
  }
  return itemBaseDescription(item, ctx);
}

function itemBaseDescription(item: Item, ctx: ItemMetaContext): string {
  switch (item.item_type) {
    case "weapon":
      return weaponDescription(item) + sourcePhrase(ctx);
    case "equipment":
      return equipmentDescription(item) + sourcePhrase(ctx);
    case "ammo":
      return ammoDescription(item);
    case "potion":
      return potionDescription(item, ctx);
    case "food":
      return foodDescription(item, ctx);
    case "scroll":
      return scrollDescription(item, ctx);
    case "relic":
      return relicDescription(item, ctx);
    case "book":
      return bookDescription(item);
    case "mount":
      return mountDescription(item) + sourcePhrase(ctx);
    case "backpack":
      return backpackDescription(item);
    case "pack":
      return packDescription(item, ctx);
    case "travel":
      return travelDescription(item);
    case "treasure_map":
      return treasureMapDescription(ctx);
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
    case "costume":
      return `${item.slot ? `${formatEquipmentCategory(item.slot)} costume` : "Costume"}. Using it saves its appearance to your wardrobe.${sourcePhrase(ctx)}`;
    case "pet": {
      const summon = item.tooltip?.match(/Summons [^<\n.]+\./)?.[0];
      return `${summon ?? "Cosmetic pet whistle."} Use the whistle again to dismiss the pet.${sourcePhrase(ctx)}`;
    }
    default:
      return `${quality(item)} ${formatItemType(item.item_type).toLowerCase()}.${sourcePhrase(ctx)}`;
  }
}

// --- branches ---

function weaponDescription(item: Item): string {
  const q = quality(item);
  const cat = equipmentNoun(item.weapon_category, "weapon");
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  // Source: server-scripts/WeaponItem.cs:procOnSpellCast; Skills.cs:TrySpellCastWeaponProc — weapon_proc_effect_id triggers on hit, or after damaging spells when the weapon is flagged
  const proc = item.weapon_proc_effect_name
    ? ` Procs ${item.weapon_proc_effect_name} ${item.weapon_proc_on_spell_cast ? "after damaging spells" : "on hit"}.`
    : "";
  return `${q} ${cat}${classes}.${level}${itemStatPhrase(item)}${proc}`;
}

function equipmentDescription(item: Item): string {
  const q = quality(item);
  const slot = item.slot ?? "";
  const displaySlot = equipmentNoun(slot, "equipment");
  const classes = classRestrictionPhrase(item.class_required);
  const level = levelGate(item.level_required);
  if (ARMOR_SLOTS.has(slot)) {
    const noun = ["Shield", "Bracers", "Belt"].includes(slot)
      ? displaySlot
      : `${displaySlot} armor`;
    return `${q} ${noun}${classes}.${level}${itemStatPhrase(item)}`;
  }
  if (JEWELRY_SLOTS.has(slot)) {
    return `${q} ${displaySlot}${classes}.${level}${itemStatPhrase(item)}`;
  }
  return `${q} ${displaySlot}${classes}.${level}${itemStatPhrase(item)}`;
}

function ammoDescription(item: Item): string {
  const q = quality(item);
  const level = levelGate(item.level_required);
  return `${q} ammunition for ranged weapons.${level}`;
}

function equipmentNoun(category: string | null, fallback: string): string {
  const names: Record<string, string> = {
    WeaponDagger: "light one-handed weapon",
    WeaponSword: "one-handed weapon",
    WeaponSword2H: "two-handed weapon",
    Hands: "hand",
    Feet: "foot",
    Legs: "leg",
    Neck: "necklace",
    Ear: "earring",
  };
  return category
    ? (names[category] ?? formatEquipmentCategory(category).toLowerCase())
    : fallback;
}

function itemStatPhrase(item: Item): string {
  const stats = JSON.parse(item.stats || "{}") as Record<string, unknown>;
  const phrases = ITEM_STAT_FIELDS.flatMap((field) => {
    const value = stats[field.field];
    return typeof value === "number" && value !== 0
      ? [
          `${formatStatField(field, value, { signed: item.item_type !== "weapon" || field.stat !== "attack_power" })} ${item.item_type === "weapon" && field.stat === "attack_power" ? statFieldName(field, "item", { weapon: true }) : statFieldPhraseName(field, "item")}`,
        ]
      : [];
  });
  return phrases.length ? ` Grants ${joinList(phrases.slice(0, 3))}.` : "";
}

function seasonalItemSourcePhrase(ctx: ItemMetaContext): string {
  const during = (seasons: readonly Season[]) =>
    joinList(seasons.map(seasonInSentence));
  const sources = ctx.sources;
  if (!sources) return ` Obtained during ${during(ctx.seasons!)}.`;
  const phrases: string[] = [];
  // Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants sell the season's stock while it runs.
  for (const offer of sources.seasonal)
    phrases.push(
      `Sold by repair merchants during ${during([offer.season])} for ${formatNumber(offer.price)} ${offer.currency_item_name || "gold"}${offer.amount > 1 ? ` per ${formatNumber(offer.amount)} items` : ""}.`,
    );
  // Source: server-scripts/Monster.cs:UpdateServer_IDLE — Halloween monsters hide outside Halloween.
  for (const [seasons, monsters] of Map.groupBy(sources.monsters, (row) =>
    row.seasons.join(","),
  )) {
    const names = [...new Set(monsters.map((row) => row.monster_name))];
    phrases.push(
      `Dropped by ${joinList(names)}${seasons ? ` during ${during(monsters[0].seasons)}` : ""}.`,
    );
  }
  if (sources.quests.length) {
    // Source: server-scripts/Npc.cs:Start — seasonal quest givers are hidden outside their season.
    phrases.push(
      `Rewarded by ${joinList([...new Set(sources.quests.map((row) => row.quest_name))])} during ${during(ctx.seasons!)}.`,
    );
  }
  // Source: server-scripts/PackItem.cs:Use — opening a pack delivers finalAmountReceived of its item.
  for (const pack of sources.packs)
    phrases.push(
      `Found in ${pack.pack_item_name} (${formatNumber(pack.amount)} per pack) during ${during(pack.seasons)}.`,
    );
  return phrases.length
    ? ` ${phrases.join(" ")}`
    : ` Obtained during ${during(ctx.seasons!)}.`;
}

function sourcePhrase(ctx: ItemMetaContext): string {
  if (ctx.recipeIngredients?.length) {
    return ` Crafted from ${joinList(ctx.recipeIngredients.map((i) => `${formatNumber(i.amount)} ${i.item_name}`))}.`;
  }
  const sources = ctx.sources;
  if (!sources) return "";
  if (sources.vendors.length) {
    const vendor = sources.vendors[0];
    return ` Sold by ${vendor.npc_name} for ${formatNumber(vendor.price)} ${vendor.currency_item_name || "gold"}.`;
  }
  const phrases: string[] = [];
  const monsters = new Set(sources.monsters.map((m) => m.monster_id)).size;
  const gathers = new Set(sources.gathers.map((g) => g.resource_id)).size;
  const containers = new Set([
    ...sources.chests.map((c) => `chest:${c.chest_id}`),
    ...sources.packs.map((p) => `pack:${p.pack_item_id}`),
    ...sources.randoms.map((r) => `random:${r.random_item_id}`),
    ...sources.chestItems.map((c) => `item:${c.chest_item_id}`),
  ]).size;
  if (monsters)
    phrases.push(`dropped by ${plural(monsters, "monster", "monsters")}`);
  if (gathers)
    phrases.push(`gathered from ${plural(gathers, "resource", "resources")}`);
  if (containers)
    phrases.push(`found in ${plural(containers, "container", "containers")}`);
  return phrases.length ? ` ${capitalizeFirst(joinList(phrases))}.` : "";
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
  // Source: server-scripts/PotionItem.cs:24-39,165-167 — non-bandage buff
  // levels can use Elixir Endurance; bandages return their base buff level.
  // Source: server-scripts/Pet.cs:2141-2165 — mercenary utility potions
  // resolve that level from the owner's veteran rank.
  const isBandage = item.cooldown_category === "Bandages";
  // Source: server-scripts/PotionItem.cs:8-17,62-146 — health, mana, energy,
  // pet-health, and experience usage values are applied on use.
  const restored: string[] = [];
  if (item.usage_health > 0)
    restored.push(
      `${formatStat("health", item.usage_health)} ${statName("health")}`,
    );
  if (item.usage_mana > 0)
    restored.push(`${formatStat("mana", item.usage_mana)} ${statName("mana")}`);
  if (item.usage_energy > 0)
    restored.push(
      `${formatStat("rage", item.usage_energy)} ${statName("rage")}`,
    );
  if (item.usage_pet_health > 0)
    restored.push(
      `${formatStat("health", item.usage_pet_health)} pet ${statName("health")}`,
    );
  const experience =
    item.usage_experience > 0
      ? ` Grants ${formatNumber(item.usage_experience)} experience when used.`
      : "";
  const restorePhrase =
    restored.length > 0 ? ` Restores ${joinList(restored)}.` : "";
  const buff = item.potion_buff_name
    ? ctx.buffEffect
      ? ` Applies ${ctx.buffEffect.replace(/[.]$/, "")}.`
      : ` ${buffPhrase("Applies", item.potion_buff_name, ctx.buffDurationSeconds)}`
    : "";
  const subtype = isBandage
    ? "Bandage"
    : item.usage_experience > 0
      ? "Scroll"
      : "Potion";
  // Source: server-scripts/PotionItem.cs:160-164 — dungeon-disabled buffs
  // reject use before the buff is applied.
  const dungeon =
    !item.potion_buff_allow_dungeon && item.potion_buff_name
      ? " Cannot be used inside dungeons."
      : "";
  return (
    `${restorePhrase}${experience}${buff}${dungeon}`.trim() || `${subtype}.`
  );
}

function foodDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/FoodItem.cs — applies buffEffect at fixed buffLevel
  const kind = item.food_type === "Drink" ? "Drink" : "Food";
  const buff = item.food_buff_name
    ? ctx.buffEffect
      ? ` Grants ${ctx.buffEffect.replace(/[.]$/, "")}.`
      : ` ${buffPhrase("Grants", item.food_buff_name, ctx.buffDurationSeconds)}`
    : "";
  const dungeon =
    !item.food_buff_allow_dungeon && item.food_buff_name
      ? " Cannot be used inside dungeons."
      : "";
  return `${buff}${dungeon}`.trim() || `${kind}.`;
}

function scrollDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/ScrollItem.cs:11,39-41 — isRepairKit branches the scroll behaviour
  if (item.is_repair_kit) {
    const tier = quality(item);
    return `Repairs all equipped ${tier} or lower gear.`;
  }
  // Source: server-scripts/ScrollItem.cs:Use — the cast rank follows player.scrollMasteryLevel, clamped to the spell's maximum rank.
  const skill = item.scroll_skill_name ?? "a spell";
  return (ctx.scrollSkillMaxRank ?? 1) > 1
    ? `Casts ${skill}. Spell rank scales with the Scroll Mastery profession.`
    : `Casts ${skill}.`;
}

function relicDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RelicItem.cs:12-13,39-46 — ornamentation tokens
  // save armor appearance instead of activating a buff.
  const isOrnament = item.is_ornamentation_token;
  if (isOrnament) {
    return `Saves an armor piece's appearance to your wardrobe collection.`;
  }
  const buffName = item.relic_buff_name ?? "a buff";
  // Source: server-scripts/RelicItem.cs:54-58 — relic buffs apply at
  // buffEffect.maxLevel, not at the relic's own buff_level. We surface base
  // duration only; ctx.buffDurationSeconds is null when no timer is known.
  const dur =
    ctx.buffDurationSeconds && ctx.buffDurationSeconds > 0
      ? ` for ${formatDuration(ctx.buffDurationSeconds)}`
      : "";
  const buff = ` Triggers ${buffName}${dur}.`;
  // Source: server-scripts/RelicItem.cs:20-37 — finite-charge cleanse relics
  // require an active matching cleanseable debuff; CanUse rejects the use
  // before Use can decrement a charge. Infinite-charge relics skip this gate.
  const cleanseGate = ctx.relicIsCleanse
    ? item.infinite_charges
      ? " Has unlimited charges and can be used without a debuff to cleanse."
      : " Usable only while you have a debuff it can cleanse."
    : "";
  const dungeon = !item.relic_buff_allow_dungeon
    ? " Cannot be used inside dungeons."
    : "";
  return `${buff}${cleanseGate}${dungeon}`.trim();
}

function bookDescription(item: Item): string {
  // Source: server-scripts/BookItem.cs, server-scripts/Player.cs:5354-5389 — one-time read,
  // permanent attribute increase, then consumed.
  const gains: string[] = [];
  if (item.book_strength_gain > 0)
    gains.push(
      `${formatStat("strength", item.book_strength_gain, { signed: true })} ${statName("strength", "item")}`,
    );
  if (item.book_dexterity_gain > 0)
    gains.push(
      `${formatStat("dexterity", item.book_dexterity_gain, { signed: true })} ${statName("dexterity", "item")}`,
    );
  if (item.book_constitution_gain > 0)
    gains.push(
      `${formatStat("constitution", item.book_constitution_gain, { signed: true })} ${statName("constitution", "item")}`,
    );
  if (item.book_intelligence_gain > 0)
    gains.push(
      `${formatStat("intelligence", item.book_intelligence_gain, { signed: true })} ${statName("intelligence", "item")}`,
    );
  if (item.book_wisdom_gain > 0)
    gains.push(
      `${formatStat("wisdom", item.book_wisdom_gain, { signed: true })} ${statName("wisdom", "item")}`,
    );
  if (item.book_charisma_gain > 0)
    gains.push(
      `${formatStat("charisma", item.book_charisma_gain, { signed: true })} ${statName("charisma", "item")}`,
    );
  return `Permanently grants ${joinList(gains)}. The book is used up.`;
}

function mountDescription(item: Item): string {
  // Source: server-scripts/MountItem.cs:8 and Player.cs:115-123,596-600.
  return `Mount with a speed of ${formatNumber(item.mount_speed, { decimals: 2 })}.${levelGate(item.level_required)} Cannot be mounted in dungeons or in combat.`;
}

function backpackDescription(item: Item): string {
  // Source: server-scripts/BackpackItem.cs:7,9, server-scripts/PlayerInventory.cs:219-230,641-655 (IsUniqueBackpackAlreadyEquipped)
  // — numSlots adds inventory capacity, and isUnique restricts duplicate equipped backpacks by nameItem.
  const slots = item.backpack_slots > 0 ? item.backpack_slots : 0;
  const slotPhrase =
    slots > 0
      ? ` that adds ${formatNumber(slots)} inventory slots while equipped in your Combined Backpack`
      : "";
  const equipPhrase = item.backpack_is_unique
    ? " You can equip only one copy of it."
    : " You can equip several copies at once.";
  return `Backpack${slotPhrase}.${equipPhrase}`;
}

function packDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/PackItem.cs:6-8,15 — redeems for finalAmountReceived × finalItemReceived
  const contents = ctx.packContents ?? [];
  if (contents.length > 0) {
    const c = contents[0];
    const phrase =
      c.amount > 1 ? `${formatNumber(c.amount)} × ${c.item_name}` : c.item_name;
    return `Redeems for ${phrase}.`;
  }
  return `Redeems for a fixed item bundle.`;
}

function travelDescription(item: Item): string {
  // Source: server-scripts/TravelItem.cs:25-29 — nameDestination=="Bind Point" routes to player bind
  if (item.travel_destination_name === "Bind Point") {
    return `Teleports you to your bind point. Cannot be used inside the Temple of Valaark.`;
  }
  const dest = item.travel_destination_name ?? "a fixed location";
  return `Teleports you to ${dest}. Cannot be used inside the Temple of Valaark.`;
}

function treasureMapDescription(ctx: ItemMetaContext): string {
  // Source: server-scripts/TreasureLocation.cs:119-131,160-163 grants rewardItem.
  const location = ctx.treasureLocation;
  const where = location ? ` in ${location.zone_name}` : "";
  const reward = location?.reward_name;
  return `Treasure map to a dig site${where}. Dig there with a Shovel${reward ? ` to claim ${reward}` : " to claim its reward"}.`;
}

function chestContainerDescription(item: Item): string {
  // Source: server-scripts/ChestItem.cs:24-32,61-66. Duplicate groups can be awarded only once per opening.
  const rewards = JSON.parse(item.chest_rewards || "[]") as Array<{
    probability: number;
    duplicate_group?: number;
    resolution?: "direct" | "uniform_child";
  }>;
  const fixed =
    rewards.length > 0 &&
    rewards.every(
      (reward) =>
        reward.probability >= 1 && reward.resolution !== "uniform_child",
    );
  const n = fixed
    ? Math.min(
        item.chest_num_items,
        new Set(rewards.map((reward, index) => reward.duplicate_group ?? index))
          .size,
      )
    : item.chest_num_items;
  const itemsWord = n === 1 ? "item" : "items";
  return fixed
    ? `Contains ${formatNumber(n)} fixed ${itemsWord}.`
    : `Yields up to ${formatNumber(n)} ${itemsWord} from a chance-based reward pool.`;
}

function randomDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RandomItem.cs:6 — yields one of items[] at random
  const n = ctx.randomOutcomes?.length ?? 0;
  if (n > 0) {
    return `Yields one of ${formatNumber(n)} possible items at random.`;
  }
  return `Yields one item at random from a fixed pool.`;
}

function augmentDescription(item: Item): string {
  // Source: server-scripts/AugmentItem.cs, website/src/routes/items/[id]/+page.svelte:975-1031
  // — set augments grant set bonuses; socketable augments are consumed at a crafting
  // station and can be removed by Augmenter NPCs (5,000g/10,000g/15,000g per quality).
  const q = quality(item);
  if (item.augment_armor_set_name) {
    const attributes = JSON.parse(
      item.augment_attribute_bonuses || "[]",
    ) as Array<{ stat_id: StatId; bonus: number }>;
    const skills = JSON.parse(
      item.augment_skill_bonuses_with_names || "[]",
    ) as Array<{ skill_name: string; level_bonus: number }>;
    // Source: server-scripts/PlayerEquipment.cs:OnEquipmentChanged.
    const attributePhrase = attributes.length
      ? ` 3 pieces: ${joinList(attributes.map((b) => `${formatStat(b.stat_id, b.bonus, { signed: true })} ${statName(b.stat_id, "item")}`))}.`
      : "";
    const skillPhrase = skills.length
      ? ` 5 pieces: ${joinList(skills.map((b) => `${b.skill_name} +${b.level_bonus} ${b.level_bonus === 1 ? "rank" : "ranks"}`))}.`
      : "";
    return `${item.augment_armor_set_name} set bonuses${classRestrictionPhrase(item.class_required)}.${attributePhrase}${skillPhrase}`;
  }
  const target = item.augment_is_defensive ? "armor piece" : "weapon";
  return `${q} ${item.augment_is_defensive ? "armor" : "weapon"} augment.${itemStatPhrase(item)} Socket it into ${target === "armor piece" ? "an armor piece" : "a weapon"} at a crafting station. An Augmenter can remove it.`;
}

function fragmentDescription(item: Item): string {
  // Source: build-pipeline schema — fragment_amount_needed and fragment_result_item_name
  // are populated for items that combine into a higher-tier reward.
  const need =
    item.fragment_amount_needed > 0 ? item.fragment_amount_needed : 0;
  const result = item.fragment_result_item_name;
  if (need > 0 && result) {
    return `Collect ${formatNumber(need)} to combine into ${result}.`;
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
    return `Teaches the recipe for ${taught}.`;
  }
  return `Teaches a crafting recipe.`;
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
  // Source: server-scripts/HousingManager.cs:21-32, server-scripts/Player.cs:13132-13136,12078-12093
  // — players buy a named house, then place CustomStructureItems inside it.
  const price =
    item.structure_price > 0
      ? `${formatNumber(item.structure_price)} gold`
      : "a fixed gold cost";
  return `Furniture. Costs ${price} to place inside a house you own.`;
}

function generalDescription(item: Item, ctx: ItemMetaContext): string {
  if (item.is_chest_key) return chestKeyDescription(item, ctx);
  if (item.is_key) return keyDescription(ctx);
  if (item.is_quest_item) return questItemDescription(item, ctx);
  return generalUsageDescription(item, ctx);
}

function chestKeyDescription(item: Item, ctx: ItemMetaContext): string {
  const opens = ctx.chestKeyOpens;
  if (opens && opens.chestCount > 0) {
    const chestPhrase =
      opens.chestCount === 1
        ? "1 chest"
        : `${formatNumber(opens.chestCount)} chests`;
    const zonePhrase =
      opens.zoneCount === 1
        ? "1 zone"
        : `${formatNumber(opens.zoneCount)} zones`;
    return `Chest key. Opens ${chestPhrase} across ${zonePhrase}.`;
  }
  return `Chest key.`;
}

function keyDescription(ctx: ItemMetaContext): string {
  // Source: server-scripts/Portal.cs:49 and InteractablePortal.cs:101 —
  // portals gated by a key check `player.keys` (or any party member's
  // keyring) for the matching name. Source: server-scripts/ScriptableItem.cs:47
  // — items flagged `isKey` belong in the keyring.
  // Source: server-scripts/PlayerLooting.cs:182-187; ChestItem.cs:51-54; GatherItem.cs:529-532 — these loot paths route keys to the keyring instead of taking an inventory slot.
  // Source: server-scripts/GatherInventoryQuest.cs:21,47 — the keyring also
  // counts as inventory for gather-inventory quest gates that name a key.
  const portals = ctx.usages?.portals ?? [];
  if (portals.length === 0) {
    return `Keyring item.`;
  }
  const portalPhrase =
    portals.length === 1
      ? "1 portal"
      : `${formatNumber(portals.length)} portals`;
  const destinations = new Set(portals.map((p) => p.to_zone_id));
  if (destinations.size === 1) {
    return `Unlocks ${portalPhrase} to ${portals[0].to_zone_name}.`;
  }
  return `Unlocks ${portalPhrase} across ${formatNumber(destinations.size)} zones.`;
}

function questItemDescription(item: Item, ctx: ItemMetaContext): string {
  const quests = [
    ...new Set(ctx.usages?.quests.map((q) => q.quest_name) ?? []),
  ];
  const flags: string[] = [];
  if (!item.sellable) flags.push("sold");
  if (!item.tradable) flags.push("traded");
  if (!item.destroyable) flags.push("destroyed");
  return `Quest item${quests.length ? ` for ${joinList(quests)}` : ""}.${flags.length ? ` Cannot be ${joinList(flags)}.` : ""}`;
}

function generalUsageDescription(item: Item, ctx: ItemMetaContext): string {
  const q = quality(item);
  const sell =
    item.sellable && item.sell_price > 0
      ? ` Sells for ${formatNumber(item.sell_price)} gold.`
      : "";
  const usages = ctx.usages;
  if (!usages) {
    return `${q} item.${sell}${sourcePhrase(ctx)}`;
  }
  const counts: Array<{ category: string; count: number }> = [
    { category: "recipe", count: usages.recipes.length },
    { category: "quest", count: usages.quests.length },
    {
      category: "exchange",
      count: new Set(usages.currency.map((c) => c.purchasable_item_id)).size,
    },
    { category: "altar", count: usages.altars.length },
    { category: "portal", count: usages.portals.length },
    { category: "chest", count: usages.chests.length },
    { category: "merge", count: usages.merges.length },
  ].filter((c) => c.count > 0);
  counts.sort((a, b) => b.count - a.count);
  if (counts.length === 0) {
    return `${q} item.${sell}${sourcePhrase(ctx)}`;
  }
  // Surface up to the top 2 usage categories. One category alone reads as
  // "Used in 5 quests." Two categories share the verb: "Used in 5 quests
  // and 3 recipes." Lower-ranked categories are dropped to keep the
  // description short; users land on the detail page for the full breakdown.
  const top = counts.slice(0, 2);
  const phrases = top.map(
    (c) => `${formatNumber(c.count)} ${pluralize(c.category, c.count)}`,
  );
  const currency = counts.find((c) => c.category === "exchange");
  if (currency && counts.length === 1) {
    return `Currency for ${plural(currency.count, "item", "items")}.${sourcePhrase(ctx)}`;
  }
  return `Used in ${joinList(phrases)}.${sourcePhrase(ctx)}`;
}

function pluralize(category: string, n: number): string {
  switch (category) {
    case "recipe":
      return n === 1 ? "recipe" : "recipes";
    case "quest":
      return n === 1 ? "quest" : "quests";
    case "exchange":
      return n === 1 ? "currency purchase" : "currency purchases";
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
  season?: Season | null;
  type_name: string | null;
  is_boss: boolean;
  is_elite: boolean;
  is_fabled: boolean;
  is_hunt: boolean;
  level_min: number;
  level_max: number;
  health?: number;
  respawn_time?: number;
  death_time?: number;
  does_respawn?: boolean;
  /** Shared, probability-correct drop summary from the loaded page. */
  drop_summary?: string | null;
  triggered_origins?: Array<{
    monster_name: string;
    zone_name?: string | null;
    trigger: "death" | "summon";
  }>;
}

interface AltarSpawnInfo {
  altar_name: string;
  zone_name: string;
}

/**
 * Source: server-scripts/SummonMonster.cs:AreAllPlaceholdersDead — the configured guard group must all be dead.
 */
interface SummonSpawnInfo {
  zone_name: string;
  kill_monster_name: string;
  kill_count: number;
}

export function monsterDescription(
  monster: MonsterDescriptionInput,
  zoneNames: string[],
  altarSpawn: AltarSpawnInfo | null,
  summonSpawn: SummonSpawnInfo | null,
): string {
  // Source: build-pipeline schema — classification flags layer fabled > boss > elite > hunt
  let classification = "";
  if (monster.is_fabled) classification = " Fabled Boss";
  else if (monster.is_boss) classification = " Boss";
  else if (monster.is_elite) classification = " Elite";
  else if (monster.is_hunt) classification = " Hunt Target";

  const species = monster.type_name ?? "Creature";
  const range =
    monster.level_min === monster.level_max
      ? `${monster.level_min}`
      : `${monster.level_min}-${monster.level_max}`;

  const zones = [...new Set(zoneNames)];
  let origin = zones.length
    ? ` Found in ${zones.length <= 3 ? joinList(zones) : `${zones[0]} and ${zones.length - 1} other zones`}.`
    : "";
  if (altarSpawn) {
    origin += ` ${zones.length ? "Also summoned" : "Summoned"} at ${altarSpawn.altar_name} in ${altarSpawn.zone_name}.`;
  }
  if (summonSpawn) {
    const guards =
      summonSpawn.kill_count === 1
        ? `its guard, ${summonSpawn.kill_monster_name}, is dead`
        : `all ${summonSpawn.kill_count} of its ${summonSpawn.kill_monster_name} guards are dead at the same time`;
    origin += ` Appears in ${summonSpawn.zone_name} once ${guards}.`;
  }
  for (const triggered of monster.triggered_origins ?? []) {
    const location = triggered.zone_name ? ` in ${triggered.zone_name}` : "";
    origin +=
      triggered.trigger === "death"
        ? ` Appears where ${triggered.monster_name} dies${location}.`
        : ` Summoned by ${triggered.monster_name}${location}.`;
  }

  // Source: server-scripts/Monster.cs:OnDeath — the respawn deadline follows corpse time plus the respawn timer.
  const respawn =
    monster.does_respawn === false
      ? " Does not respawn."
      : monster.does_respawn === true &&
          monster.respawn_time != null &&
          monster.death_time != null
        ? ` Ready to respawn ${formatDuration(monster.death_time + monster.respawn_time)} after death.`
        : "";
  // Source: server-scripts/Monster.cs:UpdateServer_DEAD — Halloween monsters only spawn while Halloween runs.
  if (monster.season)
    origin += ` Appears only during ${seasonInSentence(monster.season)}.`;
  return `Level ${range} ${species}${classification}.${origin}${monster.drop_summary ? ` ${monster.drop_summary}` : ""}${respawn}`;
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
  is_guild_management: boolean;
  is_renewal_sage: boolean;
  is_teleporter: boolean;
  is_villager: boolean;
  is_barber: boolean;
}

interface NpcDescriptionInput {
  name: string;
  season?: Season | null;
  faction: string | null;
  roles: NpcRoles;
  /** Number of quests offered by this NPC, used in the description tail. */
  questCount?: number;
  level?: number;
  sub_zone_name?: string | null;
  kill_reputation_summary?: string | null;
}

/**
 * Role priority order: most player-facing role first. Quest-giver outranks
 * merchant because that's what users search for; faction vendors outrank plain
 * merchants because the faction context is more specific.
 */
const NPC_ROLE_PRIORITY: Array<keyof NpcRoles> = [
  "is_quest_giver",
  "is_skill_master",
  "is_recruiter_mercenaries",
  "is_faction_vendor",
  "is_merchant",
  "is_essence_trader",
  "is_priestess",
  "is_augmenter",
  "is_barber",
  "is_guild_management",
  "is_renewal_sage",
  "is_teleporter",
  "is_bank",
  "is_inkeeper",
  "is_soul_binder",
  "is_veteran_master",
  "is_reset_attributes",
  "is_taskgiver_adventurer",
  "is_merchant_adventurer",
  "can_repair_equipment",
  "is_guard",
];

function pickPrimaryRole(roles: NpcRoles): {
  label: string;
  others: string[];
} {
  const labels = NPC_ROLE_PRIORITY.filter((flag) => roles[flag]).map((flag) =>
    getRoleLabel(flag),
  );
  return {
    label: labels[0] ?? (roles.is_villager ? "villager" : "NPC"),
    others: labels.slice(1),
  };
}

export function npcDescription(
  npc: NpcDescriptionInput,
  zoneNames: string[],
): string {
  const { label: primaryRole, others } = pickPrimaryRole(npc.roles);
  const primary = capitalizeFirst(primaryRole);

  let location = "";
  if (zoneNames.length === 1) {
    location = ` in ${zoneNames[0]}`;
  } else if (zoneNames.length === 2 || zoneNames.length === 3) {
    location = ` in ${joinList(zoneNames)}`;
  } else if (zoneNames.length > 3) {
    location = ` across ${zoneNames.length} zones`;
  }
  if (npc.sub_zone_name && !zoneNames.includes(npc.sub_zone_name)) {
    location = ` in ${npc.sub_zone_name}${location.replace(/^ in /, ", ")}`;
  }

  const factionPhrase = npc.faction ? ` Member of the ${npc.faction}.` : "";

  const tail: string[] = [];
  const questCount =
    npc.questCount && npc.questCount > 0
      ? ` with ${plural(npc.questCount, "quest", "quests")}`
      : "";
  if (others.length > 0) {
    tail.push(`Also: ${joinList(others)}.`);
  }
  if (npc.kill_reputation_summary) tail.push(npc.kill_reputation_summary);
  const tailPhrase = tail.length > 0 ? ` ${tail.join(" ")}` : "";

  // Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD — seasonal NPCs are hidden outside their season.
  const season = npc.season
    ? ` Present only during ${seasonInSentence(npc.season)}.`
    : "";
  return `${primary}${location}${questCount}.${season}${factionPhrase}${tailPhrase}`;
}

// =============================================================================
// Zones
// =============================================================================

interface ZoneDescriptionInput {
  name: string;
  is_dungeon: boolean;
  level_min: number | null;
  level_max: number | null;
  median_level?: number | null;
  boss_names?: string[];
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
  let levelPhrase = "";
  if (zone.level_min && zone.level_max) {
    levelPhrase =
      zone.level_min === zone.level_max
        ? `level ${zone.level_min}`
        : `levels ${zone.level_min}-${zone.level_max}`;
  }

  const median =
    zone.median_level != null
      ? ` Most monsters are near level ${zone.median_level}.`
      : "";
  const bosses = zone.boss_names?.length
    ? ` Bosses: ${joinList(zone.boss_names)}.`
    : "";
  const head = `${levelPhrase ? `${typeLabel}, ${levelPhrase}.` : `${typeLabel}.`}${median}${bosses}`;
  if (zone.boss_names?.length) return head;

  const contentParts: string[] = [];
  if (counts.boss_count > 0)
    contentParts.push(plural(counts.boss_count, "boss", "bosses"));
  if (counts.elite_count > 0)
    contentParts.push(plural(counts.elite_count, "elite", "elites"));
  if (counts.npc_count > 0)
    contentParts.push(plural(counts.npc_count, "NPC", "NPCs"));
  if (counts.gather_count > 0)
    contentParts.push(plural(counts.gather_count, "resource", "resources"));
  if (counts.chest_count > 0)
    contentParts.push(plural(counts.chest_count, "chest", "chests"));
  if (counts.altar_count > 0)
    contentParts.push(plural(counts.altar_count, "altar", "altars"));

  if (contentParts.length === 0) return head;
  return `${head} Contains ${joinList(contentParts)}.`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${formatNumber(n)} ${n === 1 ? singular : pluralForm}`;
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
  zone_name?: string | null;
}

interface QuestDescriptionInput {
  name: string;
  seasons?: readonly Season[];
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
  if (quest.is_adventurer_quest) return "Adventurer quest";
  if (quest.is_repeatable) return "Repeatable quest";
  return "Quest";
}

/** Keep delivery and report destinations separate from the objective's own location. */
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

/** Concurrent targets keep game-authored names singular, followed by their quantities. */
function renderTargetList(
  verb: string,
  list: ReadonlyArray<{ name: string; amount: number }>,
  collective: string = "items",
): string | null {
  if (list.length === 0) return null;
  if (list.length <= 3) {
    return `${verb} ${joinList(list.map((o) => (o.amount > 1 ? `${o.name} x${formatNumber(o.amount)}` : o.name)))}`;
  }
  const total = list.reduce((sum, o) => sum + Math.max(o.amount, 1), 0);
  return `${verb} ${formatNumber(total)} ${collective}`;
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

  let body: string | null;
  // Discoveries still have a turn-in. Finding the completion NPC is itself the destination.
  let mode: "inline" | "report" | "none" = "report";

  switch (quest.quest_type) {
    case "kill":
      body = renderTargetList("Kill", pickByType("kill"));
      break;
    case "gather":
      // Progress-counter: items don't have to stay in inventory after the
      // threshold is hit, but the player still has to pick them up. "Collect"
      // matches that loop and disambiguates from gather_inventory's "Bring".
      body = renderTargetList("Collect", pickByType("gather"));
      break;
    case "gather_inventory": {
      // The loader distinguishes inventory checks from items consumed at turn-in.
      const have = renderTargetList("Have", pickByType("have"));
      const deliver = renderTargetList("Deliver", pickByType("deliver"));
      const parts: string[] = [];
      if (have) parts.push(`${have}.`);
      if (deliver) parts.push(appendTurnIn(quest, deliver, "inline"));
      else if (have && quest.turn_in_npc_name) {
        parts.push(appendTurnIn(quest, "Report", "inline"));
      }
      return parts.length ? ` ${parts.join(" ")}` : "";
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
      const targets = pickByType(quest.is_find_npc_quest ? "find" : "discover");
      body = renderTargetList(
        quest.is_find_npc_quest ? "Find" : "Discover",
        targets.map((target) => ({
          ...target,
          name: `${target.name}${target.zone_name ? ` in ${target.zone_name}` : ""}`,
        })),
      );
      mode = quest.is_find_npc_quest ? "none" : "report";
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
    quest.level_required > 1 ? ` for level ${quest.level_required}+` : "";
  const objectiveSentence = buildObjectiveSentence(quest, objectives);
  // Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD; server-scripts/PlayerQuests.cs:CanAcceptInternal — seasonal NPC quests can only be accepted during their season and repeatable quests reopen after 8 hours.
  const seasonal = quest.seasons?.length
    ? ` Accept only during ${joinList(quest.seasons.map(seasonInSentence))}.${quest.is_repeatable ? " Repeatable 8 hours after completion." : ""}`
    : "";
  return `${tier}${levelPhrase}.${objectiveSentence}${seasonal}`;
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
  /** Alchemy stores its zero-based tier here. Scribing stores its skill gate. */
  level_required?: number | null;
  /** Zero-based crafting or cooking tier from the loaded recipe. */
  tier?: number | null;
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
      return "cooking oven";
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
  const tier = recipe.type === "Alchemy" ? recipe.level_required : recipe.tier;
  const tierPhrase = tier != null ? `Tier ${toRomanNumeral(tier)} ` : "";
  const levelPhrase =
    recipe.type === "Scribing" && (recipe.level_required ?? 0) > 0
      ? ` requiring ${recipe.level_required}% Scroll Mastery`
      : "";

  const station = humanizeStation(recipe.station_type);
  const stationPhrase = station
    ? ` at ${indefiniteArticle(station)} ${station}`
    : "";

  // Top 2 materials by amount, then "and N more" if there are more.
  const sorted = [...ingredients].sort((a, b) => b.amount - a.amount);
  const topMaterials = sorted
    .slice(0, 2)
    .map((i) =>
      i.amount > 1 ? `${formatNumber(i.amount)} ${i.item_name}` : i.item_name,
    );
  const remaining = Math.max(0, ingredients.length - 2);
  let materialsPhrase = "";
  if (topMaterials.length > 0) {
    if (remaining > 0)
      topMaterials.push(
        `${remaining} more ${remaining === 1 ? "ingredient" : "ingredients"}`,
      );
    materialsPhrase = ` Requires ${joinList(topMaterials)}.`;
  }

  return `${tierPhrase}${tierPhrase ? family : capitalizeFirst(family)} recipe${levelPhrase}${stationPhrase}.${materialsPhrase}`;
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
  /** Effective per-opening probability returned by chestRewardChance(). */
  chest_reward_probability?: number;
  /** Resolved faction display name. Empty means no reputation loss. */
  decrease_faction?: string | null;
  reputation_loss?: number;
}

export function chestDescription(chest: ChestDescriptionInput): string {
  const keyPhrase = chest.key_required_name
    ? ` Opened with ${chest.key_required_name} or Lockpicking.`
    : "";

  // Source: server-scripts/GatherItem.cs:431 uses integer Random.Range.
  const goldMax =
    chest.gold_max > chest.gold_min ? chest.gold_max - 1 : chest.gold_min;
  const rewards: string[] = [];
  if (goldMax > 0) {
    rewards.push(
      chest.gold_min === goldMax
        ? `${formatNumber(goldMax)} gold`
        : `${formatNumber(chest.gold_min)}-${formatNumber(goldMax)} gold`,
    );
  }
  if (chest.item_reward_name) rewards.push(chest.item_reward_name);

  // Source: schema chests.respawn_time — seconds between server-side resets.
  const respawnPhrase =
    chest.respawn_time > 0
      ? ` Respawns every ${formatDuration(chest.respawn_time)}.`
      : "";

  const probability = chest.chest_reward_probability;
  const yieldsPhrase = rewards.length
    ? probability == null
      ? ` Rewards include ${joinList(rewards)}.`
      : probability < 1
        ? ` Each opening has a ${formatPercent(probability, { decimals: 2 })} chance to yield ${joinList(rewards)}.`
        : ` Yields ${joinList(rewards)}.`
    : "";
  const reputation =
    chest.decrease_faction && chest.reputation_loss
      ? ` Opening it costs ${formatNumber(chest.reputation_loss)} ${chest.decrease_faction} reputation.`
      : "";
  return `Chest in ${chest.zone_name}.${keyPhrase}${yieldsPhrase}${reputation}${respawnPhrase}`;
}

// =============================================================================
// Gathering Resources
// =============================================================================

interface GatheringResourceDescriptionInput {
  name: string;
  is_plant: boolean;
  is_fishing_spot: boolean;
  is_mineral: boolean;
  is_radiant_spark: boolean;
  level: number | null;
  tool_required_name?: string | null;
  gathering_exp?: number | null;
  item_reward_name?: string | null;
  item_reward_amount?: number | null;
  item_reward_amount_min?: number | null;
  catches?: string[];
  /** Base and maximum Radiant Seeker chances from the shared gathering model. */
  radiant_chance_min?: number;
  radiant_chance_max?: number;
}

export function gatheringResourceDescription(
  resource: GatheringResourceDescriptionInput,
  zoneNames: string[],
): string {
  let typeLabel: string;
  if (resource.is_fishing_spot) typeLabel = "fishing spot";
  else if (resource.is_radiant_spark) typeLabel = "radiant spark";
  else if (resource.is_mineral) typeLabel = "mineral node";
  else if (resource.is_plant) typeLabel = "plant";
  else typeLabel = "gathering node";

  // Tier numbers exist for plants, minerals, and fishing spots. Radiant sparks
  // scale dynamically with the player's Radiant Seeker profession.
  const hasTier =
    (resource.is_fishing_spot || resource.is_plant || resource.is_mineral) &&
    resource.level != null;
  const tierPhrase = hasTier ? `Tier ${toRomanNumeral(resource.level!)} ` : "";

  const toolPhrase = resource.tool_required_name
    ? ` Requires ${resource.tool_required_name} to gather.`
    : "";

  const rewardName = resource.item_reward_name;
  const rewardAmount = resource.item_reward_amount ?? 1;
  const rewardMin = resource.item_reward_amount_min ?? 1;
  const amount =
    rewardAmount > rewardMin
      ? `${formatNumber(rewardMin)}-${formatNumber(rewardAmount)}`
      : `${formatNumber(rewardAmount)}`;
  const rewardPhrase = resource.is_radiant_spark
    ? rewardName &&
      resource.radiant_chance_min != null &&
      resource.radiant_chance_max != null
      ? ` ${formatPercent(resource.radiant_chance_min, { decimals: 2 })} chance to gather ${rewardName} at 0% Radiant Seeker, rising to ${formatPercent(resource.radiant_chance_max, { decimals: 2 })} at 100%.`
      : ""
    : resource.is_fishing_spot
      ? resource.catches?.length
        ? ` Catches ${joinList(resource.catches)}.`
        : ""
      : rewardName
        ? ` Yields ${amount} ${rewardName} per harvest.`
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
  return `${head}.${rewardPhrase}${toolPhrase}${locationPhrase}`;
}

// =============================================================================
// Skills
// =============================================================================
//
// Ownership adds access or caster context when the effect alone is not enough.
// A single player class is already included in the page title.

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
  season?: Season | null;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string[];
  required_skill_points: number;
  required_spent_points: number;
  is_veteran: boolean;
  base_skill?: boolean;
  prerequisite_skill_name?: string | null;
  prerequisite_level?: number;
  prerequisite2_skill_name?: string | null;
  prerequisite2_level?: number;
  /** Display names resolved from pet_skills, monster_skills and granted_by_items. */
  mercenary_names?: string[];
  pet_names?: string[];
  monster_names?: string[];
  npc_names?: string[];
  npc_count?: number;
  granting_item_names?: string[];
  /** Shared effect summary at the page's initial valid rank. */
  effect_summary?: string | null;
  is_necromancer_blood_pact?: boolean;
  is_necromancer_death_bloom?: boolean;
  is_necromancer_reaper_form?: boolean;
  is_necromancer_pet_buff?: boolean;
  channel_pulses?: number;
  is_familiar?: boolean;
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

function representativeNames(names: string[]): string {
  const unique = [...new Set(names)];
  const top = unique.slice(0, 3);
  if (unique.length > top.length)
    top.push(`${unique.length - top.length} others`);
  return joinList(top);
}

function classesPhrase(classes: string[]): string {
  if (classes.length === 0) return "";
  if (ALL_CLASS_IDS.every((id) => classes.includes(id))) return "all classes";
  const titled = [...classes].sort().map((c) => capitalizeFirst(c));
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

  if (hasClasses) {
    return `Skill for ${classes}`;
  }

  // Mercenary ability before pet ability: a hireable mercenary is more
  // actionable than a familiar/companion locked behind a class skill.
  if (skill.mercenary_user_count > 0) {
    return skill.mercenary_names?.length
      ? `Used by ${representativeNames(skill.mercenary_names)}`
      : "Mercenary ability";
  }
  if (skill.pet_user_count > 0) {
    return skill.pet_names?.length
      ? `Used by ${representativeNames(skill.pet_names)}`
      : "Pet ability";
  }

  // Item-granted spells/buffs — pick the dominant single source where possible
  // so the description points the player at the kind of item they need.
  const g = skill.granted_by;
  const sourceTotal =
    g.scroll + g.potion_buff + g.food_buff + g.relic_buff + g.weapon_proc;
  if (sourceTotal > 0) {
    if (skill.granting_item_names?.length) {
      return `Granted by ${representativeNames(skill.granting_item_names)}`;
    }
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
    return skill.monster_names?.length
      ? `Used by ${representativeNames(skill.monster_names)}`
      : `Monster ability used by ${plural(skill.monster_count, "monster", "monsters")}`;
  }
  if ((skill.npc_count ?? 0) > 0) {
    return skill.npc_names?.length
      ? `Used by ${representativeNames(skill.npc_names)}`
      : `NPC ability used by ${plural(skill.npc_count!, "NPC", "NPCs")}`;
  }

  // Without a known owner, only the skill type is meaningful.
  return null;
}

/** Lead with the effect, followed by its source and meaningful learning requirements. */
export function skillDescription(skill: SkillDescriptionInput): string {
  // Source: server-scripts/Player.cs:Start; server-scripts/EnviromentSystem.cs:CheckSpecialEvents — every online player receives the active season's buff.
  if (skill.season)
    return `${skill.effect_summary ?? "Double XP"}. Granted to every online player during ${seasonInSentence(skill.season)}.`;
  // Source: server-scripts/NecromancerDeathBloomSkill.cs:CorrectedTarget — another living Player or non-familiar Pet only.
  // Source: server-scripts/NecromancerPetBuffSkill.cs:HasLivingCombatPet — owned living combat pet, not a familiar or mercenary.
  // Source: server-scripts/NecromancerReaperFormSkill.cs:Apply — toggles the form buff.
  // Source: server-scripts/SummonSkill.cs:56 — Necromancer non-familiar summons can replace an active pet when MatchesPet is false.
  const typeLabel = skill.is_necromancer_death_bloom
    ? "Hit Points-sacrificing heal for another player or non-familiar pet"
    : skill.is_necromancer_reaper_form
      ? "Toggleable Reaper Form"
      : skill.is_necromancer_pet_buff
        ? "Buff for your active combat pet"
        : (skill.channel_pulses ?? 0) > 0
          ? `Channeled ${formatSkillType(skill.skill_type).toLowerCase()}`
          : skill.skill_type === "summon" &&
              !skill.is_familiar &&
              skill.player_classes.includes("necromancer")
            ? "Summons an undead combat pet and replaces any other active pet"
            : formatSkillType(skill.skill_type);
  const ownership =
    skill.player_classes.length === 1 ? null : skillOwnershipPhrase(skill);

  // The level/cost gate only applies when the player can actually act on it:
  //  - Veteran: cost in veteran points (with spent-points threshold).
  //  - Class skill: minimum character level to learn from a trainer.
  // Non-class owners (pet/mercenary/item/monster) gate at the *source* (the
  // pet's summon skill, the item's level requirement, etc.), not on this
  // skill row, so emitting "Unlocks at level X" there would mislead.
  // Source: server-scripts/PlayerSkills.cs:CanUpgradeVeteran — veteran upgrades check
  //   regular character level, available veteran points, and spent points.
  // Source: server-scripts/PlayerSkills.cs:UserCode_CmdUpgradeVeteran__Int32 — subtracts upgradeRequiredSkillPoints
  //   available veteran points before increasing the skill level.
  // Source: server-scripts/Player.cs:7521-7531 and ScriptableSkill.cs:433-435
  //   — requiredSpentPoints means already-spent veteran points, not veteran
  //   level.
  // Veteran-tree skills with no player classes are mercenary-side veteran
  // skills the player can't learn, so the cost gate is only meaningful when
  // classes are set. Falling through to the class-skill branch in that case
  // would also be wrong — we just skip the gate.
  const isVeteranOwnedByPlayer =
    skill.is_veteran && skill.player_classes.length >= 1;
  const isClassLearned =
    skill.player_classes.length >= 1 && !skill.is_veteran && !skill.base_skill;
  const requirements: string[] = [];
  let cost = "";
  if (isVeteranOwnedByPlayer || isClassLearned) {
    const pointType = skill.is_veteran ? "veteran" : "class skill";
    if (skill.required_skill_points > 1) {
      cost = ` Costs ${skill.required_skill_points} ${pointType} points per rank.`;
    }
    if (skill.level_required > 1)
      requirements.push(`level ${skill.level_required}`);
    if (skill.required_spent_points > 0) {
      requirements.push(
        `${skill.required_spent_points} ${pointType} points already spent`,
      );
    }
    if (skill.prerequisite_skill_name && (skill.prerequisite_level ?? 0) > 0) {
      requirements.push(
        `${skill.prerequisite_skill_name} rank ${skill.prerequisite_level}`,
      );
    }
    if (
      skill.prerequisite2_skill_name &&
      (skill.prerequisite2_level ?? 0) > 0
    ) {
      requirements.push(
        `${skill.prerequisite2_skill_name} rank ${skill.prerequisite2_level}`,
      );
    }
  }
  const gate = requirements.length
    ? ` Requires ${joinList(requirements)}.`
    : "";
  const effect = skill.effect_summary || typeLabel;
  const ownershipPhrase = ownership ? ` ${ownership}.` : "";
  return `${capitalizeFirst(effect.replace(/[.]$/, ""))}.${ownershipPhrase}${cost}${gate}`
    .replace(/[^\S\u202F]+/g, " ")
    .trim();
}

// =============================================================================
// Pets
// =============================================================================
//
// Source: server-scripts/SummonSkill.cs:99; Player.cs:10819-10833,UpdateMercStatsByLevel — familiar level follows
// summoning skill rank, companions match the summoner up to Level.max, and
// mercenaries hire at player level and gain attributes per level.

export interface PetDescriptionInput {
  name: string;
  /** "Mercenary" | "Familiar" | "Companion". Pre-classified by pets.server.ts. */
  kind: "Mercenary" | "Familiar" | "Companion";
  type_monster: string;
  has_buffs: boolean;
  has_heals: boolean;
  level_max: number;
  effective_max_level: number;
  /** The summon skill that creates this pet (familiars/companions). */
  summoning_skill_name: string | null;
  /** Class id of the summoning skill (lowercase, e.g. "druid"). */
  summoning_class_id: string | null;
  /** The mercenary that summons a mercenary companion. */
  summoning_mercenary_name: string | null;
}

// Source: server-scripts/BardMercenarySkills.cs:RefreshAura — Bard songs apply buffs even though the exported pet has_buffs flag is false.
function petRolePhrase(input: PetDescriptionInput): string {
  if (input.kind === "Mercenary" && input.type_monster === "Bard")
    return "Plays songs that buff nearby allies.";
  if (input.has_heals && input.has_buffs) return "Provides heals and buffs.";
  if (input.has_heals) return "Provides heals.";
  if (input.has_buffs) return "Provides buffs.";
  return "";
}

function petOriginPhrase(input: PetDescriptionInput): string {
  const className = input.summoning_class_id
    ? capitalizeFirst(input.summoning_class_id)
    : null;
  switch (input.kind) {
    case "Familiar":
      // Source: server-scripts/SummonSkill.cs:99 — level = skillLevel
      if (input.summoning_skill_name && className) {
        return ` Summoned by the ${input.summoning_skill_name} skill (${className}). Level follows the skill rank, up to rank ${input.effective_max_level}.`;
      }
      return ` Summoned by a class skill. Level follows the skill rank, up to rank ${input.effective_max_level}.`;
    case "Companion":
      // Source: server-scripts/SummonSkill.cs:99 — level = min(petMaxLevel, playerLevel)
      // Source: server-scripts/NecromancerMercenaryPet.cs:RefreshFromSummoner — a mercenary companion takes its owner's level, up to Level.max.
      if (input.summoning_mercenary_name) {
        return ` Companion of the ${input.summoning_mercenary_name}, summoned by ${input.summoning_skill_name ?? "its summon skill"}. Level matches its owner, up to level ${input.level_max}.`;
      }
      if (input.summoning_class_id === "necromancer") {
        return ` Summoned by ${input.summoning_skill_name ? `the Necromancer skill ${input.summoning_skill_name}` : "a Necromancer skill"}. Its level matches yours, up to level ${input.level_max}.`;
      }
      if (input.summoning_skill_name && className) {
        return ` Summoned by the ${className} skill ${input.summoning_skill_name}. Its level matches yours, up to level ${input.level_max}.`;
      }
      return ` Summoned by a class skill. Its level matches yours, up to level ${input.level_max}.`;
    case "Mercenary":
      // Source: server-scripts/Player.cs:10819-10833; Player.cs:UpdateMercStatsByLevel — hired at player level, gains attributes per level
      return " Hire one from any Mercenary Recruiter. Its level matches yours.";
  }
}

export function petDescription(input: PetDescriptionInput): string {
  const origin = petOriginPhrase(input);
  const role = petRolePhrase(input);
  const head =
    input.kind === "Mercenary"
      ? `${input.type_monster} mercenary`
      : `${input.type_monster} ${input.kind.toLowerCase()}`;
  return `${head}.${role ? ` ${role}` : ""}${origin}`;
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
  final_boss_name?: string | null;
  reward_chance?: number;
}

export function altarDescription(altar: AltarDescriptionInput): string {
  const typeLabel =
    altar.type === "avatar" ? "Avatar Altar" : "Forgotten Altar";

  const activationPhrase = altar.required_activation_item_name
    ? ` Activated with ${altar.required_activation_item_name}.`
    : "";

  const wavesPhrase =
    altar.total_waves > 0
      ? ` ${altar.total_waves} waves${altar.final_boss_name ? ` ending with ${altar.final_boss_name}` : ""}.`
      : "";

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
    const chance =
      altar.reward_chance != null
        ? `${formatPercent(altar.reward_chance, { decimals: 2 })} chance per eligible final-wave kill to receive`
        : "Reward:";
    // Source: server-scripts/DefaultEvent.cs:209-237 adds the activating player's level and total veteran points.
    rewardPhrase = altar.uses_veteran_scaling
      ? ` ${chance} ${altar.reward_common_name} through ${legendaryReward}, based on your level plus total veteran points at activation.`
      : ` ${chance} ${altar.reward_common_name} through ${altar.reward_legendary_name}.`;
  }

  return `${typeLabel} in ${altar.zone_name}.${activationPhrase}${wavesPhrase}${levelPhrase}${rewardPhrase}`;
}

// =============================================================================
// Classes
// =============================================================================
//
// Role labels come from curated class metadata.
// Source: server-scripts/Player.cs:1489-1515 — classes display Mana, Rage or Active Songs.

interface ClassDescriptionInput {
  name: string;
  description: string;
  primary_role: string;
  secondary_role: string | null;
  resource_type: string;
}

export function classDescription(klass: ClassDescriptionInput): string {
  const resource = getResourceDisplayName(klass.resource_type);
  const roles = joinList(
    [klass.primary_role, klass.secondary_role].filter((role): role is string =>
      Boolean(role),
    ),
  );
  return `${klass.name} class: ${roles}. Resource: ${resource}. Attribute effects, class skills, and usable weapons and armor.`;
}

// =============================================================================
// Factions
// =============================================================================

export interface FactionDescriptionInput {
  name: string;
  member_count: number;
  monster_source_count: number;
  quest_source_count: number;
  npc_source_count?: number;
  chest_source_count?: number;
  unlock_count: number;
  /** Highest reputation any of this faction's unlocks asks for, 0 when none. */
  top_requirement: number;
  top_requirement_tier: string | null;
}

/** Summarize positive reputation sources and reward thresholds. */
export function factionDescription(faction: FactionDescriptionInput): string {
  const clauses: string[] = [];

  const sources: string[] = [];
  if (faction.monster_source_count > 0)
    sources.push(
      `killing ${plural(faction.monster_source_count, "monster", "monsters")}`,
    );
  if (faction.quest_source_count > 0)
    sources.push(
      `completing ${plural(faction.quest_source_count, "quest", "quests")}`,
    );
  if ((faction.npc_source_count ?? 0) > 0)
    sources.push(`killing ${plural(faction.npc_source_count!, "NPC", "NPCs")}`);
  if ((faction.chest_source_count ?? 0) > 0)
    sources.push(
      `opening ${plural(faction.chest_source_count!, "chest", "chests")}`,
    );
  if (sources.length > 0) {
    clauses.push(`${joinList(sources)} can raise it`);
  }

  if (faction.unlock_count > 0) {
    const gate =
      faction.top_requirement_tier && faction.top_requirement > 0
        ? ` at tiers up to ${faction.top_requirement_tier} (${formatNumber(faction.top_requirement)} reputation)`
        : "";
    clauses.push(
      `${plural(faction.unlock_count, "reward", "rewards")} ${
        faction.unlock_count === 1 ? "unlocks" : "unlock"
      }${gate}`,
    );
  } else {
    clauses.push("no rewards unlock from it");
  }

  return `${faction.name} reputation. ${clauses.map(capitalizeFirst).join(". ")}.`;
}
