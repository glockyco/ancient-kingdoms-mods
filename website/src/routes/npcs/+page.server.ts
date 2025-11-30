import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type {
  NpcsPageData,
  NpcListView,
  NpcZoneInfo,
  NpcRoles,
} from "$lib/types/npcs";

export const prerender = true;

export const load: PageServerLoad = (): NpcsPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const npcsRaw = db
    .prepare(
      `
    SELECT id, name, faction, race, roles
    FROM npcs
    ORDER BY name
  `,
    )
    .all() as Array<{
    id: string;
    name: string;
    faction: string | null;
    race: string | null;
    roles: string;
  }>;

  const npcs: NpcListView[] = npcsRaw.map((npc) => ({
    id: npc.id,
    name: npc.name,
    faction: npc.faction,
    race: npc.race,
    roles: JSON.parse(npc.roles) as NpcRoles,
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
