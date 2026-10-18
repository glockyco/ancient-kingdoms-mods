import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadAcquisition } from "$lib/server/acquisition";
import { projectItemSources } from "$lib/acquisition/projections";
import { methodLabel } from "$lib/components/acquisition/display";

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
  visual_public_path: string | null;
  book_text: string;
  hasObtainabilityInfo: boolean;
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
    achievement_id: string;
    achievement_name: string;
  };
  books: LoreBook[];
}

interface RawBook {
  id: string;
  name: string;
  tooltip_html: string | null;
  visual_public_path: string | null;
  book_text: string;
  book_strength_gain: number;
  book_dexterity_gain: number;
  book_constitution_gain: number;
  book_intelligence_gain: number;
  book_wisdom_gain: number;
  book_charisma_gain: number;
}

export const load: PageServerLoad = async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

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
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
    FROM professions
    WHERE id = 'lore_keeping'
  `,
    )
    .get() as LoreKeepingPageData["profession"];

  const rawBooks = db
    .prepare(
      `
    SELECT
      i.id,
      i.name,
      i.tooltip_html,
      va.public_path AS visual_public_path,
      i.book_text,
      book_strength_gain,
      book_dexterity_gain,
      book_constitution_gain,
      book_intelligence_gain,
      book_wisdom_gain,
      book_charisma_gain
    FROM items i
    LEFT JOIN visual_assets va
      ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
    WHERE i.book_text IS NOT NULL AND i.book_text != ''
    ORDER BY i.name
  `,
    )
    .all() as RawBook[];

  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const model = await loadAcquisition(execute, {
    kind: "items",
    itemIds: rawBooks.map((book) => book.id),
  });
  const books: LoreBook[] = rawBooks.map((raw) => {
    const sources = projectItemSources(model, raw.id);
    const method = sources.methods[0];
    const sourceSummary: SourceSummary = method
      ? {
          type:
            method.kind === "merge"
              ? "merge"
              : method.kind === "kill"
                ? "drop"
                : method.kind === "quest_complete"
                  ? "quest"
                  : "unknown",
          label: methodLabel(method),
        }
      : { type: "unknown", label: "Unknown" };

    return {
      id: raw.id,
      name: raw.name,
      tooltip_html: raw.tooltip_html,
      visual_public_path: raw.visual_public_path,
      book_text: raw.book_text,
      hasObtainabilityInfo: sources.methods.length > 0,
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

  return {
    profession,
    books,
  };
};
