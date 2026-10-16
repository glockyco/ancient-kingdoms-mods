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
  maxLevel: number;
  maxVeteranPoints: number;
  attributeGains: Array<{ className: string; gains: string[] }>;
}

// Source: the export's game_config.json special_items — the game resolves these two
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

  const rules = db
    .prepare(
      "SELECT max_level, max_veteran_points FROM progression_rules WHERE id = 1",
    )
    .get() as { max_level: number; max_veteran_points: number } | undefined;
  if (!rules)
    throw new Error(
      "Missing progression_rules.max_level and max_veteran_points",
    );
  const attributes = [
    "strength",
    "constitution",
    "dexterity",
    "intelligence",
    "wisdom",
    "charisma",
  ] as const;
  type ProgressionRow = {
    class_id: string;
    class_name: string;
    level: number;
  } & Record<(typeof attributes)[number], number>;
  const progression = db
    .prepare(
      `SELECT p.*, c.id AS class_id, c.name AS class_name FROM classes c LEFT JOIN class_level_progression p ON c.id = p.class_id ORDER BY c.rowid, p.level`,
    )
    .all() as ProgressionRow[];
  const byClass = new Map<string, ProgressionRow[]>();
  for (const row of progression) {
    const rows = byClass.get(row.class_id);
    if (rows) rows.push(row);
    else byClass.set(row.class_id, [row]);
  }
  const attributeGains = [...byClass].map(([classId, rows]) => {
    if (
      rows.length !== rules.max_level ||
      rows.some((row, index) => row.level !== index + 1)
    ) {
      throw new Error(
        `Missing class_level_progression levels for ${classId}: ${rows.map((row) => row.level).join(", ")}`,
      );
    }
    const byCadence = new Map<number, string[]>();
    for (const attribute of attributes) {
      const increases = rows.filter(
        (row, index) =>
          row[attribute] !== (index === 0 ? 0 : rows[index - 1][attribute]),
      );
      const cadence = increases[0]?.level;
      if (
        !cadence ||
        increases.length !== Math.floor(rules.max_level / cadence) ||
        increases.some(
          (row, index) =>
            row.level !== (index + 1) * cadence ||
            row[attribute] -
              (row.level === 1 ? 0 : rows[row.level - 2][attribute]) !==
              1,
        )
      ) {
        throw new Error(
          `Invalid class_level_progression cadence for ${classId}.${attribute}: levels ${increases.map((row) => row.level).join(", ")}`,
        );
      }
      const name = attribute[0].toUpperCase() + attribute.slice(1);
      const names = byCadence.get(cadence);
      if (names) names.push(name);
      else byCadence.set(cadence, [name]);
    }
    const cadences = [...byCadence.keys()].sort((a, b) => a - b);
    if (
      cadences.length !== 5 ||
      cadences.some((cadence, index) => cadence !== index + 2)
    ) {
      throw new Error(
        `Unsupported class_level_progression cadence for ${classId}: ${cadences.join(", ")}`,
      );
    }
    return {
      className: rows[0].class_name,
      gains: cadences.map((cadence) => byCadence.get(cadence)!.join(", ")),
    };
  });
  if (attributeGains.length === 0)
    throw new Error("Missing class_level_progression");

  db.close();

  return {
    redemptionToken,
    maxLevelReward,
    veteranMaster: veteranMaster ?? null,
    discoveryCities,
    maxLevel: rules.max_level,
    maxVeteranPoints: rules.max_veteran_points,
    attributeGains,
  };
};
