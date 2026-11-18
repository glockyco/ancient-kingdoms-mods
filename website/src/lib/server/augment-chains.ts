import { error } from "@sveltejs/kit";
import type Database from "better-sqlite3";
import type { ChainFamily, ChainItem } from "$lib/components/chambers/model";

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

export interface AugmentChains {
  /** The augment upgrade item that raises each step. */
  readonly catalyst: ChainItem;
  /** Every augment family, from its lowest quality to its highest. */
  readonly families: readonly ChainFamily[];
}

const ICON_JOIN = `LEFT JOIN visual_assets va
           ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'`;

function asChainItem(row: Omit<ItemRow, "augment_next_quality_id">): ChainItem {
  return {
    id: row.id,
    name: row.name,
    quality: row.quality,
    icon: row.icon ? `/${row.icon}` : null,
    tooltipHtml: row.tooltip_html,
    iconWidth: row.icon_width,
    iconHeight: row.icon_height,
  };
}

/**
 * Reads the augment families from the items' next-quality links, and the one
 * augment upgrade item that moves an augment along them.
 */
export function loadAugmentChains(db: Database.Database): AugmentChains {
  const items = db
    .prepare(
      `SELECT i.id, i.name, i.quality, i.augment_next_quality_id, i.tooltip_html,
              va.public_path AS icon, va.width AS icon_width, va.height AS icon_height
         FROM items i
         ${ICON_JOIN}
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

  const catalysts = db
    .prepare(
      `SELECT i.id, i.name, i.quality, i.tooltip_html,
              va.public_path AS icon, va.width AS icon_width, va.height AS icon_height
         FROM items i
         ${ICON_JOIN}
        WHERE i.item_type = 'augment_upgrade'`,
    )
    .all() as Omit<ItemRow, "augment_next_quality_id">[];
  if (catalysts.length !== 1)
    error(500, `Expected one augment upgrade item, found ${catalysts.length}`);

  return { catalyst: asChainItem(catalysts[0]), families };
}
