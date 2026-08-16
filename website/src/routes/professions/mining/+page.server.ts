import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
  type ItemSourceSummary,
} from "$lib/server/item-source-summary";

export const prerender = true;

interface OreZone {
  zone_id: string;
  zone_name: string;
  node_count: number;
}

interface OreGem {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  chance: number;
}

interface MiningOre {
  id: string;
  name: string;
  tier: number;
  respawn_time: number;
  gathering_exp: number;
  reward_item_id: string;
  reward_item_name: string;
  reward_amount: number;
  node_count: number;
  zones: OreZone[];
  gems: OreGem[];
  recipe_count: number;
}

interface PickaxeSourceGroup {
  type: ItemSourceSummary["type"];
  sources: ItemSourceSummary[];
}

interface Pickaxe {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  source_groups: PickaxeSourceGroup[];
  min_source_level: number | null;
}

interface OreQuest {
  quest_id: string;
  quest_name: string;
  ore_id: string;
  ore_name: string;
  amount: number;
  purpose: string;
  level_recommended: number;
}

interface OreVendor {
  npc_id: string;
  npc_name: string;
  ore_name: string;
}

interface MiningPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  ores: MiningOre[];
  pickaxes: Pickaxe[];
  quests: OreQuest[];
  vendors: OreVendor[];
  totalNodes: number;
}

interface RawOre {
  id: string;
  name: string;
  tier: number;
  respawn_time: number;
  gathering_exp: number;
  reward_item_id: string;
  reward_item_name: string;
  reward_amount: number;
}

export const load: PageServerLoad = (): MiningPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
    FROM professions
    WHERE id = 'mining'
  `,
    )
    .get() as MiningPageData["profession"];

  const rawOres = db
    .prepare(
      `
    SELECT
      gr.id,
      gr.name,
      gr.level AS tier,
      gr.respawn_time,
      gr.gathering_exp,
      gr.item_reward_id AS reward_item_id,
      reward.name AS reward_item_name,
      gr.item_reward_amount AS reward_amount
    FROM gathering_resources gr
    JOIN items reward ON reward.id = gr.item_reward_id
    WHERE gr.is_mineral = 1
    ORDER BY gr.level
  `,
    )
    .all() as RawOre[];

  const zoneStatement = db.prepare(
    `
    SELECT
      z.id AS zone_id,
      z.name AS zone_name,
      COUNT(*) AS node_count
    FROM gathering_resource_spawns s
    JOIN zones z ON z.id = s.zone_id
    WHERE s.resource_id = ?
    GROUP BY z.id, z.name
    ORDER BY node_count DESC, z.name
  `,
  );

  // The guaranteed ore is stored in the same junction as the bonus gems, so it is
  // excluded by id rather than by rate: a future gem could also sit at 1.0.
  const gemStatement = db.prepare(
    `
    SELECT
      g.item_id,
      i.name AS item_name,
      i.tooltip_html,
      g.actual_drop_chance AS chance
    FROM item_sources_gather g
    JOIN items i ON i.id = g.item_id
    WHERE g.resource_id = ? AND g.item_id != ?
    ORDER BY g.actual_drop_chance DESC, i.name
  `,
  );

  const recipeCountStatement = db.prepare(
    `
    SELECT COUNT(DISTINCT recipe_id) AS count
    FROM item_usages_recipe
    WHERE item_id = ?
  `,
  );

  const ores: MiningOre[] = rawOres.map((ore) => {
    const zones = zoneStatement.all(ore.id) as OreZone[];
    const recipeCount = recipeCountStatement.get(ore.reward_item_id) as {
      count: number;
    };
    return {
      ...ore,
      zones,
      node_count: zones.reduce((total, zone) => total + zone.node_count, 0),
      gems: gemStatement.all(ore.id, ore.reward_item_id) as OreGem[],
      recipe_count: recipeCount.count,
    };
  });

  const rawPickaxes = db
    .prepare(
      `
    SELECT id, name, quality, tooltip_html
    FROM items
    WHERE weapon_category = 'Pickaxe'
    ORDER BY quality
  `,
    )
    .all() as Omit<Pickaxe, "source_groups" | "min_source_level">[];

  const pickaxeSources = groupItemSourceSummaries(
    getItemSourceSummaries(
      db,
      rawPickaxes.map((pickaxe) => pickaxe.id),
    ),
  );

  const pickaxes: Pickaxe[] = rawPickaxes.map((pickaxe) => {
    const sources = pickaxeSources.get(pickaxe.id) ?? [];
    // One icon heads each run of links, so the page needs the sources grouped by
    // type rather than flat.
    const byType = new Map<ItemSourceSummary["type"], ItemSourceSummary[]>();
    for (const source of sources) {
      const existing = byType.get(source.type);
      if (existing) existing.push(source);
      else byType.set(source.type, [source]);
    }
    return {
      ...pickaxe,
      source_groups: [...byType].map(([type, grouped]) => ({
        type,
        sources: grouped,
      })),
      min_source_level: getMinimumSourceLevel(sources),
    };
  });

  const quests = db
    .prepare(
      `
    SELECT
      u.quest_id,
      q.name AS quest_name,
      u.item_id AS ore_id,
      i.name AS ore_name,
      u.amount,
      u.purpose,
      q.level_recommended
    FROM item_usages_quest u
    JOIN quests q ON q.id = u.quest_id
    JOIN items i ON i.id = u.item_id
    WHERE u.item_id IN (SELECT item_reward_id FROM gathering_resources WHERE is_mineral = 1)
    ORDER BY q.level_recommended, q.name
  `,
    )
    .all() as OreQuest[];

  const vendors = db
    .prepare(
      `
    SELECT
      n.id AS npc_id,
      n.name AS npc_name,
      i.name AS ore_name
    FROM npcs n
    JOIN items i ON n.items_sold LIKE '%"' || i.id || '"%'
    WHERE i.id IN (SELECT item_reward_id FROM gathering_resources WHERE is_mineral = 1)
    ORDER BY n.name, i.name
  `,
    )
    .all() as OreVendor[];

  db.close();

  return {
    profession,
    ores,
    pickaxes,
    quests,
    vendors,
    totalNodes: ores.reduce((total, ore) => total + ore.node_count, 0),
  };
};
