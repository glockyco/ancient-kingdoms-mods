import { error } from "@sveltejs/kit";
import { query } from "$lib/db.server";
import {
  getFactionDetail,
  getFactionNav,
  getReputationTiers,
} from "$lib/queries/factions.server";
import { factionDescription } from "$lib/server/meta-description";
import { reputationTierName } from "$lib/utils/reputation";
import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () =>
  query<{ id: string }>("SELECT id FROM factions").map((faction) => ({
    id: faction.id,
  }));

export const load: PageServerLoad = ({ params }) => {
  const faction = getFactionDetail(params.id);
  if (!faction) throw error(404, `Faction not found: ${params.id}`);

  const tiers = getReputationTiers();

  // Highest bar any unlock sets, so the description can name what the long
  // grind is actually for. Houses and items carry their own thresholds; the
  // vendor gate is a flat 15,000 that is not stored per row.
  const requirements = [
    ...faction.gatedItems.map((item) => item.faction_required_to_buy),
    ...faction.houses.map((house) => house.faction_required),
    ...faction.questRequirements.map((quest) => quest.required_value),
    ...(faction.vendors.length > 0 ? [15000] : []),
  ];
  const topRequirement =
    requirements.length > 0 ? Math.max(...requirements) : 0;

  const description = factionDescription({
    name: faction.name,
    member_count: faction.members.length,
    monster_source_count: faction.monstersImprove.length,
    quest_source_count: faction.questGrants.length,
    unlock_count:
      faction.gatedItems.length +
      faction.houses.length +
      faction.questRequirements.length,
    top_requirement: topRequirement,
    top_requirement_tier:
      topRequirement > 0 ? reputationTierName(tiers, topRequirement) : null,
  });

  return { faction, tiers, factions: getFactionNav(), description };
};
