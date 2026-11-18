import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/db.server";
import { acquisitionQuery } from "$lib/server/acquisition";
import { loadChambersRules } from "$lib/chambers/rules";
import {
  DEFAULT_VETERAN_POINTS,
  trialDraws,
  type Vendor,
} from "$lib/components/chambers/model";
import { loadChambersOverview } from "$lib/queries/chambers.server";
import { loadAugmentChains } from "$lib/server/augment-chains";
import { formatItemType } from "$lib/utils/format";
import type { Dropper } from "$lib/components/chambers/EntryItemDroppers.svelte";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const db = getDb();
  const overview = loadChambersOverview(db);
  if (!overview) error(500, "Missing Chambers definition");
  const rules = await loadChambersRules(acquisitionQuery(db), {
    veteranPoints: [DEFAULT_VETERAN_POINTS],
  });

  // Source: server-scripts/Monster.cs:OnDeath — the entry item drops through the monsters' own drop tables.
  const droppers = db
    .prepare(
      `SELECT m.id, m.name, m.level, d.chance, va.public_path AS visual_public_path
         FROM chambers_entry_item_droppers d
         JOIN monsters m ON m.id = d.monster_id
         LEFT JOIN visual_assets va
           ON va.domain = 'monster' AND va.entity_id = m.id AND va.kind = 'primary'
        WHERE d.definition_id = ?
        ORDER BY d.chance DESC, m.level DESC, m.name`,
    )
    .all(overview.definition.id) as Dropper[];
  if (droppers.length === 0) error(500, "No monster drops the entry item");

  const bag = (
    db
      .prepare(
        "SELECT trial_kind FROM chambers_trial_bag WHERE definition_id = ? ORDER BY ordinal",
      )
      .all(overview.definition.id) as { trial_kind: string }[]
  ).map((row) => row.trial_kind);

  const { catalyst, families } = loadAugmentChains(db);

  const offers = db
    .prepare(
      `SELECT DISTINCT n.id, n.name, input.amount AS price
         FROM acquisition_outputs o
         JOIN acquisition_providers_npcs p ON p.method_id = o.method_id
         JOIN npcs n ON n.id = p.npc_id
         JOIN acquisition_cost_groups g ON g.method_id = o.method_id
         JOIN acquisition_inputs input ON input.cost_group_id = g.id
        WHERE o.item_id = ? AND input.role = 'currency'
        ORDER BY n.name`,
    )
    .all(catalyst.id) as { id: string; name: string; price: number }[];
  const prices = new Set(offers.map((offer) => offer.price));
  if (offers.length === 0 || prices.size !== 1)
    error(500, "The Chaos Catalyst needs one price at every merchant");
  const vendors: Vendor[] = offers.map(({ id, name }) => ({ id, name }));

  return {
    ...overview,
    rules,
    droppers,
    draws: trialDraws(bag),
    families,
    catalyst: {
      item: catalyst,
      typeLabel: formatItemType("augment_upgrade"),
      price: offers[0].price,
      vendors,
    },
  };
};
