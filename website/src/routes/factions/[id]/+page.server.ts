import { error } from "@sveltejs/kit";
import { query } from "$lib/db.server";
import {
  getFactionDetail,
  getFactionNav,
  getReputationTiers,
} from "$lib/queries/factions.server";
import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () =>
  query<{ id: string }>("SELECT id FROM factions").map((faction) => ({
    id: faction.id,
  }));

export const load: PageServerLoad = ({ params }) => {
  const faction = getFactionDetail(params.id);
  if (!faction) throw error(404, `Faction not found: ${params.id}`);
  return { faction, tiers: getReputationTiers(), factions: getFactionNav() };
};
