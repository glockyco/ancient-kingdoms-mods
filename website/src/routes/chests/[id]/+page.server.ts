import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { getChestById, getChestDrops } from "$lib/queries/gather-items.server";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { chestDescription } from "$lib/server/meta-description";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const chests = db.prepare("SELECT id FROM chests").all() as { id: string }[];
  db.close();
  return chests.map((c) => ({ id: c.id }));
};

export const load: PageServerLoad = ({ params }) => {
  const chest = getChestById(params.id);

  if (!chest) {
    throw error(404, "Chest not found");
  }

  // Get chest drops
  const drops = getChestDrops(params.id);

  // Build obtainability tree for key if one is required
  let keyObtainabilityTree: ObtainabilityNode | null = null;
  if (chest.key_required_id) {
    const db = new Database(DB_STATIC_PATH, { readonly: true });
    const visited = new Set<string>();
    keyObtainabilityTree = buildObtainabilityTree(
      db,
      chest.key_required_id,
      1,
      0,
      visited,
      true,
    );
    db.close();
  }

  const description = chestDescription({
    zone_name: chest.zone_name,
    key_required_name: chest.key_required_name,
    gold_min: chest.gold_min,
    gold_max: chest.gold_max,
    item_reward_name: chest.item_reward_name,
    respawn_time: chest.respawn_time,
  });

  return { chest, drops, keyObtainabilityTree, description };
};
