import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import { getMonsterSources, getQuestSources } from "$lib/server/item-sources";

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
  statGains: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
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
  book_strength_gain: number;
  book_dexterity_gain: number;
  book_constitution_gain: number;
  book_intelligence_gain: number;
  book_wisdom_gain: number;
  book_charisma_gain: number;
}

export const load: PageServerLoad = (): LoreKeepingPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

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
      book_strength_gain,
      book_dexterity_gain,
      book_constitution_gain,
      book_intelligence_gain,
      book_wisdom_gain,
      book_charisma_gain
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

    const sourceSummary = getSourceSummary(db, raw.id, obtainabilityTree);

    return {
      id: raw.id,
      name: raw.name,
      tooltip_html: raw.tooltip_html,
      book_text: raw.book_text,
      obtainabilityTree,
      sourceSummary,
      statGains: {
        strength: raw.book_strength_gain,
        dexterity: raw.book_dexterity_gain,
        constitution: raw.book_constitution_gain,
        intelligence: raw.book_intelligence_gain,
        wisdom: raw.book_wisdom_gain,
        charisma: raw.book_charisma_gain,
      },
    };
  });

  db.close();

  return { profession, books };
};

function getSourceSummary(
  db: Database.Database,
  bookId: string,
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

  // Check for monster drops using junction table
  const monsterSources = getMonsterSources(db, bookId);
  if (monsterSources.length > 0) {
    const monster = monsterSources[0];
    const zoneName = getMonsterZone(db, monster.monster_id);
    return {
      type: "drop",
      label: zoneName
        ? `${monster.monster_name} (${zoneName})`
        : monster.monster_name,
      linkHref: `/monsters/${monster.monster_id}`,
    };
  }

  // Check for quest rewards using junction table
  const questSources = getQuestSources(db, bookId);
  // Filter to just rewards, not provided items
  const rewardQuests = questSources.filter((q) => q.source_type === "reward");
  if (rewardQuests.length > 0) {
    const quest = rewardQuests[0];
    return {
      type: "quest",
      label: quest.quest_name,
      linkHref: `/quests/${quest.quest_id}`,
    };
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
