import { describe, expect, it } from "vitest";
import {
  createSearchPayload,
  loadSearchIndex,
  rankSearch,
  type IndexedDoc,
} from "./engine";

function doc(
  id: string,
  name: string,
  kind: IndexedDoc["kind"] = "item",
): IndexedDoc {
  return {
    id,
    name,
    kind,
    href: `/${kind}/${id}`,
    label: kind,
    detail: null,
    image: null,
    aliases: "",
    keywords: "",
    content: "",
  };
}

const docs = [
  doc("iron-sword", "Iron Sword"),
  doc("iron-shield", "Iron Shield"),
  doc("experience", "Experience Guide", "page"),
  doc("health", "Health Potion"),
  doc("amber-1", "Amber Stone"),
  doc("amber-2", "Amber Stone"),
  doc("chest", "Hidden Chest", "chest"),
];
const loaded = loadSearchIndex(
  JSON.parse(JSON.stringify(createSearchPayload(docs))),
);
const names = (query: string, scope: "palette" | "map" = "palette") =>
  rankSearch(loaded, query, { scope, limit: 10 }).map(
    ({ doc: result }) => result.id,
  );

describe("fixture search ranking", () => {
  it("ranks an exact name above a prefix match and finds unfinished words", () => {
    expect(names("iron sword")[0]).toBe("iron-sword");
    expect(names("iron sh")).toEqual(["iron-shield"]);
  });

  it("expands whole-word player abbreviations without matching unrelated words", () => {
    expect(names("xp")[0]).toBe("experience");
    expect(names("hp")[0]).toBe("health");
  });

  it("keeps index order for equal-ranking documents and excludes placements from palette", () => {
    expect(names("amber stone")).toEqual(["amber-1", "amber-2"]);
    expect(names("hidden chest")).toEqual([]);
    expect(names("hidden chest", "map")).toEqual(["chest"]);
  });
});
