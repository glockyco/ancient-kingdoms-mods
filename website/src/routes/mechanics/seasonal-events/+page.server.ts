import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/db.server";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import {
  getItemsById,
  getSeasonalCurrencyDrops,
  getSeasonalMonsters,
  getSeasonalNpcs,
  getSeasonalQuests,
  getSeasonalShopOffers,
} from "$lib/queries/seasonal-events.server";

export const prerender = true;

export const load = (() => {
  const offers = getSeasonalShopOffers();
  const quests = getSeasonalQuests();
  const itemIds = [
    ...offers.flatMap((offer) => [
      offer.item_id,
      offer.currency_id,
      offer.received_id,
    ]),
    ...quests.flatMap((quest) => quest.reward_ids),
  ];
  return {
    monsters: getSeasonalMonsters(),
    npcs: getSeasonalNpcs(),
    quests,
    offers,
    currencyDrops: getSeasonalCurrencyDrops(),
    items: getItemsById(itemIds),
    itemIconPaths: getItemIconPaths(getDb(), itemIds),
  };
}) satisfies PageServerLoad;
