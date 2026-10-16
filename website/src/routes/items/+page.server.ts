import { getItems, getItemZones } from "$lib/queries/items.server";
import { itemListType } from "$lib/utils/format";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const rawItems = getItems();
  const itemZones = getItemZones();

  // Precompute parsed arrays at build time (avoids JSON.parse on client)
  const itemStatKeys: Record<string, string[]> = {};
  const itemStatValues: Record<string, Record<string, number>> = {};
  const itemClassKeys: Record<string, string[]> = {};
  for (const item of rawItems) {
    itemStatKeys[item.id] = JSON.parse(item.stat_keys) as string[];
    itemStatValues[item.id] = Object.fromEntries(
      Object.entries(
        JSON.parse(item.stats || "{}") as Record<string, unknown>,
      ).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
    try {
      const classes = JSON.parse(item.class_required);
      itemClassKeys[item.id] = Array.isArray(classes) ? classes : [];
    } catch {
      itemClassKeys[item.id] = [];
    }
  }

  // Strip bulky JSON fields - we use the precomputed maps instead
  const items = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    visual_public_path: item.visual_public_path,
    item_type: itemListType(item),
    quality: item.quality,
    level_required: item.level_required,
    item_level: item.item_level,
    slot: item.slot,
    backpack_slots: item.backpack_slots,
    backpack_is_unique: item.backpack_is_unique,
    stat_count: item.stat_count,
    alchemy_recipe_level_required: item.alchemy_recipe_level_required,
    mount_speed: item.mount_speed,
    augment_is_defensive: item.augment_is_defensive,
    augment_armor_set_name: item.augment_armor_set_name,
  }));

  return { items, itemStatKeys, itemStatValues, itemClassKeys, itemZones };
};
