import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  completionExperience,
  enemyLevelDistribution,
  enemyScaling,
  rewardBands,
} from "$lib/calculation/chambers";
import type { AcquisitionQuery } from "$lib/acquisition/types";
import { loadChambersRules } from "./rules";

const schema = readFileSync(
  resolve(__dirname, "../../../../build-pipeline/schema.sql"),
  "utf-8",
);
const start = schema.indexOf("CREATE TABLE chambers_definitions");
const end = schema.indexOf("CREATE INDEX idx_chambers_pool_monsters_monster");

function fixture(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = OFF");
  db.exec(schema.slice(start, end));
  const id = "chambers_of_chaos";
  db.prepare(
    `INSERT INTO chambers_definitions VALUES (?, 'zone', 'keeper', 3, 1200, 40, 3, 20, 30, 2, 3, 'Guardian')`,
  ).run(id);
  const domain = db.prepare("INSERT INTO chambers_rule_domains VALUES (?,?,?)");
  for (let level = 40; level <= 50; level++)
    domain.run(id, "player_level", level);
  for (let v = 0; v <= 200; v++) domain.run(id, "veteran_points", v);
  for (let level = 37; level <= 56; level++)
    domain.run(id, "enemy_level", level);
  for (let room = 0; room < 3; room++) domain.run(id, "room_index", room);
  const bonus = db.prepare(
    "INSERT INTO chambers_veteran_level_bonuses VALUES (?,?,?)",
  );
  // Exported values: the bonus steps at 20 point intervals up to 100.
  for (let v = 0; v <= 200; v++)
    bonus.run(id, v, 1 + Math.floor(Math.min(v, 100) / 20));
  const offset = db.prepare(
    "INSERT INTO chambers_enemy_level_offsets VALUES (?,?,?,?,?)",
  );
  for (let o = -3; o <= 6; o++)
    offset.run(id, o, 7 - Math.abs(o), 1, o >= 0 ? 1 : 0);
  const experience = db.prepare(
    "INSERT INTO chambers_completion_experience VALUES (?,?,?)",
  );
  experience.run(id, 39, 0);
  experience.run(id, 40, 150000);
  experience.run(id, 50, 250000);
  const band = db.prepare(
    "INSERT INTO chambers_reward_bands VALUES (?,?,?,?,?,?,?,?,?)",
  );
  band.run(id, 0, 40, 49, 0, null, 1, 2, "uniform_integer");
  band.run(id, 1, 50, null, 0, 99, 1, 3, "uniform_integer");
  band.run(id, 2, 50, null, 100, 199, 2, 4, "uniform_integer");
  band.run(id, 3, 50, null, 200, null, 3, 5, "uniform_integer");
  const scaling = db.prepare(
    "INSERT INTO chambers_scaling VALUES (?,?,?,?,?,?,?)",
  );
  scaling.run(id, 40, 0, 0, 0, 4200, 180);
  scaling.run(id, 40, 0, 0, 1, 16800, 252);
  scaling.run(id, 40, 100, 2, 0, 9009, 297);
  return db;
}

const query =
  (db: Database.Database): AcquisitionQuery =>
  async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];

describe("Chambers rules", () => {
  it("picks one reward band at the level and veteran boundaries", async () => {
    const rules = await loadChambersRules(query(fixture()));
    const quantity = (level: number, veteran: number) => {
      const [band] = rewardBands(rules, level, veteran);
      return [band.minimumQuantity, band.maximumQuantity];
    };
    expect(quantity(49, 0)).toEqual([1, 2]);
    expect(quantity(49, 200)).toEqual([1, 2]);
    expect(quantity(50, 99)).toEqual([1, 3]);
    expect(quantity(50, 100)).toEqual([2, 4]);
    expect(quantity(50, 199)).toEqual([2, 4]);
    expect(quantity(50, 200)).toEqual([3, 5]);
  });

  it("returns every band the level allows when veteran points are unknown", async () => {
    const rules = await loadChambersRules(query(fixture()));
    expect(rewardBands(rules, 49, null)).toHaveLength(1);
    expect(rewardBands(rules, 50, null)).toHaveLength(3);
  });

  it("starts a guardian at the player's level and an ordinary enemy 3 below", async () => {
    const rules = await loadChambersRules(query(fixture()));
    const guardian = enemyLevelDistribution(rules, 40, 0, true);
    expect(guardian.map((row) => row.level)).toEqual([40, 41]);
    expect(guardian[0].probability).toBeCloseTo(7 / 13, 12);
    const ordinary = enemyLevelDistribution(rules, 40, 0, false);
    expect(ordinary.map((row) => row.level)).toEqual([37, 38, 39, 40, 41]);
    expect(ordinary.reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(
      1,
      12,
    );
    // 100 veteran points raise the bonus from 1 to 6.
    expect(enemyLevelDistribution(rules, 40, 100, true).at(-1)?.level).toBe(46);
    expect(enemyLevelDistribution(rules, 40, 99, true).at(-1)?.level).toBe(45);
  });

  it("reads rounded Health and Power and completion experience as exported", async () => {
    const rules = await loadChambersRules(query(fixture()));
    expect(enemyScaling(rules, 40, 0, 0, true)).toEqual({
      health: 16800,
      power: 252,
    });
    expect(enemyScaling(rules, 40, 100, 2, false)).toEqual({
      health: 9009,
      power: 297,
    });
    expect(completionExperience(rules, 50)).toBe(250000);
    expect(() => completionExperience(rules, 51)).toThrow(RangeError);
    // A level the table lacks is refused rather than interpolated.
    expect(() => enemyScaling(rules, 41, 0, 0, false)).toThrow(RangeError);
    expect(() => enemyScaling(rules, 40, 201, 0, false)).toThrow(RangeError);
    expect(() => enemyScaling(rules, 40, 0, 3, false)).toThrow(RangeError);
  });

  it("gives the same values whether every row or one veteran total is loaded", async () => {
    const db = fixture();
    const all = await loadChambersRules(query(db));
    const some = await loadChambersRules(query(db), { veteranPoints: [100] });
    expect(enemyScaling(some, 40, 100, 2, false)).toEqual(
      enemyScaling(all, 40, 100, 2, false),
    );
    expect(() => enemyScaling(some, 40, 0, 0, false)).toThrow(RangeError);
    expect(rewardBands(some, 50, 100)).toEqual(rewardBands(all, 50, 100));
  });
});
