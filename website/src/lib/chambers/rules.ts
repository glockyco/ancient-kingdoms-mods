// Reads the exported Chambers rule tables through any acquisition-style query function,
// so the prerender (better-sqlite3) and the browser (sql.js worker) share one reader and
// get the same values. Use `loadChambersRules(acquisitionQuery(db))` on the server and
// `loadChambersRules(browserAcquisitionQuery)` in the browser.

import type { AcquisitionQuery } from "$lib/acquisition/types";
import {
  scalingKey,
  type ChambersRewardBand,
  type ChambersRules,
  type ChambersScalingValue,
} from "$lib/calculation/chambers";

type Row = Record<string, unknown>;

function number(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`chambers: invalid ${key}`);
  return value;
}

function nullableNumber(row: Row, key: string): number | null {
  return row[key] === null ? null : number(row, key);
}

export interface LoadOptions {
  /** Load scaling rows for these total veteran points only. Default: every row. */
  readonly veteranPoints?: readonly number[];
}

export async function loadChambersRules(
  query: AcquisitionQuery,
  options: LoadOptions = {},
): Promise<ChambersRules> {
  const definitions = await query(
    "SELECT * FROM chambers_definitions ORDER BY id",
    [],
  );
  if (definitions.length !== 1)
    throw new Error(
      `chambers: expected one definition, found ${definitions.length}`,
    );
  const definition = definitions[0];
  const id = String(definition.id);
  const rows = (table: string, order: string) =>
    query(`SELECT * FROM ${table} WHERE definition_id = ? ORDER BY ${order}`, [
      id,
    ]);
  const domains = await query(
    "SELECT domain, value FROM chambers_rule_domains WHERE definition_id = ?",
    [id],
  );
  const domain = (name: string) =>
    new Set(
      domains
        .filter((row) => row.domain === name)
        .map((row) => number(row, "value")),
    );
  const [chances, experience, bonuses, offsets, bands] = await Promise.all([
    rows("chambers_entry_item_chances", "level"),
    rows("chambers_completion_experience", "level"),
    rows("chambers_veteran_level_bonuses", "veteran_points"),
    rows("chambers_enemy_level_offsets", "level_offset"),
    rows("chambers_reward_bands", "ordinal"),
  ]);
  const wanted = options.veteranPoints;
  const scalingRows = wanted
    ? (
        await Promise.all(
          wanted.map((points) =>
            query(
              "SELECT * FROM chambers_scaling WHERE definition_id = ? AND veteran_points = ?",
              [id, points],
            ),
          ),
        )
      ).flat()
    : await query("SELECT * FROM chambers_scaling WHERE definition_id = ?", [
        id,
      ]);
  const scaling = new Map<string, ChambersScalingValue>();
  for (const row of scalingRows)
    scaling.set(
      scalingKey(
        number(row, "enemy_level"),
        number(row, "veteran_points"),
        number(row, "room_index"),
        number(row, "guardian") === 1,
      ),
      { health: number(row, "health"), power: number(row, "power") },
    );
  const rewardBands: ChambersRewardBand[] = bands.map((row) => ({
    minimumLevel: number(row, "minimum_level"),
    maximumLevel: nullableNumber(row, "maximum_level"),
    minimumVeteranPoints: number(row, "minimum_veteran_points"),
    maximumVeteranPoints: nullableNumber(row, "maximum_veteran_points"),
    minimumQuantity: number(row, "minimum_quantity"),
    maximumQuantity: number(row, "maximum_quantity"),
  }));
  return {
    minimumLevel: number(definition, "minimum_level"),
    roomCount: number(definition, "room_count"),
    runDurationSeconds: number(definition, "run_duration_seconds"),
    playerLevels: domain("player_level"),
    veteranPoints: domain("veteran_points"),
    enemyLevels: domain("enemy_level"),
    roomIndices: domain("room_index"),
    entryItemChances: new Map(
      chances.map((row) => [number(row, "level"), number(row, "chance")]),
    ),
    completionExperience: new Map(
      experience.map((row) => [
        number(row, "level"),
        number(row, "experience"),
      ]),
    ),
    maximumLevelBonus: new Map(
      bonuses.map((row) => [
        number(row, "veteran_points"),
        number(row, "bonus"),
      ]),
    ),
    offsets: offsets.map((row) => ({
      offset: number(row, "level_offset"),
      weight: number(row, "weight"),
      ordinary: number(row, "ordinary") === 1,
      guardian: number(row, "guardian") === 1,
    })),
    rewardBands,
    scaling,
  };
}
