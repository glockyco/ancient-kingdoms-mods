import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { ZonesPageData, ZoneListView } from "$lib/types/zones";
import { fishingSpotBaseId } from "../../../scripts/gathering-resource-ids.mjs";

export const prerender = true;

export const load: PageServerLoad = (): ZonesPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const zones = db
    .prepare(
      `
    SELECT
      z.id,
      z.name,
      z.is_dungeon,
      z.weather_type,
      z.level_min,
      z.level_max,
      z.level_median,
      -- Monster counts by type
      (SELECT COUNT(DISTINCT ms.monster_id) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id AND m.is_boss = 1) as boss_count,
      (SELECT COUNT(DISTINCT ms.monster_id) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id AND m.is_elite = 1 AND m.is_boss = 0) as elite_count,
      (SELECT COUNT(*) FROM altars a WHERE a.zone_id = z.id) as altar_count,
      (SELECT COUNT(DISTINCT ns.npc_id) FROM npc_spawns ns WHERE ns.zone_id = z.id) as npc_count,
      0 as gather_count,
      (SELECT COUNT(DISTINCT p.to_zone_id) FROM portals p
       WHERE p.from_zone_id = z.id AND p.to_zone_id IS NOT NULL AND p.to_zone_id != z.id) as connection_count
    FROM zones z
    ORDER BY level_median, level_min, z.name
  `,
    )
    .all() as ZoneListView[];
  const resourceRows = db
    .prepare(
      `
    SELECT DISTINCT grs.zone_id, gr.id, gr.is_fishing_spot
    FROM gathering_resource_spawns grs
    JOIN gathering_resources gr ON gr.id = grs.resource_id
  `,
    )
    .all() as Array<{
    zone_id: string;
    id: string;
    is_fishing_spot: number;
  }>;
  const resourceFamilies = new Map<string, Set<string>>();
  for (const resource of resourceRows) {
    let families = resourceFamilies.get(resource.zone_id);
    if (!families) {
      families = new Set();
      resourceFamilies.set(resource.zone_id, families);
    }
    families.add(
      resource.is_fishing_spot ? fishingSpotBaseId(resource.id) : resource.id,
    );
  }
  for (const zone of zones) {
    zone.gather_count = resourceFamilies.get(zone.id)?.size ?? 0;
  }

  db.close();

  return { zones };
};
