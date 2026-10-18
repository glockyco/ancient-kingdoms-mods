import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { AcquisitionQuery, AcquisitionRequest } from "./types";
import { queryAcquisitionRows } from "./queries";
import { assembleAcquisitionModel } from "./assemble";
import { publicAcquisitionFingerprint } from "./fingerprint";

describe("canonical model over the built database", () => {
  it("projects every exported skill with its native learning range and distinct NPC casters", async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const skills = db
        .prepare<
          [],
          {
            id: string;
            max_level: number;
            learn_default: number;
            player_classes: string | null;
          }
        >("SELECT id,max_level,learn_default,player_classes FROM skills")
        .all();
      expect(skills.length).toBeGreaterThan(0);
      const request: AcquisitionRequest = {
        kind: "requirements",
        entities: skills.map((skill) => ({ kind: "skill", id: skill.id })),
      };
      const execute: AcquisitionQuery = async (sql, params) =>
        db.prepare<unknown[], Record<string, unknown>>(sql).all(...params);
      const model = assembleAcquisitionModel(
        await queryAcquisitionRows(execute, request),
      );
      for (const skill of skills) {
        const playerClasses = JSON.parse(skill.player_classes ?? "[]");
        const firstLearningRank = skill.learn_default ? 2 : 1;
        expect(model.requirements.has(`skill:${skill.id}`)).toBe(
          playerClasses.length > 0 && firstLearningRank <= skill.max_level,
        );
      }
      expect(publicAcquisitionFingerprint(model, request)).toMatchObject({
        entities: expect.arrayContaining([
          expect.objectContaining({
            entity: { kind: "skill", id: "npc_attack" },
            learning: null,
            npcCasters: expect.any(Array),
          }),
        ]),
      });
      const expectedCasters = db
        .prepare<[string], { count: number }>(
          "SELECT count(DISTINCT npc_id) AS count FROM npc_skills WHERE skill_id=?",
        )
        .get("npc_attack")!;
      expect(expectedCasters.count).toBeGreaterThan(0);
      expect(
        new Set(
          model.rows.facts.npc_skills
            .filter((row) => row.skill_id === "npc_attack")
            .map((row) => row.npc_id),
        ).size,
      ).toBe(expectedCasters.count);
    } finally {
      db.close();
    }
  });
});
