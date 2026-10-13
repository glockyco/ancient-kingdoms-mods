import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";

export const prerender = true;

export interface ItemRef {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  visual_public_path: string | null;
}

interface NamedRef {
  id: string;
  name: string;
}

interface ExperiencePageData {
  redemptionToken: ItemRef | null;
  maxLevelReward: ItemRef | null;
  veteranMaster: NamedRef | null;
  discoveryCities: NamedRef[];
}

// Source: exported-data/game_config.json special_items — the game resolves these two
// items through GameManager.redemptionToken and GameManager.RewardMaxLevelItem
// (mods/DataExporter/Exporters/GameConfigExporter.cs:82-83). The export is not loaded
// into the database, so the ids are pinned here and the display data comes from items.
const REDEMPTION_TOKEN_ID = "token_of_redemption";
const MAX_LEVEL_REWARD_ID = "scroll_of_knowledge_v";

function getItem(db: Database.Database, id: string): ItemRef | null {
  const row = db
    .prepare(
      `
      SELECT i.id, i.name, i.quality, i.tooltip_html,
             va.public_path AS visual_public_path
      FROM items i
      LEFT JOIN visual_assets va
        ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
      WHERE i.id = ?
    `,
    )
    .get(id) as ItemRef | undefined;
  return row ?? null;
}

export const load: PageServerLoad = (): ExperiencePageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const redemptionToken = getItem(db, REDEMPTION_TOKEN_ID);
  const maxLevelReward = getItem(db, MAX_LEVEL_REWARD_ID);
  const veteranMaster = db
    .prepare(
      "SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_veteran_master') = 1 ORDER BY name LIMIT 1",
    )
    .get() as NamedRef | undefined;
  // Source: server-scripts/ZoneTrigger.cs:NewZoneDiscovered — these five settlements receive 10 discovery XP.
  const discoveryCities = db
    .prepare(
      "SELECT id, name FROM zones WHERE id IN ('alaenanore_village', 'thogh_maldur', 'milldenn', 'bonebreach', 'felarii_village') ORDER BY name",
    )
    .all() as NamedRef[];

  db.close();

  return {
    redemptionToken,
    maxLevelReward,
    veteranMaster: veteranMaster ?? null,
    discoveryCities,
  };
};
