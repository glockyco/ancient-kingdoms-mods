/**
 * Row shape of `SKILL_LIST_COLUMNS`. Numeric booleans are SQLite's 0/1 and
 * `player_classes` is a JSON array.
 */
export interface SkillListRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string | null;
  is_spell: number;
  is_veteran: number;
  is_pet_skill: number;
  is_mercenary_skill: number;
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_prefab_name: string | null;
  pet_id: string | null;
}
