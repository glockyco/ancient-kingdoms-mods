#!/usr/bin/env tsx

import Database from "better-sqlite3";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { STEAM_GUIDE_URL } from "../src/lib/constants/links.ts";
import {
  achievementGroupDetails,
  achievementGroupOrder,
  achievementGroups,
} from "../src/lib/data/achievements/catalog.ts";
import {
  achievementAnchor,
  achievementRelationships,
} from "../src/lib/data/achievements/relationships.ts";

const SITE_ORIGIN = "https://ancient-kingdoms.compendiums.org";
const CANONICAL_URL = `${SITE_ORIGIN}/achievements`;

interface AchievementRow {
  id: string;
  name: string;
  description: string;
  hidden: number;
  display_order: number;
}

function escapeBbcode(value: string): string {
  return value.replaceAll("[", "&#91;").replaceAll("]", "&#93;");
}

export function renderAchievementsSteamGuide(dbPath: string): string {
  const db = new Database(dbPath, { readonly: true });
  let rows: AchievementRow[];
  try {
    rows = db
      .prepare(
        `
        SELECT id, name, description, hidden, display_order
        FROM achievements
        ORDER BY display_order
      `,
      )
      .all() as AchievementRow[];
  } finally {
    db.close();
  }

  if (rows.length !== 38) {
    throw new Error(`Expected 38 achievements, found ${rows.length}`);
  }

  const lines = [
    "[h1]Ancient Kingdoms Achievement Guide[/h1]",
    "",
    `This guide lists all 38 Steam achievements. The compendium page is the canonical version: [url=${CANONICAL_URL}]${CANONICAL_URL}[/url]`,
    "",
    `For the full compendium index, read [url=${STEAM_GUIDE_URL}]Ancient Kingdoms Compendium[/url].`,
    "",
    "The website updates from current game data. This guide does not include global completion percentages because those values change independently.",
  ];

  for (const groupId of achievementGroupOrder) {
    const groupRows = rows.filter(
      (row) => achievementGroups[row.id] === groupId,
    );
    lines.push("", `[h1]${achievementGroupDetails[groupId].name}[/h1]`, "");
    lines.push(achievementGroupDetails[groupId].description, "");

    for (const row of groupRows) {
      const anchor = achievementAnchor(row.id);
      const name = row.hidden ? "Hidden achievement" : escapeBbcode(row.name);
      const description = row.hidden
        ? "Steam does not show the unlock condition."
        : escapeBbcode(row.description);
      lines.push(
        `[h2][url=${CANONICAL_URL}#${anchor}]${name}[/url][/h2]`,
        description,
      );

      const relationships = achievementRelationships[row.id] ?? [];
      if (relationships.length > 0) {
        const links = relationships.map(
          (relationship) =>
            `[url=${SITE_ORIGIN}${relationship.href}]${escapeBbcode(relationship.label)}[/url]`,
        );
        lines.push(`Related guide: ${links.join(" · ")}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const projectRoot = resolve(dirname(scriptPath), "..");
  const outputPath = resolve(
    projectRoot,
    "generated/steam-achievements-guide.bbcode",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    renderAchievementsSteamGuide(resolve(projectRoot, "static/compendium.db")),
  );
  console.log(`Wrote ${outputPath}`);
}
