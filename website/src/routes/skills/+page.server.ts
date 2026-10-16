import { query } from "$lib/db.server";
import type { PageServerLoad } from "./$types";
import type { SkillListView } from "$lib/types/skills";
import { skillEffectSummaries } from "$lib/skills/skillEffects.server";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";
import type { SkillListRow } from "$lib/skills/skillListRow";

export const prerender = true;

interface PetSkillRow {
  skill_id: string;
  is_mercenary: number;
}

export interface SkillsPageData {
  skills: SkillListView[];
}

export const load: PageServerLoad = (): SkillsPageData => {
  const rows = query<SkillListRow>(SKILLS_LIST_QUERY);
  const effects = skillEffectSummaries(rows.map((row) => row.id));

  // Separate query for pet/mercenary relationships — plain object lookup, not Map
  // (Map is not serializable through SvelteKit's data passing)
  const petSkillRows = query<PetSkillRow>(
    `SELECT DISTINCT ps.skill_id, p.is_mercenary
    FROM pet_skills ps
    JOIN pets p ON p.id = ps.pet_id`,
  );

  const usedByMercenaries = new Set<string>();
  const usedByPets = new Set<string>();
  for (const row of petSkillRows) {
    if (row.is_mercenary) {
      usedByMercenaries.add(row.skill_id);
    } else {
      usedByPets.add(row.skill_id);
    }
  }

  // Detail pages for mercenaries and summons live under different sections,
  // so the summoned pet's link needs its mercenary flag.
  const mercenaryIds = new Set(
    query<{ id: string }>(`SELECT id FROM pets WHERE is_mercenary = 1`).map(
      (r) => r.id,
    ),
  );

  const skills: SkillListView[] = rows.map((row, index) => {
    const playerClasses: string[] = row.player_classes
      ? JSON.parse(row.player_classes)
      : [];

    return {
      id: row.id,
      name: row.name,
      visual_public_path: row.visual_public_path,
      skill_type: row.skill_type,
      tier: row.tier,
      max_level: row.max_level,
      level_required: row.level_required,
      player_classes: playerClasses,
      is_spell: Boolean(row.is_spell),
      is_veteran: Boolean(row.is_veteran),
      is_pet_skill: Boolean(row.is_pet_skill),
      is_mercenary_skill: Boolean(row.is_mercenary_skill),
      effect: effects[index],
      used_by_mercenaries: usedByMercenaries.has(row.id),
      used_by_pets: usedByPets.has(row.id),
      pet_id: row.pet_id,
      pet_is_mercenary: row.pet_id !== null && mercenaryIds.has(row.pet_id),
      pet_name: row.pet_name,
      summoned_monster_id: row.summoned_monster_id,
      summoned_monster_name: row.summoned_monster_name,
      summoned_monster_level: row.summoned_monster_level,
      summon_count_per_cast: row.summon_count_per_cast,
      max_active_summons: row.max_active_summons,
    };
  });

  return { skills };
};
