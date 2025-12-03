import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ZonesPageData, ZoneListView } from "$lib/types/zones";

export const prerender = true;

export const load: PageServerLoad = (): ZonesPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const zones = db
    .prepare(
      `
    SELECT
      z.id,
      z.name,
      z.is_dungeon,
      z.weather_type,
      -- Level range from spawns (excluding critters, unless zone only has critters)
      COALESCE(
        (SELECT MIN(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id AND ms.level > 0
           AND m.type_name != 'Critter'),
        (SELECT MIN(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id AND ms.level > 0)
      ) as level_min,
      COALESCE(
        (SELECT MAX(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id
           AND m.type_name != 'Critter'),
        (SELECT MAX(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id)
      ) as level_max,
      -- Monster counts by type
      (SELECT COUNT(DISTINCT ms.monster_id) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id AND m.is_boss = 1) as boss_count,
      (SELECT COUNT(DISTINCT ms.monster_id) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id AND m.is_elite = 1 AND m.is_boss = 0) as elite_count,
      (SELECT COUNT(*) FROM altars a WHERE a.zone_id = z.id) as altar_count,
      (SELECT COUNT(DISTINCT ns.npc_id) FROM npc_spawns ns WHERE ns.zone_id = z.id) as npc_count,
      (SELECT COUNT(DISTINCT grs.resource_id) FROM gathering_resource_spawns grs
       WHERE grs.zone_id = z.id) as gather_count,
      (SELECT COUNT(DISTINCT p.to_zone_id) FROM portals p
       WHERE p.from_zone_id = z.id AND p.to_zone_id IS NOT NULL AND p.to_zone_id != z.id) as connection_count
    FROM zones z
    ORDER BY level_min, level_max, z.name
  `,
    )
    .all() as ZoneListView[];

  db.close();

  return { zones };
};
