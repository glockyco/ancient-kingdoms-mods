import { query } from "$lib/db.server";
import type { Season } from "$lib/data/seasonal-events";

export interface SeasonalMonster {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  spawn_time_start: number;
  spawn_time_end: number;
  zones: { id: string; name: string }[];
}

export function getSeasonalMonsters(): SeasonalMonster[] {
  const rows = query<Omit<SeasonalMonster, "zones"> & { zones: string }>(`
    SELECT m.id, m.name, m.level_min, m.level_max, m.spawn_time_start, m.spawn_time_end,
           json_group_array(DISTINCT json_object('id', z.id, 'name', z.name)) AS zones
    FROM monsters m
    JOIN monster_spawns s ON s.monster_id = m.id
    JOIN zones z ON z.id = s.zone_id
    WHERE m.season = 'halloween'
    GROUP BY m.id
    ORDER BY m.level_min, m.name
  `);
  return rows.map((row) => ({
    ...row,
    zones: (JSON.parse(row.zones) as { id: string; name: string }[]).sort(
      (a, b) => a.name.localeCompare(b.name),
    ),
  }));
}

export interface SeasonalNpc {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
}

export function getSeasonalNpcs(): SeasonalNpc[] {
  return query<SeasonalNpc>(`
    SELECT DISTINCT n.id, n.name, z.id AS zone_id, z.name AS zone_name
    FROM npcs n
    JOIN npc_spawns s ON s.npc_id = n.id
    JOIN zones z ON z.id = s.zone_id
    WHERE n.season = 'christmas'
    ORDER BY n.name, z.name
  `);
}

export interface SeasonalQuest {
  id: string;
  name: string;
  level_recommended: number;
  completer_id: string;
  completer_name: string;
  reward_ids: string[];
}

/** Quests offered by Winter Festival NPCs, which exist only while the festival runs. */
export function getSeasonalQuests(): SeasonalQuest[] {
  const rows = query<
    Omit<SeasonalQuest, "reward_ids"> & { reward_ids: string }
  >(`
    SELECT q.id, q.name, q.level_recommended,
           complete.npc_id AS completer_id, cn.name AS completer_name,
           (SELECT json_group_array(DISTINCT r.item_id) FROM quest_reward_slots r
            WHERE r.quest_id = q.id) AS reward_ids
    FROM quests q
    JOIN npc_quest_memberships offer ON offer.quest_id = q.id AND offer.role = 'offer'
    JOIN npcs n ON n.id = offer.npc_id AND n.season = 'christmas'
    JOIN npc_quest_memberships complete ON complete.quest_id = q.id AND complete.role = 'complete'
    JOIN npcs cn ON cn.id = complete.npc_id
    ORDER BY q.level_recommended, q.name
  `);
  return rows.map((row) => ({
    ...row,
    reward_ids: (JSON.parse(row.reward_ids) as string[]).sort(),
  }));
}

export interface SeasonalShopOffer {
  season: Season;
  item_id: string;
  currency_id: string;
  price: number;
  /** What one purchase delivers: the item itself, or the contents of a pack that opens on purchase. */
  received_id: string;
  amount: number;
}

/** What repair merchants add to their stock in each season. Every merchant makes the same offer. */
export function getSeasonalShopOffers(): SeasonalShopOffer[] {
  return query<SeasonalShopOffer>(`
    SELECT DISTINCT v.season, i.id AS item_id, inp.item_id AS currency_id, inp.amount AS price,
           o.item_id AS received_id, o.amount_min AS amount
    FROM acquisition_vendor_details v
    JOIN items i ON i.id = v.offered_item_id
    JOIN acquisition_cost_groups g ON g.method_id = v.id
    JOIN acquisition_inputs inp ON inp.cost_group_id = g.id AND inp.resource_kind = 'item'
    JOIN items c ON c.id = inp.item_id
    JOIN acquisition_outputs o ON o.method_id = v.id
    WHERE v.season IS NOT NULL
    ORDER BY v.season, c.name, i.name
  `);
}

export interface SeasonalItem {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
}

export function getItemsById(ids: string[]): Record<string, SeasonalItem> {
  const rows = query<SeasonalItem>(
    `SELECT id, name, quality, tooltip_html FROM items
     WHERE id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify([...new Set(ids)])],
  );
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

/** Seasonal monsters that drop a seasonal shop currency. */
export function getSeasonalCurrencyDrops(): {
  monster_id: string;
  item_id: string;
}[] {
  return query(`
    SELECT DISTINCT k.monster_id, o.item_id
    FROM acquisition_kill_details k
    JOIN monsters m ON m.id = k.monster_id AND m.season = 'halloween'
    JOIN acquisition_outputs o ON o.method_id = k.id
    WHERE o.item_id IN (
      SELECT inp.item_id FROM acquisition_vendor_details v
      JOIN acquisition_cost_groups g ON g.method_id = v.id
      JOIN acquisition_inputs inp ON inp.cost_group_id = g.id
      WHERE v.season IS NOT NULL AND inp.item_id IS NOT NULL
    )
    ORDER BY k.monster_id, o.item_id
  `);
}
