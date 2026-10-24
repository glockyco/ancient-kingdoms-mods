import type { PageServerLoad } from "./$types";
import {
  getRegionalCookingDishes,
  getRegionalEventRegions,
  getRegionalEventSettings,
  getRegionalHuntTargets,
  getRegionalInvasions,
  getRegionalInvasionAttackers,
} from "$lib/queries/regional-events.server";

export const prerender = true;

export const load = (() => {
  const attackers = getRegionalInvasionAttackers();
  const regions = getRegionalEventRegions();
  const dishes = getRegionalCookingDishes();
  return {
    settings: getRegionalEventSettings(),
    invasions: getRegionalInvasions().map((invasion) => {
      const cookingRegion = regions.find(
        (region) => region.cooking_city === invasion.city,
      );
      return {
        ...invasion,
        attackers: attackers.filter(
          (attacker) => attacker.invasion_id === invasion.id,
        ),
        cookingDishes: cookingRegion
          ? dishes.filter(
              (dish) => dish.region_zone_id === cookingRegion.zone_id,
            )
          : [],
      };
    }),
    regions,
    huntTargets: getRegionalHuntTargets(),
  };
}) satisfies PageServerLoad;
