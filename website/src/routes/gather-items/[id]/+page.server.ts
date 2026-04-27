import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import {
  getGatheringResourceById,
  getGatheringResourceDrops,
  getGatheringResourceSpawns,
} from "$lib/queries/gather-items.server";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { gatheringResourceDescription } from "$lib/server/meta-description";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const resources = db.prepare("SELECT id FROM gathering_resources").all() as {
    id: string;
  }[];
  db.close();
  return resources.map((r) => ({ id: r.id }));
};

export const load: PageServerLoad = ({ params }) => {
  const resource = getGatheringResourceById(params.id);

  if (!resource) {
    throw error(404, "Gathering resource not found");
  }

  const drops = getGatheringResourceDrops(params.id);
  const spawns = getGatheringResourceSpawns(params.id);

  // Build obtainability tree for tool if one is required
  let toolObtainabilityTree: ObtainabilityNode | null = null;
  if (resource.tool_required_id) {
    const db = new Database(DB_STATIC_PATH, { readonly: true });
    const visited = new Set<string>();
    toolObtainabilityTree = buildObtainabilityTree(
      db,
      resource.tool_required_id,
      1,
      0,
      visited,
      true,
    );
    db.close();
  }

  const zoneNames = spawns.map((s) => s.zone_name);
  const description = gatheringResourceDescription(
    {
      name: resource.name,
      is_plant: resource.is_plant,
      is_mineral: resource.is_mineral,
      is_radiant_spark: resource.is_radiant_spark,
      level: resource.level,
      tool_required_name: resource.tool_required_name,
      gathering_exp: resource.gathering_exp,
      item_reward_name: resource.item_reward_name,
      item_reward_amount: resource.item_reward_amount,
    },
    zoneNames,
  );

  return { resource, drops, spawns, toolObtainabilityTree, description };
};
