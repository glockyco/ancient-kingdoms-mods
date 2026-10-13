import type { PageServerLoad } from "./$types";
import { getReputationTiers } from "$lib/queries/factions.server";
import type { ReputationTier } from "$lib/utils/reputation";
import { query } from "$lib/db.server";

export const prerender = true;

export interface ReputationMechanicsPageData {
  tiers: ReputationTier[];
  notableNpcs: {
    id: string;
    name: string;
    improveFactions: { id: string; name: string }[];
    decreaseFactions: { id: string; name: string }[];
  }[];
}

export const load: PageServerLoad = (): ReputationMechanicsPageData => {
  const factions = query<{ id: string; name: string }>(
    "SELECT id, name FROM factions",
  );
  // Source: server-scripts/Npc.cs:OnDeath — each Notable NPC applies its own positive and negative faction lists.
  const notableNpcs = query<{
    id: string;
    name: string;
    improve_faction: string;
    decrease_faction: string;
  }>(
    "SELECT id, name, improve_faction, decrease_faction FROM npcs WHERE is_notable = 1 ORDER BY name",
  ).map((npc) => {
    const faction = (name: string) => {
      const match = factions.find((candidate) => candidate.name === name);
      if (!match) throw new Error(`${npc.id} names unknown faction ${name}`);
      return match;
    };
    return {
      id: npc.id,
      name: npc.name,
      improveFactions: (JSON.parse(npc.improve_faction) as string[]).map(
        faction,
      ),
      decreaseFactions: (JSON.parse(npc.decrease_faction) as string[]).map(
        faction,
      ),
    };
  });
  return { tiers: getReputationTiers(), notableNpcs };
};
