import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query, queryOne } from "$lib/db.server";
import { getFactionDetail } from "./factions.server";

vi.mock("$lib/db.server", () => ({ query: vi.fn(), queryOne: vi.fn() }));

let db: Database.Database;
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE chests (id TEXT, name TEXT, zone_id TEXT);
    CREATE TABLE zones (id TEXT, name TEXT);
    CREATE TABLE visual_assets (domain TEXT, entity_id TEXT, kind TEXT, public_path TEXT);
    CREATE TABLE factions (id TEXT, name TEXT);
    CREATE TABLE acquisition_methods (id TEXT, rooted INTEGER);
    CREATE TABLE acquisition_providers_chests (method_id TEXT, chest_id TEXT);
    CREATE TABLE acquisition_faction_effects (method_id TEXT, faction_id TEXT, delta INTEGER);
    CREATE TABLE quests (id TEXT, name TEXT);
    CREATE TABLE quest_faction_requirements (quest_id TEXT, faction_id TEXT, standing INTEGER);
    CREATE TABLE npc_quest_memberships (quest_id TEXT, npc_id TEXT, role TEXT);
    CREATE TABLE npcs (id TEXT, name TEXT);
    INSERT INTO quests VALUES ('quest', 'Shared quest');
    INSERT INTO quest_faction_requirements VALUES ('quest', 'elven_kingdom', 1000);
    INSERT INTO npcs VALUES ('giver_a', 'First giver'), ('giver_b', 'Second giver');
    INSERT INTO npc_quest_memberships VALUES
      ('quest', 'giver_a', 'offer'), ('quest', 'giver_b', 'offer');
    INSERT INTO factions VALUES
      ('the_forsaken', 'The Forsaken'), ('elven_kingdom', 'Elven Kingdom'),
      ('army_of_order', 'Army of Order');
    INSERT INTO acquisition_methods VALUES ('gold_method', 1), ('item_method', 1), ('unrooted', 0);
    INSERT INTO acquisition_providers_chests VALUES
      ('gold_method', 'gold'), ('item_method', 'item'), ('unrooted', 'empty');
    INSERT INTO acquisition_faction_effects VALUES
      ('gold_method', 'the_forsaken', 200), ('gold_method', 'elven_kingdom', -200),
      ('item_method', 'the_forsaken', 200), ('item_method', 'army_of_order', -200),
      ('unrooted', 'the_forsaken', 200);
    INSERT INTO chests VALUES
      ('gold', 'Gold chest', NULL),
      ('item', 'Item chest', NULL),
      ('empty', 'Empty chest', NULL),
      ('no_roll', 'No roll', NULL),
      ('ordinary', 'Ordinary chest', NULL);
  `);
  vi.mocked(queryOne).mockImplementation(
    (_sql, params = []) =>
      ({
        id: params[0],
        name: params[0] === "the_forsaken" ? "The Forsaken" : "Elven Kingdom",
      }) as never,
  );
  vi.mocked(query).mockImplementation((sql, params = []) =>
    sql.includes("FROM chests") ||
    sql.includes("JOIN quest_faction_requirements req")
      ? (db.prepare(sql).all(...params) as never)
      : [],
  );
});
afterEach(() => {
  db.close();
  vi.clearAllMocks();
});

describe("faction chest reputation sources", () => {
  it("lists rooted canonical faction effects independently of reward chance", () => {
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
  it("keeps every exact offering NPC without duplicating a quest requirement", () => {
    expect(getFactionDetail("elven_kingdom")!.questRequirements).toEqual([
      {
        id: "quest",
        name: "Shared quest",
        required_value: 1000,
        givers: [
          { id: "giver_a", name: "First giver" },
          { id: "giver_b", name: "Second giver" },
        ],
      },
    ]);
  });
});
