import { describe, expect, test } from "vitest";
import { Package, Sparkles, Skull, Users } from "lucide";
import {
  entityIds,
  entityRegistry,
  searchableEntities,
  sitemapEntities,
} from "./registry";

describe("entity registry", () => {
  test("registers each entity family exactly once", () => {
    expect(new Set(entityIds).size).toBe(entityIds.length);
    expect(Object.keys(entityRegistry).sort()).toEqual([...entityIds].sort());
  });

  test("every searchable family has a navigable detail target", () => {
    for (const entityType of searchableEntities) {
      const def = entityRegistry[entityType];
      expect(def.detailHref("sample_id")).toMatch(/^\//);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.pluralLabel.length).toBeGreaterThan(0);
    }
  });

  test("uses family glyphs for compact fallback results", () => {
    expect(entityRegistry.item.icon).toBe(Package);
    expect(entityRegistry.skill.icon).toBe(Sparkles);
    expect(entityRegistry.monster.icon).toBe(Skull);
    expect(entityRegistry.npc.icon).toBe(Users);
  });

  test("sitemap metadata is derived from the same registry", () => {
    expect(sitemapEntities).toEqual(
      expect.arrayContaining([
        { table: "items", route: "items" },
        { table: "monsters", route: "monsters" },
        { table: "gathering_resources", route: "gather-items" },
      ]),
    );
  });
});
