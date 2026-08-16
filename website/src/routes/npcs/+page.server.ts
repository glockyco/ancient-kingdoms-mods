import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  NpcsPageData,
  NpcListView,
  NpcZoneInfo,
  NpcRoles,
} from "$lib/types/npcs";

export const prerender = true;

export const load: PageServerLoad = (): NpcsPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const npcsRaw = db
    .prepare(
      `
    SELECT
      n.id,
      n.name,
      n.faction,
      n.race,
      n.roles,
      va.public_path as visual_public_path
    FROM npcs n
    LEFT JOIN visual_assets va
      ON va.domain = 'npc'
     AND va.entity_id = n.id
     AND va.kind = 'primary'
    ORDER BY n.name
  `,
    )
    .all() as Array<{
    id: string;
    name: string;
    faction: string | null;
    race: string | null;
    roles: string;
    visual_public_path: string | null;
  }>;

  const npcs: NpcListView[] = npcsRaw.map((npc) => ({
    id: npc.id,
    name: npc.name,
    faction: npc.faction,
    race: npc.race,
    roles: JSON.parse(npc.roles) as NpcRoles,
    visual_public_path: npc.visual_public_path,
  }));

  const npcZones = db
    .prepare(
      `
    SELECT DISTINCT
      ns.npc_id,
      z.id as zone_id,
      z.name as zone_name,
      z.is_dungeon
    FROM npc_spawns ns
    JOIN zones z ON z.id = ns.zone_id
    ORDER BY z.name
  `,
    )
    .all() as NpcZoneInfo[];

  db.close();

  return {
    npcs,
    npcZones,
  };
};
