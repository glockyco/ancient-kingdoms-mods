import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { AcquisitionQuery, AcquisitionRequest } from "./types";
import { queryAcquisitionRows } from "./queries";
import { assembleAcquisitionModel } from "./assemble";
import { publicAcquisitionFingerprint } from "./fingerprint";
import {
  projectItemSeasons,
  projectItemSources,
  projectMethodSeasons,
} from "./projections";
import { SEASONS } from "../data/seasonal-events";

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

  it("reads method and item seasons from the published season data", async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const seasonIds = db
        .prepare<[], { id: string }>("SELECT id FROM seasons ORDER BY ordinal")
        .all()
        .map((row) => row.id);
      expect(seasonIds).toEqual(Object.keys(SEASONS));
      const execute: AcquisitionQuery = async (sql, params) =>
        db.prepare<unknown[], Record<string, unknown>>(sql).all(...params);
      const items = [
        "spook_token",
        "pack_3_festival_token",
        "winter_festival_coin",
        "pack_10_skyflares",
        "bread",
      ];
      const model = assembleAcquisitionModel(
        await queryAcquisitionRows(execute, { kind: "items", itemIds: items }),
      );
      const awards = (itemId: string) =>
        projectItemSources(model, itemId).methods;

      const drops = awards("spook_token");
      expect(drops.length).toBeGreaterThan(0);
      for (const method of drops)
        expect(projectMethodSeasons(model, method)).toEqual(["halloween"]);

      const rewards = awards("pack_3_festival_token");
      expect(rewards.map((method) => method.kind)).toEqual(
        rewards.map(() => "quest_complete"),
      );
      for (const method of rewards)
        expect(projectMethodSeasons(model, method)).toEqual(["christmas"]);
      const atGrimnir = rewards.find((method) =>
        method.providers.some(
          (provider) => provider.ref.id === "grimnir_stonehammer",
        ),
      )!;
      expect(
        atGrimnir.requirements.some((root) =>
          JSON.stringify(root.expression).includes("season_active"),
        ),
      ).toBe(false);

      expect(projectItemSeasons(model, "winter_festival_coin")).toEqual([
        "christmas",
      ]);
      expect(projectItemSeasons(model, "pack_10_skyflares")).toEqual([
        "halloween",
        "christmas",
      ]);
      expect(projectItemSeasons(model, "bread")).toEqual([]);
    } finally {
      db.close();
    }
  });
});
