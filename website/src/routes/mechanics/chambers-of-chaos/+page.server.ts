import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb } from "$lib/db.server";
import { acquisitionQuery } from "$lib/server/acquisition";
import { loadChambersRules } from "$lib/chambers/rules";
import {
  DEFAULT_VETERAN_POINTS,
  entryChanceRows,
  trialDraws,
  type ChainFamily,
  type ChainItem,
  type Vendor,
} from "$lib/components/chambers/model";
import { loadChambersOverview } from "$lib/queries/chambers.server";
import { formatItemType } from "$lib/utils/format";

export const prerender = true;

/** The chart starts this many levels below the lowest level with a chance. */
const ENTRY_CHART_LEAD = 10;

interface ItemRow {
  id: string;
  name: string;
  quality: number;
  icon: string | null;
  icon_width: number | null;
  icon_height: number | null;
  tooltip_html: string | null;
  augment_next_quality_id: string | null;
}

export const load: PageServerLoad = async () => {
  const db = getDb();
  const overview = loadChambersOverview(db);
  if (!overview) error(500, "Missing Chambers definition");
  const rules = await loadChambersRules(acquisitionQuery(db), {
    veteranPoints: [DEFAULT_VETERAN_POINTS],
  });

  const lowestChance = Math.min(
    ...[...rules.entryItemChances]
      .filter(([, chance]) => chance > 0)
      .map(([level]) => level),
  );
  const entryChances = entryChanceRows(
    rules,
    Math.max(1, lowestChance - ENTRY_CHART_LEAD),
    Math.max(...rules.entryItemChances.keys()),
  );

  const bag = (
    db
      .prepare(
        "SELECT trial_kind FROM chambers_trial_bag WHERE definition_id = ? ORDER BY ordinal",
      )
      .all(overview.definition.id) as { trial_kind: string }[]
  ).map((row) => row.trial_kind);

  const items = db
    .prepare(
      `SELECT i.id, i.name, i.quality, i.augment_next_quality_id, i.tooltip_html,
              va.public_path AS icon, va.width AS icon_width, va.height AS icon_height
         FROM items i
         LEFT JOIN visual_assets va
           ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
        WHERE i.augment_next_quality_id IS NOT NULL
           OR i.id IN (SELECT augment_next_quality_id FROM items WHERE augment_next_quality_id IS NOT NULL)`,
    )
    .all() as ItemRow[];
  const itemById = new Map(items.map((row) => [row.id, row]));
  const successors = new Set(
    items.flatMap((row) =>
      row.augment_next_quality_id ? [row.augment_next_quality_id] : [],
    ),
  );
  const asChainItem = (row: ItemRow): ChainItem => ({
    id: row.id,
    name: row.name,
    quality: row.quality,
    icon: row.icon ? `/${row.icon}` : null,
    tooltipHtml: row.tooltip_html,
    iconWidth: row.icon_width,
    iconHeight: row.icon_height,
  });
  const families: ChainFamily[] = items
    .filter((row) => !successors.has(row.id))
    .map((start) => {
      const tiers: ChainItem[] = [];
      for (
        let step: ItemRow | undefined = start;
        step;
        step = step.augment_next_quality_id
          ? itemById.get(step.augment_next_quality_id)
          : undefined
      )
        tiers.push(asChainItem(step));
      return { name: start.name.replace(/^Small /, ""), tiers };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const catalyst = db
    .prepare(
      `SELECT i.id, i.name, i.quality, i.tooltip_html,
              va.public_path AS icon, va.width AS icon_width, va.height AS icon_height
         FROM items i
         LEFT JOIN visual_assets va
           ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
        WHERE i.item_type = 'augment_upgrade'`,
    )
    .all() as Omit<ItemRow, "augment_next_quality_id">[];
  if (catalyst.length !== 1)
    error(500, `Expected one augment upgrade item, found ${catalyst.length}`);

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
    .all(catalyst[0].id) as { id: string; name: string; price: number }[];
  const prices = new Set(offers.map((offer) => offer.price));
  if (offers.length === 0 || prices.size !== 1)
    error(500, "The Chaos Catalyst needs one price at every merchant");
  const vendors: Vendor[] = offers.map(({ id, name }) => ({ id, name }));

  return {
    ...overview,
    rules,
    entryChances,
    draws: trialDraws(bag),
    families,
    catalyst: {
      item: asChainItem({
        ...catalyst[0],
        augment_next_quality_id: null,
      }),
      typeLabel: formatItemType("augment_upgrade"),
      price: offers[0].price,
      vendors,
    },
  };
};
