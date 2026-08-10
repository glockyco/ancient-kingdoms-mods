import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { entityImageUrl, type EntityImageDomain } from "./entityImage";

interface VisualAssetRow {
  domain: EntityImageDomain;
  entity_id: string;
  kind: string;
  public_path: string;
}

describe("entityImageUrl", () => {
  test("matches every published visual asset path", () => {
    const db = new Database("static/compendium.db", { readonly: true });
    try {
      const rows = db
        .prepare(
          "SELECT domain, entity_id, kind, public_path FROM visual_assets",
        )
        .all() as VisualAssetRow[];

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(entityImageUrl(row.domain, row.entity_id, row.kind)).toBe(
          `/${row.public_path}`,
        );
      }
    } finally {
      db.close();
    }
  });

  test("rejects ids that cannot be published verbatim", () => {
    expect(() => entityImageUrl("item", "bad/id", "icon")).toThrow(
      "Invalid entity id",
    );
    expect(() => entityImageUrl("item", "helm", "bad/kind")).toThrow(
      "Invalid artwork kind",
    );
  });
});
