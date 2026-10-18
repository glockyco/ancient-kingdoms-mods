import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { getChestById, getChestDrops } from "$lib/queries/gather-items.server";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { chestDescription } from "$lib/server/meta-description";
import { queryOne } from "$lib/db.server";
import { commonItemProbability } from "$lib/utils/primary-rewards";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const chests = db.prepare("SELECT id FROM chests").all() as { id: string }[];
  db.close();
  return chests.map((c) => ({ id: c.id }));
};

export const load: PageServerLoad = async ({ params }) => {
  const chest = await getChestById(params.id);

  if (!chest) {
    throw error(404, "Chest not found");
  }

  // Get chest drops
  const drops = getChestDrops(params.id);

  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const acquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: [{ kind: "chests", id: params.id }],
  });
  const acquisitionMethods = [...acquisition.methodViews.values()];
  for (const drop of drops) {
    drop.actual_drop_chance = commonItemProbability(
      acquisitionMethods.filter(
        (method) =>
          method.kind === "world_chest" && method.detail.chest_id === chest.id,
      ),
      drop.item_id,
      "successful_opening",
    );
  }
  const acquisitionItems = await loadAcquisitionItems(execute, acquisition);
  db.close();

  const description = chestDescription({
    zone_name: chest.zone_name,
    keys: chest.keys,
    primaryRewards: chest.primaryRewards,
    respawn_time: chest.respawn_time,
    decrease_faction: queryOne<{ decrease_faction: string }>(
      "SELECT decrease_faction FROM chests WHERE id = ?",
      [params.id],
    )?.decrease_faction,
    reputation_loss: 200,
  });

  return {
    chest,
    drops,
    description,
    acquisitionMethods,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(acquisition),
  };
};
