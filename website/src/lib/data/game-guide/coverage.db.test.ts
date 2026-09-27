import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { missingAnchors } from "$lib/testing/route-anchors";
import { describe, expect, test } from "vitest";
import { guideCoverage } from "./coverage";

interface ArticleRow {
  id: string;
  body: string;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("Adventurer's Guide coverage", () => {
  const db = new Database("data/compendium.db", { readonly: true });
  const articles = db
    .prepare("SELECT id, body FROM game_guide_articles ORDER BY id")
    .all() as ArticleRow[];
  db.close();

  test("the export holds the guide", () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  test("every article maps to a section, and every mapping to an article", () => {
    const exported = new Set(articles.map((article) => article.id));
    const mapped = new Set(Object.keys(guideCoverage));
    expect([...exported].filter((id) => !mapped.has(id))).toEqual([]);
    expect([...mapped].filter((id) => !exported.has(id))).toEqual([]);
  });

  test("no article changed since its section was reviewed", () => {
    const changed = articles
      .filter(
        (article) =>
          guideCoverage[article.id] &&
          guideCoverage[article.id].reviewedBodySha256 !== sha256(article.body),
      )
      .map((article) => article.id);
    expect(changed).toEqual([]);
  });

  test("every mapped section exists on its page", () => {
    const hrefs = Object.values(guideCoverage).map(({ href }) => href);
    expect(missingAnchors(hrefs)).toEqual([]);
  });
});
