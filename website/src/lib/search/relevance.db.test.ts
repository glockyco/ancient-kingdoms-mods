import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { buildSearchDocuments } from "$lib/server/search/documents";
import { ROLE_CONFIG } from "$lib/utils/roles";
import { missingAnchors } from "$lib/testing/route-anchors";
import { describe, expect, test } from "vitest";
import {
  createSearchPayload,
  loadSearchIndex,
  PLACEMENT_KINDS,
  rankSearch,
  type SearchPayload,
  type SearchScope,
} from "./engine";
import {
  DEVELOPMENT_CASES,
  HELD_OUT_CASES,
  TUNING_CASES,
  type JudgedCase,
} from "./judged/cases";
import { FILTERED_LISTS } from "./lists";
import { tokenize } from "./normalize";
import { SYNONYMS } from "./synonyms";

const db = new Database("data/compendium.db", { readonly: true });
const docs = buildSearchDocuments(db);
// Round-trip through JSON so the tests load exactly what the browser loads.
const serialized = JSON.stringify(createSearchPayload(docs));
const loaded = loadSearchIndex(JSON.parse(serialized) as SearchPayload);

function search(text: string, scope: SearchScope = "palette", limit = 10) {
  return rankSearch(loaded, text, { scope, limit }).map(({ doc }) => doc);
}

function passing(cases: readonly JudgedCase[]): JudgedCase[] {
  return cases.filter((judged) =>
    search(judged.q)
      .slice(0, judged.k)
      .some((doc) => judged.expect.includes(doc.href)),
  );
}

/**
 * Passing counts recorded when the ranking settings were last changed. A lower
 * count is a regression; a higher count means these numbers need updating.
 */
const RECORDED_PASSES = { tuning: 94, development: 142, heldOut: 127 };

/** Sampled entities whose every query variant passes, out of all sampled. */
const RECORDED_ENTITY_PASSES = {
  development: { entities: 36, passes: 33 },
  heldOut: { entities: 35, passes: 31 },
};

describe("judged relevance", () => {
  test.each([
    ["tuning", TUNING_CASES],
    ["development", DEVELOPMENT_CASES],
    ["heldOut", HELD_OUT_CASES],
  ] as const)("%s cases keep their recorded pass count", (name, cases) => {
    const passed = new Set(passing(cases));
    const failed = cases
      .filter((judged) => !passed.has(judged))
      .map((judged) => `${judged.intent}: ${judged.q}`);
    expect({ passes: passed.size, failed }).toMatchObject({
      passes: RECORDED_PASSES[name],
    });
  });

  // Sampled cases come in variants of one entity: its exact name, a prefix,
  // and a typo. An entity passes only when every variant passes.
  test.each([
    ["development", DEVELOPMENT_CASES],
    ["heldOut", HELD_OUT_CASES],
  ] as const)(
    "%s sampled entities keep their recorded pass count",
    (name, cases) => {
      const passed = new Set(passing(cases));
      // An exact-name case exists for every sampled entity. A typo case accepts
      // the same destinations, and a prefix case accepts one of them.
      const entities = new Map<string, JudgedCase[]>(
        cases
          .filter((judged) => judged.intent === "exact")
          .map((judged) => [judged.expect.join(" "), [judged]]),
      );
      const orphans: string[] = [];
      for (const judged of cases) {
        if (judged.intent !== "typo" && judged.intent !== "prefix") continue;
        const key =
          judged.intent === "typo"
            ? judged.expect.join(" ")
            : [...entities.keys()].find((candidate) =>
                candidate.split(" ").includes(judged.expect[0]),
              );
        const variants = key ? entities.get(key) : undefined;
        if (variants) variants.push(judged);
        else orphans.push(judged.q);
      }
      expect(orphans).toEqual([]);
      const failed = [...entities]
        .filter(
          ([, variants]) => !variants.every((judged) => passed.has(judged)),
        )
        .map(([key]) => key);
      expect({
        entities: entities.size,
        passes: entities.size - failed.length,
        failed,
      }).toMatchObject(RECORDED_ENTITY_PASSES[name]);
    },
  );

  test("every guide article title returns its own section first three", () => {
    const articles = db
      .prepare("SELECT id, title FROM game_guide_articles")
      .all() as Array<{ id: string; title: string }>;
    const guideDocs = docs.filter((doc) => doc.kind === "guide_topic");
    const missing = articles.filter(({ id, title }) => {
      const href = guideDocs.find((doc) => doc.id === id)?.href;
      return !search(title)
        .slice(0, 3)
        .some((doc) => doc.kind === "guide_topic" && doc.href === href);
    });
    expect(missing.map(({ title }) => title)).toEqual([]);
  });

  test("every synonym has a judged case", () => {
    const judged = new Set(
      [...TUNING_CASES, ...DEVELOPMENT_CASES, ...HELD_OUT_CASES].flatMap(
        (judgedCase) => tokenize(judgedCase.q),
      ),
    );
    expect(Object.keys(SYNONYMS).filter((word) => !judged.has(word))).toEqual(
      [],
    );
  });
});

describe("ranking contract", () => {
  test("a word inside a name finds the name", () => {
    const names = search("sword").map((doc) => doc.name);
    expect(names).toEqual(
      expect.arrayContaining(["Iron Sword", "Rusty Sword"]),
    );
  });

  test("a full name with two adjacent letters swapped comes first", () => {
    expect(search("Depsair")[0]).toMatchObject({
      kind: "zone",
      name: "Despair",
    });
  });

  test("an abbreviation opens its page", () => {
    expect(search("xp").map((doc) => doc.href)).toContain(
      "/mechanics/experience",
    );
  });

  test("a service query opens the filtered list before similar words", () => {
    const results = search("banker");
    expect(results[0].href).toBe("/npcs?npcs.role_keys=is_bank");
    const firstUnrelated = results.findIndex((doc) =>
      /barber|soul binder/i.test(doc.name),
    );
    expect(firstUnrelated).toBe(-1);
  });

  test("a guide title opens its section", () => {
    expect(search("Need, Greed")[0]).toMatchObject({
      name: "Need, Greed, and Pass",
      href: "/mechanics/party#loot-rolls",
    });
  });

  test("an area name finds its zone", () => {
    expect(search("Milldenn").map((doc) => doc.href)).toContain(
      "/zones/crescent_coast",
    );
  });
});

describe("search scopes", () => {
  test("the palette leaves out map placements, and the map keeps them", () => {
    const palette = search("Milldenn", "palette", 50);
    expect(palette.filter((doc) => PLACEMENT_KINDS.has(doc.kind))).toEqual([]);
    // The map search shows 20 results.
    const map = search("Milldenn", "map", 20);
    expect(map.filter((doc) => doc.kind === "portal").length).toBeGreaterThan(
      0,
    );
  });

  test("the map keeps each placement, even where they share a destination", () => {
    const portals = search("Twisted Haunt", "map", 100).filter(
      (doc) => doc.kind === "portal",
    );
    expect(portals.length).toBeGreaterThan(1);
  });

  test("the map scope finds an entity of every map category by name", () => {
    const mapKinds = [
      "monster",
      "npc",
      "zone",
      "gathering_resource",
      "chest",
      "treasure",
      "altar",
      "house",
      "trap",
      "crafting_station",
      "alchemy_table",
      "scribing_table",
      "portal",
      "item",
      "quest",
    ] as const;
    const missing = mapKinds.filter((kind) => {
      const doc = docs.find((candidate) => candidate.kind === kind);
      if (!doc) return true;
      return !rankSearch(loaded, doc.name, { scope: "map", limit: 100 }).some(
        ({ doc: found }) => found.kind === kind && found.id === doc.id,
      );
    });
    expect(missing).toEqual([]);
  });

  test("the map scope finds houses by their keywords", () => {
    const houses = search("housing", "map", 50).filter(
      (doc) => doc.kind === "house",
    );
    expect(houses.length).toBeGreaterThan(0);
  });
});

describe("indexed content", () => {
  test("every Notable NPC is found and carries its classification", () => {
    const notable = (
      db.prepare("SELECT id FROM npcs WHERE is_notable = 1").all() as Array<{
        id: string;
      }>
    ).map(({ id }) => id);
    expect(notable.length).toBeGreaterThan(0);
    const rows = search("notable", "palette", 50).filter(
      (doc) => doc.kind === "npc",
    );
    for (const id of notable) {
      expect(rows.find((doc) => doc.id === id)).toMatchObject({
        detail: "Notable",
      });
    }
  });

  test("barber searches return barbers and no bank-only NPC", () => {
    const npcs = search("barber", "palette", 50).filter(
      (doc) => doc.kind === "npc",
    );
    const roles = new Map(
      (
        db.prepare("SELECT id, roles FROM npcs").all() as Array<{
          id: string;
          roles: string | null;
        }>
      ).map(({ id, roles }) => [id, JSON.parse(roles ?? "{}")]),
    );
    expect(npcs.length).toBeGreaterThan(0);
    expect(npcs.filter((doc) => !roles.get(doc.id)?.is_barber)).toEqual([]);
  });

  test("item comments are not searchable", () => {
    // A word that occurs only in the comment proves the comment is unindexed.
    const fixture = new Database(":memory:");
    fixture.exec(readFileSync("../build-pipeline/schema.sql", "utf8"));
    fixture
      .prepare("INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)")
      .run("unknown", 0, "Unknown");
    fixture
      .prepare(
        "INSERT INTO items (id, name, item_type, tooltip, comments) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        "soul_ember",
        "Soul Ember",
        "general",
        "Glowing fragments from defeated bosses.",
        "Used to buy skins in Skin Vendor",
      );
    const index = loadSearchIndex(
      createSearchPayload(buildSearchDocuments(fixture)),
    );
    fixture.close();
    const found = (text: string) =>
      rankSearch(index, text, { scope: "palette", limit: 10 }).map(
        ({ doc }) => doc.id,
      );
    expect(found("glowing")).toContain("soul_ember");
    expect(found("skins")).not.toContain("soul_ember");
  });

  test("every page and filtered list opens a route that exists", () => {
    const hrefs = docs
      .filter((doc) => doc.kind === "page" || doc.kind === "list")
      .map((doc) => doc.href.split("?")[0]);
    expect(missingAnchors(hrefs)).toEqual([]);
  });

  test("every NPC service role has a filtered list", () => {
    const listed = new Set(
      FILTERED_LISTS.filter((list) => list.filter.kind === "npc-role").map(
        (list) => list.filter.value,
      ),
    );
    expect(
      ROLE_CONFIG.map((role) => role.key).filter((key) => !listed.has(key)),
    ).toEqual([]);
  });

  test("every filtered list matches rows in the data", () => {
    const count: Record<string, (value: string) => number> = {
      "item-slot": (value) =>
        (
          db
            .prepare("SELECT count(*) n FROM items WHERE slot = ?")
            .get(value) as { n: number }
        ).n,
      "item-type": (value) =>
        (
          db
            .prepare("SELECT count(*) n FROM items WHERE item_type = ?")
            .get(value) as { n: number }
        ).n,
      "npc-role": (value) =>
        (
          db
            .prepare(
              "SELECT count(*) n FROM npcs WHERE json_extract(roles, '$.' || ?) = 1",
            )
            .get(value) as { n: number }
        ).n,
      "monster-class": (value) =>
        (
          db
            .prepare(
              `SELECT count(*) n FROM monsters WHERE CASE
                 WHEN is_fabled THEN 'fabled' WHEN is_boss THEN 'boss'
                 WHEN is_elite THEN 'elite' ELSE 'regular' END = ?`,
            )
            .get(value) as { n: number }
        ).n,
    };
    const empty = FILTERED_LISTS.filter(
      (list) => count[list.filter.kind](list.filter.value) === 0,
    ).map((list) => list.name);
    expect(empty).toEqual([]);
  });

  test("no removed entity is named in the index", () => {
    const ledger = JSON.parse(
      readFileSync("../redactions.lock.json", "utf8"),
    ) as { removed: Record<string, unknown> };
    const removed = Object.keys(ledger.removed).map((key) =>
      key.split(":").slice(1).join(":"),
    );
    expect(removed.length).toBeGreaterThan(0);
    const named = removed.filter((id) =>
      new RegExp(
        `(^|[^A-Za-z0-9_])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_]|$)`,
      ).test(serialized),
    );
    expect(named).toEqual([]);
  });
});
