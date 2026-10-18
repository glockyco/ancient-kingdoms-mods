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
import { detailTitle, type DetailTitleContext } from "$lib/seo/title";
import { getRoleLabel } from "$lib/utils/roles";
import type { PrimaryReward } from "$lib/utils/primary-rewards";

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
import type {
  ItemSourceView,
  ItemUseView,
  RequirementRoot,
} from "$lib/acquisition/types";
import { describeRequirement } from "$lib/acquisition/conditions";

/** Optional pre-loaded data the description may incorporate. */
export interface ItemMetaContext {
  usages?: readonly ItemUseView[];
  requirements?: readonly RequirementRoot[];
  /** Pack contents pre-joined with item names. */
  packContents?: Array<{ item_name: string; amount: number }>;
  /** Random-container outcomes pre-joined with item names. */
  randomOutcomes?: Array<{ item_name: string }>;
  /** Actual merge output name. */
  mergeResultName?: string | null;
  /**
   * Base duration of the linked buff in seconds, if the item applies one
   * (potions/food/relics). Source: skills.duration_base on the row keyed
   * by potion_buff_id / food_buff_id / relic_buff_id. We only surface the
   * base value because PotionItem.GetBuffLevelWithElixirEndurance resolves
   * the applied level at use time (server-scripts/PotionItem.cs:24-39,
   * 143-145). Non-bandage potions can use Elixir Endurance; bandages keep
   * their base buff level. Mercenary utility potions pass the owner's Player
   * (server-scripts/Pet.cs:2120-2144), so that owner's veteran rank applies.
   * We cannot predict that runtime rank at SSR time.
   */
  buffDurationSeconds?: number | null;
  /** Whether the linked relic buff is a cleanse spell. */
  relicIsCleanse?: boolean;
  /** Complete shared effect summary, including its duration, at the applied buff rank. */
  buffEffect?: string | null;
  /** Loaded treasure_locations row for this map. */
  treasureLocation?: { zone_name: string; reward_name: string | null } | null;
  sources?: ItemSourceView;
  /** Ingredients of the representative crafting recipe loaded for the item. */
  recipeIngredients?: readonly { item_name: string; amount: number }[];
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

function levelGate(level: number): string {
  return level > 1 ? ` Requires level ${level}.` : "";
}

function requirementPhrase(ctx: ItemMetaContext): string {
  const descriptions = (ctx.requirements ?? [])
    .flatMap((root) => describeRequirement(root))
    .map((description) => description.text.replace(/[.]$/, ""));
  return descriptions.length
    ? ` Requirements: ${descriptions.join(". ")}.`
    : "";
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

/** Compute the page title for an item detail page. */
export function itemTitle(item: Item, context?: DetailTitleContext): string {
  return detailTitle(item.name, context);
}

// ---------------------------------------------------------------------------
// Description — 21+ branches, one per item_type with sub-branches
// ---------------------------------------------------------------------------

export function itemDescription(item: Item, ctx: ItemMetaContext = {}): string {
  return itemDescriptionText(item, ctx) + requirementPhrase(ctx);
}

function itemDescriptionText(item: Item, ctx: ItemMetaContext): string {
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
      return scrollDescription(item);
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
  const level = levelGate(item.level_required);
  // Source: server-scripts/WeaponItem.cs — weapon_proc_effect_id triggers on hit
  const proc = item.weapon_proc_effect_name
    ? ` Procs ${item.weapon_proc_effect_name} on hit.`
    : "";
  return `${q} ${cat}.${level}${itemStatPhrase(item)}${proc}`;
}

function equipmentDescription(item: Item): string {
  const q = quality(item);
  const slot = item.slot ?? "";
  const displaySlot = equipmentNoun(slot, "equipment");
  const level = levelGate(item.level_required);
  if (ARMOR_SLOTS.has(slot)) {
    const noun = ["Shield", "Bracers", "Belt"].includes(slot)
      ? displaySlot
      : `${displaySlot} armor`;
    return `${q} ${noun}.${level}${itemStatPhrase(item)}`;
  }
  if (JEWELRY_SLOTS.has(slot)) {
    return `${q} ${displaySlot}.${level}${itemStatPhrase(item)}`;
  }
  return `${q} ${displaySlot}.${level}${itemStatPhrase(item)}`;
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

function sourcePhrase(ctx: ItemMetaContext): string {
  if (ctx.recipeIngredients?.length) {
    return ` Crafted from ${joinList(ctx.recipeIngredients.map((i) => `${formatNumber(i.amount)} ${i.item_name}`))}.`;
  }
  const sources = ctx.sources;
  if (!sources) return "";
  const vendor = sources.methods.find((method) => method.kind === "vendor");
  if (vendor) {
    const costs = vendor.costGroups.flatMap((group) => group.inputs);
    const gold = costs.find((input) => input.resource_kind === "gold");
    const providers = vendor.providers.map((provider) => provider.name);
    return ` Sold by ${joinList(providers)}${gold ? ` for ${formatNumber(gold.amount)} gold` : ""}.`;
  }
  const phrases: string[] = [];
  const monsters = new Set(
    sources.methods
      .filter((method) => method.kind === "kill")
      .flatMap((method) => method.providers.map((provider) => provider.ref.id)),
  ).size;
  const gathers = new Set(
    sources.methods
      .filter((method) => method.kind === "gather")
      .flatMap((method) => method.providers.map((provider) => provider.ref.id)),
  ).size;
  const containers = sources.methods.filter(
    (method) =>
      method.kind === "world_chest" ||
      method.kind === "portable_chest" ||
      method.kind === "pack_use",
  ).length;
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
  // Source: server-scripts/PotionItem.cs:24-39,143-145 — non-bandage buff
  // levels can use Elixir Endurance; bandages return their base buff level.
  // Source: server-scripts/Pet.cs:2120-2144 — mercenary utility potions
  // resolve that level from the owner's veteran rank.
  const isBandage = item.cooldown_category === "Bandages";
  // Source: server-scripts/PotionItem.cs:8-17,41-124 — health, mana, energy,
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
  // Source: server-scripts/PotionItem.cs:138-142 — dungeon-disabled buffs
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

function scrollDescription(item: Item): string {
  // Source: server-scripts/ScrollItem.cs:11,39 — isRepairKit branches the scroll behaviour
  if (item.is_repair_kit) {
    const tier = quality(item);
    return `Repairs all equipped ${tier} or lower gear.`;
  }
  // Source: server-scripts/ScrollItem.cs:125,117 — spell rank scales with player.scrollMasteryLevel
  const skill = item.scroll_skill_name ?? "a spell";
  return `Casts ${skill}. Spell rank scales with the Scroll Mastery profession.`;
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
  // Source: server-scripts/BookItem.cs, server-scripts/Player.cs:5306-5341 — one-time read,
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
  // Source: server-scripts/MountItem.cs:8 and Player.cs:115-123,588-592.
  return `Mount with a speed of ${formatNumber(item.mount_speed, { decimals: 2 })}.${levelGate(item.level_required)} Cannot be mounted in dungeons or in combat.`;
}

function backpackDescription(item: Item): string {
  // Source: server-scripts/BackpackItem.cs:7,9, server-scripts/PlayerInventory.cs:203-214,604-618 (IsUniqueBackpackAlreadyEquipped)
  // — numSlots adds inventory capacity, and isUnique restricts duplicate equipped backpacks by nameItem.
  const slots = item.backpack_slots > 0 ? item.backpack_slots : 0;
  const slotPhrase =
    slots > 0
      ? ` that adds ${slots} inventory slots while equipped in your Combined Backpack`
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
    const phrase = c.amount > 1 ? `${c.amount} × ${c.item_name}` : c.item_name;
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
  // Source: server-scripts/TreasureLocation.cs:117-129,158-161 grants rewardItem.
  const location = ctx.treasureLocation;
  const where = location ? ` in ${location.zone_name}` : "";
  const reward = location?.reward_name;
  return `Treasure map to a dig site${where}. Dig there with a Shovel${reward ? ` to claim ${reward}` : " to claim its reward"}.`;
}

function chestContainerDescription(item: Item): string {
  // Source: server-scripts/ChestItem.cs:24-32,61-66 — guaranteed rolls produce fixed contents, otherwise chance rolls stop at the opening limit or after ten passes.
  const rewards = JSON.parse(item.chest_rewards || "[]") as Array<{
    probability: number;
  }>;
  const fixed =
    rewards.length > 0 && rewards.every((reward) => reward.probability >= 1);
  const n = fixed
    ? Math.min(item.chest_num_items, rewards.length)
    : item.chest_num_items;
  const itemsWord = n === 1 ? "item" : "items";
  return fixed
    ? `Contains ${n} fixed ${itemsWord}.`
    : `Yields up to ${n} ${itemsWord} from a chance-based reward pool.`;
}

function randomDescription(item: Item, ctx: ItemMetaContext): string {
  // Source: server-scripts/RandomItem.cs:6 — yields one of items[] at random
  const n = ctx.randomOutcomes?.length ?? 0;
  if (n > 0) {
    return `Yields one of ${n} possible items at random.`;
  }
  return `Yields one item at random from a fixed pool.`;
}

function augmentDescription(item: Item): string {
  // Source: server-scripts/AugmentItem.cs. Set augments grant set bonuses.
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
    return `${item.augment_armor_set_name} set bonuses.${attributePhrase}${skillPhrase}`;
  }
  return `${q} equipment augment.${itemStatPhrase(item)} Socket it into compatible equipment at a crafting station. An Augmenter can remove it.`;
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
  // Source: server-scripts/HousingManager.cs:21-32, server-scripts/Player.cs:13012-13016,11958-11973
  // — players buy a named house, then place CustomStructureItems inside it.
  const price =
    item.structure_price > 0
      ? `${formatNumber(item.structure_price)} gold`
      : "a fixed gold cost";
  return `Furniture. Costs ${price} to place inside a house you own.`;
}

function generalDescription(item: Item, ctx: ItemMetaContext): string {
  if (item.is_chest_key) return chestKeyDescription(ctx);
  if (item.is_key) return keyDescription(ctx);
  if (item.is_quest_item) return questItemDescription(item, ctx);
  return generalUsageDescription(item, ctx);
}

function chestKeyDescription(ctx: ItemMetaContext): string {
  const chests = new Set<string>();
  const zones = new Set<string>();
  let zonesKnown = true;
  for (const use of ctx.usages ?? []) {
    if (use.method?.kind !== "world_chest") continue;
    for (const provider of use.method.providers) {
      if (provider.ref.kind !== "chests") continue;
      chests.add(provider.ref.id);
      if (provider.location?.zoneId) zones.add(provider.location.zoneId);
      else zonesKnown = false;
    }
  }
  if (!chests.size) return "Chest key.";
  const chestPhrase = chests.size === 1 ? "1 chest" : `${chests.size} chests`;
  const zonePhrase =
    zonesKnown && zones.size
      ? ` across ${zones.size === 1 ? "1 zone" : `${zones.size} zones`}`
      : "";
  return `Chest key. Opens ${chestPhrase}${zonePhrase}.`;
}

function keyDescription(ctx: ItemMetaContext): string {
  // Source: server-scripts/Portal.cs:49 and InteractablePortal.cs:101 —
  // portals gated by a key check `player.keys` (or any party member's
  // keyring) for the matching name. Source: server-scripts/ScriptableItem.cs:47
  // — items flagged `isKey` are routed to the keyring (`player.AddKey(...)`)
  // by every loot path (PlayerLooting.cs:146, ChestItem.cs:50,
  // GatherItem.cs:455, …) instead of taking an inventory slot.
  // Source: server-scripts/GatherInventoryQuest.cs:21,47 — the keyring also
  // counts as inventory for gather-inventory quest gates that name a key.
  const portals = new Set(
    ctx.usages
      ?.filter((use) => use.entity?.kind === "portal")
      .map((use) => use.entity!.id) ?? [],
  );
  return portals.size
    ? `Keyring item required by ${plural(portals.size, "portal", "portals")}.`
    : "Keyring item.";
}

function questItemDescription(item: Item, ctx: ItemMetaContext): string {
  const quests = [
    ...new Set(
      ctx.usages
        ?.filter((use) => use.entity?.kind === "quest")
        .map((use) => use.entity!.id.replaceAll("_", " ")) ?? [],
    ),
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
    {
      category: "recipe",
      count: new Set(
        usages
          .filter((use) => use.method?.kind === "recipe")
          .map((use) => use.method!.methodId),
      ).size,
    },
    {
      category: "quest",
      count: new Set(
        usages
          .filter((use) => use.entity?.kind === "quest")
          .map((use) => use.entity!.id),
      ).size,
    },
    {
      category: "exchange",
      count: new Set(
        usages
          .filter(
            (use) =>
              use.method?.kind === "vendor" ||
              use.method?.kind === "essence" ||
              use.method?.kind === "blessing",
          )
          .map((use) => use.method!.methodId),
      ).size,
    },
    {
      category: "altar",
      count: new Set(
        usages
          .filter((use) => use.method?.kind === "altar_activate")
          .map((use) => use.method!.methodId),
      ).size,
    },
    {
      category: "portal",
      count: new Set(
        usages
          .filter((use) => use.entity?.kind === "portal")
          .map((use) => use.entity!.id),
      ).size,
    },
    {
      category: "chest",
      count: new Set(
        usages
          .filter((use) => use.method?.kind === "world_chest")
          .map((use) => use.method!.methodId),
      ).size,
    },
    {
      category: "merge",
      count: new Set(
        usages
          .filter((use) => use.method?.kind === "merge")
          .map((use) => use.method!.methodId),
      ).size,
    },
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
    (c) => `${c.count} ${pluralize(c.category, c.count)}`,
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
 * The fixed guard group checked by server-scripts/SummonMonster.cs:73-93.
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

  // Source: server-scripts/Monster.cs:OnDeath - the respawn deadline follows corpse time plus the respawn timer.
  const respawn =
    monster.does_respawn === false
      ? " Does not respawn."
      : monster.does_respawn === true &&
          monster.respawn_time != null &&
          monster.death_time != null
        ? ` Ready to respawn ${formatDuration(monster.death_time + monster.respawn_time)} after death.`
        : "";
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

  return `${primary}${location}${questCount}.${factionPhrase}${tailPhrase}`;
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
  zone_name?: string | null;
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
  return `${tier}${levelPhrase}.${objectiveSentence}`;
}

// =============================================================================
// Chests
// =============================================================================

interface ChestDescriptionInput {
  zone_name: string;
  keys: readonly { itemName: string | null; withheld: boolean }[];
  primaryRewards: readonly PrimaryReward[];
  respawn_time: number;
  /** Resolved faction display name. Empty means no reputation loss. */
  decrease_faction?: string | null;
  reputation_loss?: number;
}

export function chestDescription(chest: ChestDescriptionInput): string {
  const keyNames = [
    ...new Set(
      chest.keys
        .map((key) => (key.withheld ? "an unpublished key" : key.itemName))
        .filter((name): name is string => name !== null),
    ),
  ];
  const keyPhrase = keyNames.length
    ? ` Key options include ${joinList(keyNames)}.`
    : "";
  const rewards = chest.primaryRewards.map(primaryRewardDescription);

  // Source: schema chests.respawn_time — seconds between server-side resets.
  const respawnPhrase =
    chest.respawn_time > 0
      ? ` Respawns every ${formatDuration(chest.respawn_time)}.`
      : "";

  const yieldsPhrase = rewards.length
    ? ` Potential rewards include ${joinList(rewards)}.`
    : "";
  const reputation =
    chest.decrease_faction && chest.reputation_loss
      ? ` Opening it costs ${formatNumber(chest.reputation_loss)} ${chest.decrease_faction} reputation.`
      : "";
  return `Chest in ${chest.zone_name}.${keyPhrase}${yieldsPhrase}${reputation}${respawnPhrase}`;
}

function primaryRewardDescription(reward: PrimaryReward): string {
  const name = reward.withheld
    ? "an unpublished reward"
    : reward.resourceKind === "gold"
      ? "gold"
      : (reward.itemName ?? "an unidentified reward");
  const quantity = reward.quantity;
  const amount =
    quantity.kind === "exact"
      ? formatNumber(quantity.value)
      : quantity.kind === "range"
        ? quantity.max === null
          ? `at least ${formatNumber(quantity.min)}`
          : `${formatNumber(quantity.min)}-${formatNumber(quantity.max)}`
        : "an unknown amount of";
  const delivery =
    reward.delivery === "quest_progress"
      ? " as quest progress"
      : reward.delivery === "keyring"
        ? " in the key ring"
        : "";
  return `${amount} ${name}${delivery}`;
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
  primaryRewards: readonly PrimaryReward[];
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

  const rewards = resource.primaryRewards.map(primaryRewardDescription);
  const rewardNames = [
    ...new Set(
      resource.primaryRewards.flatMap((reward) =>
        reward.itemName ? [reward.itemName] : [],
      ),
    ),
  ];
  const rewardPhrase = resource.is_radiant_spark
    ? rewardNames.length &&
      resource.radiant_chance_min != null &&
      resource.radiant_chance_max != null
      ? ` ${formatPercent(resource.radiant_chance_min, { decimals: 2 })} chance to gather ${joinList(rewardNames)} at 0% Radiant Seeker, rising to ${formatPercent(resource.radiant_chance_max, { decimals: 2 })} at 100%.`
      : ""
    : resource.is_fishing_spot
      ? resource.catches?.length
        ? ` Catches ${joinList(resource.catches)}.`
        : ""
      : rewards.length
        ? ` Harvest rewards include ${joinList(rewards)}.`
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

  // Truly orphan: no class, no pet, no item, no monster. The type label
  // alone is the only honest signal.
  return null;
}

/** Lead with the effect, followed by its source and meaningful learning requirements. */
export function skillDescription(skill: SkillDescriptionInput): string {
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
  // Source: server-scripts/Player.cs:7439-7449 and ScriptableSkill.cs:237-239
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
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// Pets
// =============================================================================
//
// Source: server-scripts/SummonSkill.cs:99; Player.cs:10703-10717,UpdateMercStatsByLevel — familiar level follows
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
      // Source: server-scripts/Player.cs:10703-10717; Player.cs:UpdateMercStatsByLevel — hired at player level, gains attributes per level
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
        ? `${formatPercent(altar.reward_chance, { decimals: 2 })} chance to receive`
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
// Source: server-scripts/Player.cs:1477-1503 — classes display Mana, Rage or Active Songs.

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
