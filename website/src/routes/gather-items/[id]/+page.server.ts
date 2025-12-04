import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import {
  getGatheringResourceById,
  getGatheringResourceDrops,
  getGatheringResourceSpawns,
} from "$lib/queries/gather-items.server";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";

export const prerender = true;

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
    const db = new Database("static/compendium.db", { readonly: true });
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

  return { resource, drops, spawns, toolObtainabilityTree };
};
