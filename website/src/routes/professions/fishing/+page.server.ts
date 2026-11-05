import { getDb } from "$lib/db.server";
import type { PageServerLoad } from "./$types";
import { loadFishingPageData } from "./fishing-page-data.server";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
export const prerender = true;

export const load: PageServerLoad = async () => {
  const db = getDb();

  const data = await loadFishingPageData(db);
  const itemIconPaths = getItemIconPaths(db, [
    ...data.costumePieces.map((item) => item.item_id),
    ...data.rods.map((item) => item.item_id),
    ...data.spots.flatMap((spot) => spot.drops.map((drop) => drop.item_id)),
    ...data.trashFish.map((item) => item.item_id),
    ...Object.values(data.fishPoolsByQuality).flatMap((pool) =>
      pool.map((item) => item.item_id),
    ),
    ...[...data.foods, ...data.potions].flatMap((recipe) => [
      recipe.result_item_id,
      ...recipe.ingredients.map((item) => item.item_id),
    ]),
  ]);
  return { ...data, itemIconPaths };
};
