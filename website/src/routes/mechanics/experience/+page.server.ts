import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";

export const prerender = true;

interface SkillRef {
  id: string;
  name: string;
}

export interface ItemRef {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
}

interface ExperiencePageData {
  doubleExpSkills: SkillRef[];
  redemptionToken: ItemRef | null;
  maxLevelReward: ItemRef | null;
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
      SELECT id, name, quality, tooltip_html
      FROM items
      WHERE id = ?
    `,
    )
    .get(id) as ItemRef | undefined;
  return row ?? null;
}

export const load: PageServerLoad = (): ExperiencePageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const doubleExpSkills = db
    .prepare(
      `
      SELECT id, name
      FROM skills
      WHERE is_double_exp_spell = 1
      ORDER BY name
    `,
    )
    .all() as SkillRef[];

  const redemptionToken = getItem(db, REDEMPTION_TOKEN_ID);
  const maxLevelReward = getItem(db, MAX_LEVEL_REWARD_ID);

  db.close();

  return { doubleExpSkills, redemptionToken, maxLevelReward };
};
