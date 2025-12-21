import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

export const prerender = true;

interface SourceSummary {
  type: "drop" | "quest" | "merge" | "unknown";
  label: string;
  linkHref?: string;
}

interface LoreBook {
  id: string;
  name: string;
  tooltip_html: string | null;
  book_text: string;
  obtainabilityTree: ObtainabilityNode;
  sourceSummary: SourceSummary;
}

interface LoreKeepingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    tracking_type: string;
    tracking_denominator: number | null;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  books: LoreBook[];
}

interface RawBook {
  id: string;
  name: string;
  tooltip_html: string | null;
  book_text: string;
  dropped_by: string | null;
  rewarded_by: string | null;
}

interface DropInfo {
  monster_id: string;
  monster_name: string;
}

interface QuestInfo {
  quest_id: string;
  quest_name: string;
}

export const load: PageServerLoad = (): LoreKeepingPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      tracking_type,
      tracking_denominator,
      steam_achievement_id,
      steam_achievement_name
    FROM professions
    WHERE id = 'lore_keeping'
  `,
    )
    .get() as LoreKeepingPageData["profession"];

  const rawBooks = db
    .prepare(
      `
    SELECT
      id,
      name,
      tooltip_html,
      book_text,
      dropped_by,
      rewarded_by
    FROM items
    WHERE book_text IS NOT NULL AND book_text != ''
    ORDER BY name
  `,
    )
    .all() as RawBook[];

  // Build obtainability trees and source summaries for each book
  const books: LoreBook[] = rawBooks.map((raw) => {
    const visited = new Set<string>();
    const obtainabilityTree = buildObtainabilityTree(
      db,
      raw.id,
      1,
      0,
      visited,
      true,
    );

    const sourceSummary = getSourceSummary(db, raw, obtainabilityTree);

    return {
      id: raw.id,
      name: raw.name,
      tooltip_html: raw.tooltip_html,
      book_text: raw.book_text,
      obtainabilityTree,
      sourceSummary,
    };
  });

  db.close();

  return { profession, books };
};

function getSourceSummary(
  db: Database.Database,
  raw: RawBook,
  tree: ObtainabilityNode,
): SourceSummary {
  // Check for merge first (from obtainability tree)
  if (tree.merge && tree.merge.materials.length > 0) {
    const materials = tree.merge.materials;
    const firstName = materials[0].item_name;
    const moreCount = materials.length - 1;
    return {
      type: "merge",
      label:
        moreCount > 0 ? `${firstName} + ${moreCount} more` : `${firstName}`,
    };
  }

  // Check for monster drops
  if (raw.dropped_by) {
    const drops = JSON.parse(raw.dropped_by) as DropInfo[];
    if (drops.length > 0) {
      const monster = drops[0];
      // Get zone name for the monster
      const zoneName = getMonsterZone(db, monster.monster_id);
      return {
        type: "drop",
        label: zoneName
          ? `${monster.monster_name} (${zoneName})`
          : monster.monster_name,
        linkHref: `/monsters/${monster.monster_id}`,
      };
    }
  }

  // Check for quest rewards
  if (raw.rewarded_by) {
    const quests = JSON.parse(raw.rewarded_by) as QuestInfo[];
    if (quests.length > 0) {
      const quest = quests[0];
      return {
        type: "quest",
        label: quest.quest_name,
        linkHref: `/quests/${quest.quest_id}`,
      };
    }
  }

  return {
    type: "unknown",
    label: "Unknown",
  };
}

function getMonsterZone(
  db: Database.Database,
  monsterId: string,
): string | null {
  const result = db
    .prepare(
      `
    SELECT zone_bestiary
    FROM monsters
    WHERE id = ?
  `,
    )
    .get(monsterId) as { zone_bestiary: string | null } | undefined;

  return result?.zone_bestiary || null;
}
