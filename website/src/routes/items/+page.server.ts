import { getItems } from "$lib/queries/items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const rawItems = getItems();

  // Precompute parsed arrays at build time (avoids JSON.parse on client)
  const itemStatKeys: Record<string, string[]> = {};
  const itemClassKeys: Record<string, string[]> = {};
  for (const item of rawItems) {
    itemStatKeys[item.id] = JSON.parse(item.stat_keys) as string[];
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
    item_type: item.item_type,
    quality: item.quality,
    level_required: item.level_required,
    item_level: item.item_level,
    slot: item.slot,
    backpack_slots: item.backpack_slots,
    stat_count: item.stat_count,
    alchemy_recipe_level_required: item.alchemy_recipe_level_required,
    mount_speed: item.mount_speed,
    tooltip_html: item.tooltip_html,
  }));

  return { items, itemStatKeys, itemClassKeys };
};
