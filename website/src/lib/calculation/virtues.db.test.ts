import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import {
  VIRTUE_IDS,
  compassionHealingBonus,
  honestyGainBonus,
  honorAccuracyBonus,
  honorCriticalResistBonus,
  sacrificeHealthBonus,
  valorDamageBonus,
  type VirtueId,
} from "./virtues";

interface RankRow {
  virtue_id: VirtueId;
  rank: number;
  effect: string;
  humility_multiplier: number;
}

const db = new Database(DB_SOURCE_PATH, { readonly: true });
const ranks = db
  .prepare(
    `SELECT r.virtue_id, r.rank, r.effect, rr.humility_multiplier
     FROM virtue_ranks r JOIN virtue_rank_rules rr ON rr.rank = r.rank
     ORDER BY r.virtue_id, r.rank`,
  )
  .all() as RankRow[];
db.close();

/** The percentages a rank's effect should state, in the order the text states them. */
function expectedPercents(row: RankRow): number[] {
  const percent = (fraction: number) => fraction * 100;
  switch (row.virtue_id) {
    case "compassion":
      return [percent(compassionHealingBonus(row.rank))];
    case "honor":
      return [
        percent(honorAccuracyBonus(row.rank)),
        percent(honorCriticalResistBonus(row.rank)),
      ];
    case "sacrifice":
      return [percent(sacrificeHealthBonus(row.rank))];
    case "humility":
      return [percent(row.humility_multiplier - 1)];
    case "honesty":
      return [percent(honestyGainBonus(row.rank))];
    case "valor":
      return [percent(valorDamageBonus(row.rank))];
  }
}

describe("virtue effect texts", () => {
  it("cover every virtue", () => {
    expect(new Set(ranks.map((row) => row.virtue_id))).toEqual(
      new Set(VIRTUE_IDS),
    );
  });

  for (const row of ranks) {
    it(`${row.virtue_id} rank ${row.rank} states the module's numbers: ${row.effect}`, () => {
      const stated = [...row.effect.matchAll(/[+-]\d+(?:\.\d+)?/g)].map(
        (match) => Number(match[0]),
      );
      const expected = expectedPercents(row);
      expect(stated).toHaveLength(expected.length);
      stated.forEach((value, index) =>
        expect(value).toBeCloseTo(expected[index], 6),
      );
    });
  }
});
