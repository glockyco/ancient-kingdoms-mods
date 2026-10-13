import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";

export const prerender = true;

interface MasterRef {
  id: string;
  name: string;
  roles: string;
}

export const load: PageServerLoad = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const masters = db
    .prepare(
      `
    SELECT id, name, roles FROM npcs
    WHERE json_extract(roles, '$.is_skill_master') = 1
       OR json_extract(roles, '$.is_veteran_master') = 1
       OR json_extract(roles, '$.is_reset_attributes') = 1
    ORDER BY name
  `,
    )
    .all() as MasterRef[];
  const namedMasters = masters.map(({ roles, ...npc }) => ({
    ...npc,
    roles: JSON.parse(roles) as Record<string, boolean>,
  }));
  const redemptionToken = db
    .prepare(
      `
    SELECT i.id, i.name, i.quality, i.tooltip_html, va.public_path AS visual_public_path
    FROM items i
    LEFT JOIN visual_assets va
      ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
    WHERE i.id = 'token_of_redemption'
  `,
    )
    .get() as
    | {
        id: string;
        name: string;
        quality: number;
        tooltip_html: string | null;
        visual_public_path: string | null;
      }
    | undefined;
  db.close();
  return {
    skillMaster: namedMasters.find((npc) => npc.roles.is_skill_master) ?? null,
    attributeMaster:
      namedMasters.find((npc) => npc.roles.is_reset_attributes) ?? null,
    veteranMaster:
      namedMasters.find((npc) => npc.roles.is_veteran_master) ?? null,
    redemptionToken: redemptionToken ?? null,
  };
};
