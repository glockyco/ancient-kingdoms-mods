import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { QuestsPageData, QuestListView } from "$lib/types/quests";

export const prerender = true;

export const load: PageServerLoad = (): QuestsPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  // Build a map of adventurer quest IDs to their NPCs (first NPC + count)
  const adventurerQuestNpcs = new Map<
    string,
    { npc_id: string; npc_name: string; count: number }
  >();

  const adventurerNpcsRaw = db
    .prepare(
      `
      SELECT
        json_extract(value, '$.id') as quest_id,
        n.id as npc_id,
        n.name as npc_name
      FROM npcs n, json_each(n.quests_offered)
      WHERE json_extract(value, '$.id') IN (
        SELECT id FROM quests WHERE is_adventurer_quest = 1
      )
      ORDER BY n.name
    `,
    )
    .all() as Array<{ quest_id: string; npc_id: string; npc_name: string }>;

  for (const row of adventurerNpcsRaw) {
    const existing = adventurerQuestNpcs.get(row.quest_id);
    if (existing) {
      existing.count++;
    } else {
      adventurerQuestNpcs.set(row.quest_id, {
        npc_id: row.npc_id,
        npc_name: row.npc_name,
        count: 1,
      });
    }
  }

  const questsRaw = db
    .prepare(
      `
    SELECT
      q.id,
      q.name,
      q.quest_type,
      q.display_type,
      q.level_required,
      q.level_recommended,
      q.is_main_quest,
      q.is_epic_quest,
      q.is_adventurer_quest,
      q.is_repeatable,
      q.class_requirements,
      q.start_npc_id,
      n.name as start_npc_name
    FROM quests q
    LEFT JOIN npcs n ON n.id = q.start_npc_id
    ORDER BY q.name
  `,
    )
    .all() as Array<{
    id: string;
    name: string;
    quest_type: string;
    display_type: string | null;
    level_required: number;
    level_recommended: number;
    is_main_quest: number;
    is_epic_quest: number;
    is_adventurer_quest: number;
    is_repeatable: number;
    class_requirements: string | null;
    start_npc_id: string | null;
    start_npc_name: string | null;
  }>;

  const quests: QuestListView[] = questsRaw.map((q) => {
    // For adventurer quests without a start_npc_id, use the adventurer NPC data
    let questGiverId = q.start_npc_id;
    let questGiverName = q.start_npc_name;
    let questGiverCount = 1;

    if (!q.start_npc_id && q.is_adventurer_quest) {
      const adventurerNpc = adventurerQuestNpcs.get(q.id);
      if (adventurerNpc) {
        questGiverId = adventurerNpc.npc_id;
        questGiverName = adventurerNpc.npc_name;
        questGiverCount = adventurerNpc.count;
      }
    }

    // Parse class requirements
    let classRequirements: string[] = [];
    if (q.class_requirements) {
      try {
        const parsed = JSON.parse(q.class_requirements);
        if (Array.isArray(parsed)) {
          classRequirements = parsed;
        }
      } catch {
        // Invalid JSON, leave as empty array
      }
    }

    return {
      id: q.id,
      name: q.name,
      quest_type: q.quest_type,
      display_type: q.display_type ?? q.quest_type,
      level_required: q.level_required,
      level_recommended: q.level_recommended,
      is_main_quest: Boolean(q.is_main_quest),
      is_epic_quest: Boolean(q.is_epic_quest),
      is_adventurer_quest: Boolean(q.is_adventurer_quest),
      is_repeatable: Boolean(q.is_repeatable),
      class_requirements: classRequirements,
      quest_giver_id: questGiverId,
      quest_giver_name: questGiverName,
      quest_giver_count: questGiverCount,
    };
  });

  db.close();

  return {
    quests,
  };
};
