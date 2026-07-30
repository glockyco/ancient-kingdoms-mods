import { query } from "$lib/db.server";
import type { TrapType } from "$lib/constants/traps";

export interface TrapListView {
  id: string;
  name: string;
  type: TrapType;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
  sub_zone_id: string | null;
  sub_zone_name: string | null;
  effect_skill_id: string | null;
  effect_skill_name: string | null;
  has_teleport: boolean;
  teleport_zone_id: string | null;
  teleport_zone_name: string | null;
  position_x: number | null;
  position_y: number | null;
  fire_interval: number | null;
  trap_width: number | null;
  trap_height: number | null;
}

export function getTrapsList(): TrapListView[] {
  return query<TrapListView>(
    `SELECT
      t.id,
      t.name,
      t.type,
      t.zone_id,
      z.name as zone_name,
      z.is_dungeon,
      t.sub_zone_id,
      sz.name as sub_zone_name,
      t.effect_skill_id,
      s.name as effect_skill_name,
      t.has_teleport,
      t.teleport_zone_id,
      tz.name as teleport_zone_name,
      t.position_x,
      t.position_y,
      t.fire_interval,
      t.trap_width,
      t.trap_height
    FROM traps t
    JOIN zones z ON z.id = t.zone_id
    LEFT JOIN zone_triggers sz ON sz.id = t.sub_zone_id
    LEFT JOIN skills s ON s.id = t.effect_skill_id
    LEFT JOIN zones tz ON tz.id = t.teleport_zone_id
    ORDER BY z.name, t.type, t.name`,
  );
}
