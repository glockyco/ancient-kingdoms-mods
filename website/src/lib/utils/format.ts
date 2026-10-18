import { QUALITY_IDS } from "../constants/quality";

export function distinctSubzoneName(
  zoneName: string | null | undefined,
  subZoneName: string | null | undefined,
): string | undefined {
  if (!subZoneName) return undefined;
  return zoneName?.toLowerCase().replace(/^the /, "") ===
    subZoneName.toLowerCase().replace(/^the /, "")
    ? undefined
    : subZoneName;
}

/** Format a fraction at the caller's displayed precision. */
export function formatPercent(
  value: number,
  {
    decimals,
    trailingZeros = false,
    preserveNonzero = false,
  }: {
    decimals: number;
    trailingZeros?: boolean;
    preserveNonzero?: boolean;
  },
): string {
  const percent = value * 100;
  if (
    preserveNonzero &&
    percent !== 0 &&
    Math.abs(percent) < 0.5 * 10 ** -decimals
  ) {
    return `${percent
      .toLocaleString("en-US", { maximumSignificantDigits: 2 })
      .replace(/^-/, "−")}%`;
  }
  const rounded = percent.toFixed(decimals);
  return `${(trailingZeros ? rounded : String(Number(rounded))).replace(/^-/, "−")}%`;
}

/** Format a number with grouping and a true minus sign. */
export function formatNumber(
  value: number,
  {
    decimals,
    trailingZeros = false,
    grouping = true,
    groupSeparator = ",",
  }: {
    decimals?: number;
    trailingZeros?: boolean;
    grouping?: boolean;
    groupSeparator?: string;
  } = {},
): string {
  const formatted =
    decimals === undefined
      ? value.toLocaleString("en-US", { useGrouping: grouping })
      : grouping
        ? value.toLocaleString("en-US", {
            minimumFractionDigits: trailingZeros ? decimals : 0,
            maximumFractionDigits: decimals,
          })
        : trailingZeros
          ? value.toFixed(decimals)
          : String(Number(value.toFixed(decimals)));
  return formatted.replaceAll(",", groupSeparator).replace(/^-/, "−");
}

/**
 * Format a duration in the reader's units, retaining seconds after whole minutes and hours.
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  const remainingSeconds = seconds - hours * 3600 - minutes * 60;
  let text = hours > 0 ? `${hours}h` : "";
  if (minutes > 0) text += `${text ? " " : ""}${minutes}m`;
  if (remainingSeconds > 0) {
    text += `${text ? " " : ""}${formatNumber(remainingSeconds)}s`;
  }
  return text;
}

/**
 * Maps internal item type identifiers to display names.
 */
const itemTypeDisplayNames: Record<string, string> = {
  ammo: "Ammo",
  armor_set_bonus: "Armor Set Bonus",
  augment: "Augment",
  backpack: "Backpack",
  book: "Book",
  chest: "Chest",
  equipment: "Equipment",
  costume: "Costume",
  food: "Food",
  fragment: "Fragment",
  general: "General",
  merge: "Merge",
  mount: "Mount",
  pack: "Pack",
  pet: "Pet",
  potion: "Potion",
  random: "Random",
  recipe: "Recipe",
  relic: "Relic",
  scroll: "Scroll",
  structure: "Structure",
  travel: "Travel",
  treasure_map: "Treasure Map",
  weapon: "Weapon",
};

/**
 * The type an item is listed and labelled under. The game records an armor
 * set's bonus as an augment that names the set, but it is not an augment a
 * player socketed, so it gets a type of its own.
 */
export function itemListType(item: {
  readonly item_type: string;
  readonly augment_armor_set_name: string | null;
}): string {
  return item.item_type === "augment" && item.augment_armor_set_name
    ? "armor_set_bonus"
    : item.item_type;
}

/**
 * Converts an internal item type to a display-friendly name.
 * Throws an error for unknown types to ensure all types are mapped.
 */
export function formatItemType(type: string | null | undefined): string {
  if (!type) {
    throw new Error("Item type is null or undefined");
  }

  if (type in itemTypeDisplayNames) {
    return itemTypeDisplayNames[type];
  }

  throw new Error(
    `Unknown item type: "${type}". Add it to itemTypeDisplayNames.`,
  );
}

const skillTypeDisplayNames: Record<string, string> = {
  target_damage: "Single-target damage",
  area_damage: "Area damage",
  frontal_damage: "Frontal damage",
  target_projectile: "Single-target projectile",
  frontal_projectiles: "Frontal projectiles",
  target_heal: "Single-target heal",
  area_heal: "Area heal",
  health_to_mana: "Hit Points to Mana",
  target_buff: "Single-target buff",
  area_buff: "Area buff",
  target_debuff: "Single-target debuff",
  area_debuff: "Area debuff",
  passive: "Passive",
  summon: "Summon",
  summon_monsters: "Summon monsters",
  mercenary_summon: "Mercenary summon",
  area_object_spawn: "Area effect",
};

export function formatSkillType(type: string): string {
  return skillTypeDisplayNames[type] ?? type.replaceAll("_", " ");
}

const equipmentCategoryDisplayNames: Record<string, string> = {
  Ammo: "Ammunition",
  Artifact: "Artifact",
  Belt: "Belt",
  Bow: "Bow",
  Bracers: "Bracers",
  Charm: "Charm",
  Chest: "Chest",
  Ear: "Earring",
  Feet: "Feet",
  "Fishing Rod": "Fishing Rod",
  Hands: "Hands",
  Head: "Head",
  Instrument: "Instrument",
  Legs: "Legs",
  Neck: "Necklace",
  Pickaxe: "Pickaxe",
  Ring: "Ring",
  Shield: "Shield",
  Shovel: "Shovel",
  WeaponDagger: "1H Weapon (Light)",
  WeaponSword: "1H Weapon",
  WeaponSword2H: "2H Weapon",
  WeaponWand: "Casting Weapon",
};

/** Convert the game's equipment category to neutral user-facing terminology. */
export function formatEquipmentCategory(category: string): string {
  const displayName = equipmentCategoryDisplayNames[category];
  if (displayName) return displayName;
  throw new Error(
    `Unknown equipment category: "${category}". Add it to equipmentCategoryDisplayNames.`,
  );
}

/**
 * Format spawn time window (e.g., "18:00-06:00")
 * Returns null if spawn time is not limited (0-0 or both same)
 */
export function formatSpawnTimeWindow(
  start: number,
  end: number,
): string | null {
  // 0-0 or both same means no restriction (24h spawn)
  if ((start === 0 && end === 0) || start === end) return null;
  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;
  return `${formatHour(start)}-${formatHour(end)}`;
}

/**
 * Get CSS class for item quality color (uses custom CSS variables)
 * Use for backgrounds/badges
 */
export function getQualityColorClass(quality: number): string {
  const id = QUALITY_IDS[quality];
  if (id) {
    return `text-quality-${id}`;
  }
  return "text-quality-common";
}

/**
 * Get CSS class for item quality text color (brighter, for readability)
 * Use for text/links
 */
export function getQualityTextColorClass(quality: number): string {
  const id = QUALITY_IDS[quality];
  if (id) {
    return `text-quality-text-${id}`;
  }
  return "text-quality-text-common";
}

/** Get the border class that frames an item icon in its quality color. */
export function getQualityBorderClass(quality: number): string {
  return `border-quality-${QUALITY_IDS[quality] ?? "common"}`;
}

/**
 * Format gathering resource respawn time with type-specific logic:
 * - Radiant Sparks: Fixed "1m40s – 1h" range
 * - Minerals: Range from half respawn to full respawn
 * - Plants/Other: Single value
 *
 * @param type - Entity type (gathering_spark, gathering_mineral) or display name (Radiant Spark, Mineral)
 * @param respawnTime - Respawn time in seconds
 */
export function formatGatheringRespawn(
  type: string,
  respawnTime: number,
): string {
  // Source: server-scripts/GatherItem.cs:286-289,379-382 — Random.Range(100f, 3600f)
  if (type === "gathering_spark" || type === "Radiant Spark") {
    return "1m40s – 1h";
  }
  // Source: server-scripts/GatherItem.cs:864-872 — mineral and plant readiness uses Random.Range with half and full timeToWaitReady
  if ((type === "gathering_mineral" || type === "Mineral") && respawnTime > 0) {
    const min = formatDuration(respawnTime / 2);
    const max = formatDuration(respawnTime);
    return `${min} – ${max}`;
  }
  return formatDuration(respawnTime);
}

/**
 * Roman numerals for gathering resource tiers (0-4 maps to I-V)
 */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

/**
 * Converts a gathering resource tier (0-4) to a roman numeral (I-V).
 * Falls back to numeric string for values outside the expected range.
 */
export function toRomanNumeral(tier: number): string {
  if (tier >= 0 && tier < ROMAN_NUMERALS.length) {
    return ROMAN_NUMERALS[tier];
  }
  return String(tier);
}
