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
  /** Standing a successful city defense grants, the same for every city. */
  invasionStanding: number;
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
  // Source: server-scripts/RegionalEvents.cs:GrantInvasionReputation — a successful defense raises the invasion's reward faction by its faction reward.
  const amounts = query<{ gain: number }>(
    "SELECT DISTINCT faction_reward AS gain FROM regional_invasions WHERE reward_faction_id IS NOT NULL",
  );
  // The card names one amount. A patch that varies it fails the build instead of publishing a wrong number.
  if (amounts.length !== 1)
    throw new Error(
      `City invasions grant ${amounts.length} different faction rewards`,
    );
  return {
    tiers: getReputationTiers(),
    notableNpcs,
    invasionStanding: amounts[0].gain,
  };
};
