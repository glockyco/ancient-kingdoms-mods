import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { getChestById, getChestDrops } from "$lib/queries/gather-items.server";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";

export const prerender = true;

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
    const db = new Database("static/compendium.db", { readonly: true });
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

  return { chest, drops, keyObtainabilityTree };
};
