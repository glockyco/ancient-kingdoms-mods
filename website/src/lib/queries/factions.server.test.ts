import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query, queryOne } from "$lib/db.server";
import { getFactionDetail } from "./factions.server";

vi.mock("$lib/db.server", () => ({ query: vi.fn(), queryOne: vi.fn() }));

let db: Database.Database;
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE chests (id TEXT, name TEXT, zone_id TEXT, decrease_faction TEXT,
      chest_reward_probability REAL, item_reward_id TEXT, gold_min INTEGER, gold_max INTEGER);
    CREATE TABLE zones (id TEXT, name TEXT);
    CREATE TABLE visual_assets (domain TEXT, entity_id TEXT, kind TEXT, public_path TEXT);
    INSERT INTO chests VALUES
      ('gold', 'Gold chest', NULL, 'Elven Kingdom', 0.75, NULL, 5, 10),
      ('item', 'Item chest', NULL, 'Army of Order', 0.1, 'reward', 0, 0),
      ('empty', 'Empty chest', NULL, 'Elven Kingdom', 0.75, NULL, 0, 0),
      ('no_roll', 'No roll', NULL, 'Elven Kingdom', 0, 'reward', 0, 0),
      ('ordinary', 'Ordinary chest', NULL, '', 1, NULL, 5, 10);
  `);
  vi.mocked(queryOne).mockImplementation(
    (_sql, params = []) =>
      ({
        id: params[0],
        name: params[0] === "the_forsaken" ? "The Forsaken" : "Elven Kingdom",
      }) as never,
  );
  vi.mocked(query).mockImplementation((sql, params = []) =>
    sql.includes("FROM chests")
      ? (db.prepare(sql).all(...params) as never)
      : [],
  );
});
afterEach(() => {
  db.close();
  vi.clearAllMocks();
});

describe("faction chest reputation sources", () => {
  it("lists configured faction rewards as Forsaken gains, independent of reward chance", () => {
    expect(
      getFactionDetail("the_forsaken")!
        .chests.map((chest) => chest.id)
        .sort(),
    ).toEqual(["gold", "item"]);
  });
  it("keeps the matching faction's chest list separate from Forsaken gains", () => {
    expect(
      getFactionDetail("elven_kingdom")!
        .chests.map((chest) => chest.id)
        .sort(),
    ).toEqual(["gold"]);
  });
});
