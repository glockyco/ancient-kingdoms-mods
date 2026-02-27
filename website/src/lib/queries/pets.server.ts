import { query, queryOne } from "$lib/db.server";
import type { ClassSkill } from "./classes.server";
import type {
  PetListView,
  PetDetailView,
  PetKind,
  PetClassLink,
  PetRecruiter,
} from "$lib/types/pets";

function getPetKind(is_mercenary: boolean, is_familiar: boolean): PetKind {
  if (is_mercenary) return "Mercenary";
  if (is_familiar) return "Familiar";
  return "Companion";
}

/**
 * Get all pets for the overview page.
 */
export function getAllPets(): PetListView[] {
  const recruiters = getMercenaryRecruiters();

  const rows = query<{
    id: string;
    name: string;
    is_mercenary: boolean;
    is_familiar: boolean;
    type_monster: string;
    level: number;
    summoning_class_id: string | null;
    summoning_skill_id: string | null;
    summoning_skill_name: string | null;
  }>(
    `SELECT p.id, p.name, p.is_mercenary, p.is_familiar, p.type_monster, p.level,
            json_extract(s.player_classes, '$[0]') as summoning_class_id,
            s.id as summoning_skill_id,
            s.name as summoning_skill_name
     FROM pets p
     LEFT JOIN skills s ON lower(s.pet_prefab_name) = lower(p.name)
     ORDER BY p.is_mercenary DESC, p.is_familiar ASC, p.name ASC`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: getPetKind(r.is_mercenary, r.is_familiar),
    type_monster: r.type_monster,
    level: r.level,
    summoning_class_id: r.summoning_class_id,
    summoning_skill_id: r.summoning_skill_id,
    summoning_skill_name: r.summoning_skill_name,
    recruiters: r.is_mercenary ? recruiters : [],
  }));
}

/**
 * Get a single pet's full detail data.
 */
export function getPetById(petId: string): PetDetailView | null {
  const row = queryOne<{
    id: string;
    name: string;
    is_mercenary: boolean;
    is_familiar: boolean;
    type_monster: string;
    level: number;
  }>(
    `SELECT id, name, is_mercenary, is_familiar, type_monster, level
     FROM pets
     WHERE id = ?`,
    [petId],
  );

  if (!row) return null;

  const kind = getPetKind(row.is_mercenary, row.is_familiar);

  let classLink: PetClassLink;
  if (row.is_mercenary) {
    classLink = {
      class_id: row.type_monster.toLowerCase(),
      skill_id: null,
      skill_name: null,
    };
  } else {
    const summonSkill = queryOne<{
      skill_id: string;
      skill_name: string;
      class_id: string;
    }>(
      `SELECT s.id as skill_id, s.name as skill_name,
              json_extract(s.player_classes, '$[0]') as class_id
       FROM skills s
       WHERE lower(s.pet_prefab_name) = lower(?)
       LIMIT 1`,
      [row.name],
    );

    if (!summonSkill) {
      throw new Error(`No summoning skill found for pet: ${petId}`);
    }

    classLink = {
      class_id: summonSkill.class_id,
      skill_id: summonSkill.skill_id,
      skill_name: summonSkill.skill_name,
    };
  }

  // For familiars the effective max level is the summoning skill's max_level,
  // not the pet template's level field (which is always 1).
  let effective_max_level = row.level;
  if (row.is_familiar && classLink.skill_id) {
    const skillMaxLevel = queryOne<{ max_level: number }>(
      `SELECT max_level FROM skills WHERE id = ?`,
      [classLink.skill_id],
    );
    if (skillMaxLevel) {
      effective_max_level = skillMaxLevel.max_level;
    }
  }

  const skills = getPetSkills(petId);
  const recruiters = row.is_mercenary ? getMercenaryRecruiters() : [];

  return {
    id: row.id,
    name: row.name,
    kind,
    type_monster: row.type_monster,
    level: row.level,
    effective_max_level,
    classLink,
    skills,
    recruiters,
  };
}

/**
 * Get all NPCs that recruit mercenaries, with their zone locations.
 * All recruiters sell all mercenaries, so this is not filtered per pet.
 */
function getMercenaryRecruiters(): PetRecruiter[] {
  return query<PetRecruiter>(
    `SELECT n.id as npc_id, n.name as npc_name, z.id as zone_id, z.name as zone_name
     FROM npcs n
     JOIN npc_spawns s ON s.npc_id = n.id
     JOIN zones z ON z.id = s.zone_id
     WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
     ORDER BY z.name`,
  );
}

/**
 * Get all pet IDs for use in the entries generator.
 */
export function getAllPetIds(): string[] {
  return query<{ id: string }>(`SELECT id FROM pets`).map((r) => r.id);
}

/**
 * Get skills for a single pet, ordered by skill_index.
 */
function getPetSkills(petId: string): ClassSkill[] {
  return query<ClassSkill>(
    `SELECT
      s.id,
      s.name,
      s.skill_type,
      s.level_required,
      s.damage_type,
      s.max_level,
      s.damage,
      s.damage_percent,
      s.lifetap_percent,
      s.knockback_chance,
      s.stun_chance,
      s.stun_time,
      s.fear_chance,
      s.fear_time,
      s.aggro,
      s.is_assassination_skill,
      s.is_manaburn_skill,
      s.break_armor_prob,
      s.heals_health,
      s.heals_mana,
      s.is_resurrect_skill,
      s.is_balance_health,
      s.health_max_bonus,
      s.health_max_percent_bonus,
      s.mana_max_bonus,
      s.mana_max_percent_bonus,
      s.energy_max_bonus,
      s.defense_bonus,
      s.ward_bonus,
      s.magic_resist_bonus,
      s.poison_resist_bonus,
      s.fire_resist_bonus,
      s.cold_resist_bonus,
      s.disease_resist_bonus,
      s.damage_bonus,
      s.damage_percent_bonus,
      s.magic_damage_bonus,
      s.magic_damage_percent_bonus,
      s.haste_bonus,
      s.spell_haste_bonus,
      s.speed_bonus,
      s.critical_chance_bonus,
      s.accuracy_bonus,
      s.block_chance_bonus,
      s.fear_resist_chance_bonus,
      s.damage_shield,
      s.cooldown_reduction_percent,
      s.heal_on_hit_percent,
      s.healing_per_second_bonus,
      s.health_percent_per_second_bonus,
      s.mana_per_second_bonus,
      s.mana_percent_per_second_bonus,
      s.energy_per_second_bonus,
      s.energy_percent_per_second_bonus,
      s.strength_bonus,
      s.intelligence_bonus,
      s.dexterity_bonus,
      s.charisma_bonus,
      s.wisdom_bonus,
      s.constitution_bonus,
      s.duration_base,
      s.is_invisibility,
      s.is_mana_shield,
      s.is_cleanse,
      s.is_dispel,
      s.is_blindness,
      s.is_enrage,
      s.summoned_monster_id,
      m.name as summoned_monster_name,
      s.summoned_monster_level,
      s.summon_count_per_cast,
      s.max_active_summons,
      s.pet_prefab_name as pet_name,
      s.is_familiar,
      s.affects_random_target,
      s.area_object_size,
      s.area_objects_to_spawn,
      s.is_poison_debuff,
      s.is_fire_debuff,
      s.is_cold_debuff,
      s.is_disease_debuff,
      s.is_melee_debuff,
      s.is_magic_debuff,
      s.prob_ignore_cleanse,
      s.mana_cost,
      s.energy_cost,
      s.cooldown,
      s.cast_time,
      s.is_veteran,
      s.learn_default,
      s.base_skill,
      s.tier,
      s.required_spent_points
    FROM pet_skills ps
    JOIN skills s ON s.id = ps.skill_id
    LEFT JOIN monsters m ON s.summoned_monster_id = m.id
    WHERE ps.pet_id = ?
    ORDER BY ps.skill_index`,
    [petId],
  );
}
