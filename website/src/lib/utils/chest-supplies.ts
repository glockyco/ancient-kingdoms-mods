export type SupplyPool = "potion" | "utility_potion" | "scroll";

export interface SupplyItem {
  pool: SupplyPool;
  item_id: string;
  level_required: number;
  /** Classes that can use the item; empty means every class. */
  class_ids: readonly string[];
}

export interface SupplyChance {
  item_id: string;
  pool: SupplyPool;
  chance: number;
}

function highestTier(items: readonly SupplyItem[]): SupplyItem[] {
  const top = Math.max(...items.map((item) => item.level_required));
  return items.filter((item) => item.level_required === top);
}

/**
 * The chance of each item one looted opening adds for a character.
 *
 * Source: server-scripts/WorldChestSupplies.cs:Roll,Pick — a third of the potion
 * chance tries the highest usable utility tier and falls back to potions when
 * none is usable. Potions use the highest usable tier, scrolls every usable one,
 * each chosen uniformly.
 */
export function supplyChances(
  items: readonly SupplyItem[],
  potionChance: number,
  scrollChance: number,
  level: number,
  classId: string,
): SupplyChance[] {
  const eligible = (pool: SupplyPool) =>
    items.filter(
      (item) =>
        item.pool === pool &&
        item.level_required <= level &&
        (item.class_ids.length === 0 || item.class_ids.includes(classId)),
    );
  const potions = eligible("potion");
  const utility = eligible("utility_potion");
  const scrolls = eligible("scroll");
  const utilityShare = utility.length > 0 ? potionChance / 3 : 0;
  const result: SupplyChance[] = [];
  const spread = (pool: SupplyItem[], total: number) => {
    for (const item of pool)
      result.push({
        item_id: item.item_id,
        pool: item.pool,
        chance: total / pool.length,
      });
  };
  if (utility.length > 0) spread(highestTier(utility), utilityShare);
  if (potions.length > 0)
    spread(highestTier(potions), potionChance - utilityShare);
  if (scrolls.length > 0) spread(scrolls, scrollChance);
  return result.sort((a, b) => b.chance - a.chance);
}
