import { resolve } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { renderAchievementsSteamGuide } from "./generate-achievements-steam-guide";

const dbPath = resolve("static/compendium.db");

describe("achievement Steam guide generator", () => {
  it("renders every achievement once in Steam-safe BBCode", () => {
    const guide = renderAchievementsSteamGuide(dbPath);
    const db = new Database(dbPath, { readonly: true });
    const achievements = db
      .prepare("SELECT id, name FROM achievements ORDER BY display_order")
      .all();
    db.close();

    expect(achievements).toHaveLength(38);
    expect(guide.match(/\[h2\]/g)).toHaveLength(38);
    for (const achievement of achievements) {
      expect(
        guide.match(
          new RegExp(
            `\\[h2\\]\\[url=[^\\]]+\\]${achievement.name.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            )}\\[/url\\]\\[/h2\\]`,
            "g",
          ),
        ),
      ).toHaveLength(1);
    }
    expect(guide).not.toContain("[script]");
    expect(guide).not.toContain("javascript:");
  });

  it("uses canonical HTTPS links and deterministic output", () => {
    const first = renderAchievementsSteamGuide(dbPath);
    const second = renderAchievementsSteamGuide(dbPath);
    const urls = [...first.matchAll(/\[url=([^\]]+)\]/g)].map(
      (match) => match[1],
    );

    expect(first).toBe(second);
    expect(urls.length).toBeGreaterThan(38);
    expect(urls.every((url) => url.startsWith("https://"))).toBe(true);
    expect(
      urls.filter((url) =>
        url.startsWith("https://ancient-kingdoms.compendiums.org/"),
      ).length,
    ).toBeGreaterThan(38);
    expect(first).toContain(
      "https://ancient-kingdoms.compendiums.org/achievements",
    );
  });
});
