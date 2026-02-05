import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import { getSkillById } from "$lib/queries/skills.server";
import { queryOne } from "$lib/db.server";
import { skillDescription } from "$lib/server/meta-description";
import type {
  LinearValue,
  SkillDetailPageData,
  SkillItemSource,
  SkillParsedFields,
} from "$lib/types/skills";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const skills = db.prepare("SELECT id FROM skills").all() as Array<{
    id: string;
  }>;
  db.close();
  return skills.map((skill) => ({ id: skill.id }));
};

function parseLinear(value: string | null): LinearValue | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as LinearValue;
    if (parsed.base_value === 0 && parsed.bonus_per_level === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const load: PageServerLoad = ({ params }): SkillDetailPageData => {
  const skill = getSkillById(params.id);

  if (!skill) {
    throw error(404, `Skill not found: ${params.id}`);
  }

  // Parse player_classes JSON
  const playerClasses: string[] = skill.player_classes
    ? JSON.parse(skill.player_classes)
    : [];

  // Resolve FK names
  const prerequisiteName = skill.prerequisite_skill_id
    ? (queryOne<{ name: string }>("SELECT name FROM skills WHERE id = ?", [
        skill.prerequisite_skill_id,
      ])?.name ?? null)
    : null;

  const prerequisite2Name = skill.prerequisite2_skill_id
    ? (queryOne<{ name: string }>("SELECT name FROM skills WHERE id = ?", [
        skill.prerequisite2_skill_id,
      ])?.name ?? null)
    : null;

  const summonedMonsterName = skill.summoned_monster_id
    ? (queryOne<{ name: string }>("SELECT name FROM monsters WHERE id = ?", [
        skill.summoned_monster_id,
      ])?.name ?? null)
    : null;

  // Parse granted_by_items and fetch item names
  const grantedByItemsRaw: Array<{
    item_id: string;
    type: string;
    probability?: number;
  }> = skill.granted_by_items ? JSON.parse(skill.granted_by_items) : [];

  let grantedByItems: SkillItemSource[] = [];
  if (grantedByItemsRaw.length > 0) {
    const itemIds = grantedByItemsRaw.map((i) => i.item_id);
    const placeholders = itemIds.map(() => "?").join(",");
    const db = new Database(DB_STATIC_PATH, { readonly: true });
    const itemInfo = db
      .prepare(`SELECT id, name FROM items WHERE id IN (${placeholders})`)
      .all(...itemIds) as Array<{ id: string; name: string }>;
    db.close();
    const nameMap = new Map(itemInfo.map((i) => [i.id, i.name]));

    grantedByItems = grantedByItemsRaw.map((item) => ({
      item_id: item.item_id,
      item_name: nameMap.get(item.item_id) || item.item_id,
      type: item.type,
      probability: item.probability,
    }));
  }

  // Parse all LinearValue JSON fields server-side
  const parsedFields: SkillParsedFields = {
    mana_cost: parseLinear(skill.mana_cost),
    energy_cost: parseLinear(skill.energy_cost),
    cooldown: parseLinear(skill.cooldown),
    cast_time: parseLinear(skill.cast_time),
    cast_range: parseLinear(skill.cast_range),
    damage: parseLinear(skill.damage),
    damage_percent: parseLinear(skill.damage_percent),
    lifetap_percent: parseLinear(skill.lifetap_percent),
    aggro: parseLinear(skill.aggro),
    heals_health: parseLinear(skill.heals_health),
    heals_mana: parseLinear(skill.heals_mana),
    stun_chance: parseLinear(skill.stun_chance),
    stun_time: parseLinear(skill.stun_time),
    fear_chance: parseLinear(skill.fear_chance),
    fear_time: parseLinear(skill.fear_time),
    knockback_chance: parseLinear(skill.knockback_chance),
    ward_bonus: parseLinear(skill.ward_bonus),
    fear_resist_chance_bonus: parseLinear(skill.fear_resist_chance_bonus),
    health_max_bonus: parseLinear(skill.health_max_bonus),
    health_max_percent_bonus: parseLinear(skill.health_max_percent_bonus),
    mana_max_bonus: parseLinear(skill.mana_max_bonus),
    mana_max_percent_bonus: parseLinear(skill.mana_max_percent_bonus),
    energy_max_bonus: parseLinear(skill.energy_max_bonus),
    damage_bonus: parseLinear(skill.damage_bonus),
    damage_percent_bonus: parseLinear(skill.damage_percent_bonus),
    magic_damage_bonus: parseLinear(skill.magic_damage_bonus),
    magic_damage_percent_bonus: parseLinear(skill.magic_damage_percent_bonus),
    defense_bonus: parseLinear(skill.defense_bonus),
    magic_resist_bonus: parseLinear(skill.magic_resist_bonus),
    poison_resist_bonus: parseLinear(skill.poison_resist_bonus),
    fire_resist_bonus: parseLinear(skill.fire_resist_bonus),
    cold_resist_bonus: parseLinear(skill.cold_resist_bonus),
    disease_resist_bonus: parseLinear(skill.disease_resist_bonus),
    block_chance_bonus: parseLinear(skill.block_chance_bonus),
    accuracy_bonus: parseLinear(skill.accuracy_bonus),
    critical_chance_bonus: parseLinear(skill.critical_chance_bonus),
    haste_bonus: parseLinear(skill.haste_bonus),
    spell_haste_bonus: parseLinear(skill.spell_haste_bonus),
    health_percent_per_second_bonus: parseLinear(
      skill.health_percent_per_second_bonus,
    ),
    healing_per_second_bonus: parseLinear(skill.healing_per_second_bonus),
    mana_percent_per_second_bonus: parseLinear(
      skill.mana_percent_per_second_bonus,
    ),
    mana_per_second_bonus: parseLinear(skill.mana_per_second_bonus),
    energy_percent_per_second_bonus: parseLinear(
      skill.energy_percent_per_second_bonus,
    ),
    energy_per_second_bonus: parseLinear(skill.energy_per_second_bonus),
    speed_bonus: parseLinear(skill.speed_bonus),
    damage_shield: parseLinear(skill.damage_shield),
    cooldown_reduction_percent: parseLinear(skill.cooldown_reduction_percent),
    heal_on_hit_percent: parseLinear(skill.heal_on_hit_percent),
    strength_bonus: parseLinear(skill.strength_bonus),
    intelligence_bonus: parseLinear(skill.intelligence_bonus),
    dexterity_bonus: parseLinear(skill.dexterity_bonus),
    charisma_bonus: parseLinear(skill.charisma_bonus),
    wisdom_bonus: parseLinear(skill.wisdom_bonus),
    constitution_bonus: parseLinear(skill.constitution_bonus),
  };

  // Generate SEO description
  const description = skillDescription({
    name: skill.name,
    skill_type: skill.skill_type,
    player_classes: playerClasses,
    max_level: skill.max_level,
    is_veteran: Boolean(skill.is_veteran),
  });

  return {
    skill,
    description,
    prerequisiteName,
    prerequisite2Name,
    summonedMonsterName,
    grantedByItems,
    playerClasses,
    parsedFields,
  };
};
