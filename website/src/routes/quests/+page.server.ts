import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { QuestsPageData, QuestListView } from "$lib/types/quests";
import { loadAcquisition } from "$lib/server/acquisition";
import { projectQuestSeasons } from "$lib/acquisition/projections";

export const prerender = true;

export const load: PageServerLoad = async (): Promise<QuestsPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const memberships = db
    .prepare(
      `
    SELECT m.quest_id, n.id, n.name FROM npc_quest_memberships m
    JOIN npcs n ON n.id = m.npc_id WHERE m.role = 'offer' ORDER BY n.name, n.id
  `,
    )
    .all() as Array<{ quest_id: string; id: string; name: string }>;
  const classes = db
    .prepare(
      `
    SELECT r.quest_id, c.name FROM quest_class_requirements r
    JOIN classes c ON c.id = r.class_id ORDER BY r.quest_id, r.ordinal
  `,
    )
    .all() as Array<{ quest_id: string; name: string }>;
  const rows = db.prepare("SELECT * FROM quests ORDER BY name").all() as Array<
    Omit<
      QuestListView,
      | "class_requirements"
      | "quest_giver_id"
      | "quest_giver_name"
      | "quest_giver_count"
    >
  >;
  const model = await loadAcquisition(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    {
      kind: "requirements",
      entities: rows.map((row) => ({ kind: "quest", id: row.id })),
    },
  );
  const quests: QuestListView[] = rows.map((q) => ({
    ...q,
    seasons: projectQuestSeasons(model, q.id),
    display_type: q.display_type ?? q.quest_type,
    is_main_quest: Boolean(q.is_main_quest),
    is_epic_quest: Boolean(q.is_epic_quest),
    is_adventurer_quest: Boolean(q.is_adventurer_quest),
    is_repeatable: Boolean(q.is_repeatable),
    class_requirements: classes
      .filter((row) => row.quest_id === q.id)
      .map((row) => row.name),
    quest_giver_id:
      memberships.find((row) => row.quest_id === q.id)?.id ?? null,
    quest_giver_name:
      memberships.find((row) => row.quest_id === q.id)?.name ?? null,
    quest_giver_count: new Set(
      memberships.filter((row) => row.quest_id === q.id).map((row) => row.id),
    ).size,
  }));
  db.close();
  return { quests };
};
