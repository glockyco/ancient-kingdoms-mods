import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { ZonesPageData, ZoneListView } from "$lib/types/zones";
import { fishingSpotBaseId } from "../../../scripts/gathering-resource-ids.mjs";

export const prerender = true;

export const load: PageServerLoad = (): ZonesPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  // Bosses and elites count world placements, altar wave members and placeholder spawns
  // near their parent placement, as the zone page lists them. Zone levels and medians
  // come from world placements only.
  const zones = db
    .prepare(
      `
    WITH zone_monsters AS (
      SELECT zone_id, monster_id FROM monster_spawns
      UNION
      SELECT a.zone_id, k.monster_id FROM acquisition_kill_details k
      JOIN altars a ON a.id = k.altar_id
      UNION
      SELECT parent.zone_id, k.monster_id FROM acquisition_kill_details k
      JOIN monster_spawns parent ON parent.id = k.parent_monster_spawn_id
      WHERE k.event_kind = 'placeholder'
    )
    SELECT
      z.id,
      z.name,
      z.is_dungeon,
      z.weather_type,
      z.level_min,
      z.level_max,
      z.level_median,
      (SELECT COUNT(*) FROM zone_monsters zm
       JOIN monsters m ON m.id = zm.monster_id
       WHERE zm.zone_id = z.id AND m.is_boss = 1) as boss_count,
      (SELECT COUNT(*) FROM zone_monsters zm
       JOIN monsters m ON m.id = zm.monster_id
       WHERE zm.zone_id = z.id AND m.is_elite = 1 AND m.is_boss = 0) as elite_count,
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
