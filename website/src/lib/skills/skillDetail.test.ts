import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  SKILL_DETAIL_COLUMNS,
  SKILL_DETAIL_JOINS,
  skillCastersFromRow,
  skillDetailFromRow,
} from "./skillDetail";

function fixture() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE skills (id TEXT, name TEXT, summoned_monster_id TEXT, pet_id TEXT, granted_by_items TEXT, required_skill_points INTEGER, max_level INTEGER);
    CREATE TABLE skill_predecessors (skill_id TEXT, ordinal INTEGER, predecessor_skill_id TEXT, rank INTEGER);
    CREATE TABLE pets (id TEXT, name TEXT, is_mercenary INTEGER, is_familiar INTEGER, type_monster TEXT);
    CREATE TABLE pet_skills (pet_id TEXT, skill_id TEXT, skill_index INTEGER);
    CREATE TABLE monsters (id TEXT, name TEXT);
    CREATE TABLE monster_skills (monster_id TEXT, skill_id TEXT);
    CREATE TABLE npcs (id TEXT, name TEXT);
    CREATE TABLE npc_skills (npc_id TEXT, skill_id TEXT, skill_index INTEGER);
    CREATE TABLE traps (effect_skill_id TEXT);
    CREATE TABLE items (id TEXT, weapon_category TEXT, potion_buff_id TEXT, cooldown_category TEXT, potion_buff_level INTEGER);
    CREATE TABLE item_class_requirements (item_id TEXT, class_id TEXT, withheld INTEGER DEFAULT 0);
    CREATE TABLE classes (id TEXT, name TEXT);
    INSERT INTO skills VALUES ('npc_attack', 'Attack', NULL, NULL, '[]', 0, 0);
    INSERT INTO npcs VALUES ('one', 'One'), ('two', 'Two');
    INSERT INTO npc_skills VALUES ('one', 'npc_attack', 0), ('one', 'npc_attack', 1), ('two', 'npc_attack', 0);
  `);
  return db;
}

describe("canonical NPC skill context", () => {
  it("counts distinct NPC casters without losing ordered membership", () => {
    const db = fixture();
    try {
      const row = db
        .prepare(
          `SELECT ${SKILL_DETAIL_COLUMNS} FROM skills s ${SKILL_DETAIL_JOINS} WHERE s.id = ?`,
        )
        .get("npc_attack") as Record<string, unknown>;
      expect(skillCastersFromRow(row).npcCount).toBe(2);
      expect(
        db
          .prepare(
            "SELECT skill_index FROM npc_skills WHERE npc_id = ? ORDER BY skill_index",
          )
          .all("one"),
      ).toEqual([{ skill_index: 0 }, { skill_index: 1 }]);
      expect(skillDetailFromRow(row).required_skill_points).toBe(0);
      expect(skillDetailFromRow(row).max_level).toBe(0);
    } finally {
      db.close();
    }
  });
  it("preserves withheld weapon class restrictions in effect contexts", () => {
    const db = fixture();
    try {
      db.exec(`
        UPDATE skills SET granted_by_items = '[{"item_id":"weapon","type":"weapon_proc"}]';
        INSERT INTO items (id, weapon_category) VALUES ('weapon', 'WeaponSword');
        INSERT INTO item_class_requirements VALUES ('weapon', NULL, 1);
      `);
      const row = db
        .prepare(
          `SELECT ${SKILL_DETAIL_COLUMNS} FROM skills s ${SKILL_DETAIL_JOINS} WHERE s.id = ?`,
        )
        .get("npc_attack") as Record<string, unknown>;
      expect(skillCastersFromRow(row).weaponProcs).toEqual([
        {
          classes: [],
          weaponCategory: "WeaponSword",
          classRestrictionsWithheld: true,
        },
      ]);
    } finally {
      db.close();
    }
  });
  it("keeps distinct potion ranks and excludes Bandages from endurance scaling", () => {
    const db = fixture();
    try {
      db.exec(`
        UPDATE skills SET granted_by_items = '[
          {"item_id":"first","type":"potion_buff"},
          {"item_id":"same_rank","type":"potion_buff"},
          {"item_id":"higher","type":"potion_buff"},
          {"item_id":"bandage","type":"potion_buff"},
          {"item_id":"scroll","type":"scroll"}
        ]';
        INSERT INTO items (id,potion_buff_id,cooldown_category,potion_buff_level) VALUES
          ('first','npc_attack',NULL,2),
          ('same_rank','npc_attack','Potions',2),
          ('higher','npc_attack','Potions',5),
          ('bandage','npc_attack','Bandages',9),
          ('scroll',NULL,'Scrolls',NULL);
      `);
      const row = db
        .prepare(
          `SELECT ${SKILL_DETAIL_COLUMNS} FROM skills s ${SKILL_DETAIL_JOINS} WHERE s.id = ?`,
        )
        .get("npc_attack") as Record<string, unknown>;
      expect(
        skillCastersFromRow(row).potionBuffLevels.sort((a, b) => a - b),
      ).toEqual([2, 5]);
    } finally {
      db.close();
    }
  });
});
