import { query } from "$lib/db.server";
import type { PageServerLoad } from "./$types";
import type {
  SkillDetailView,
  SkillPet,
  DamageFormulaKind,
  HealBonusKind,
  BuffBonusAttrSource,
  DebuffBonusAttrKind,
  TimingModel,
} from "$lib/types/skills";
import { parseLinear } from "$lib/utils/parseLinear";
import { computeMechanicsSpec } from "$lib/utils/skillMechanics";

export const prerender = true;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface SkillEntry {
  id: string;
  name: string;
  tier: number;
  player_classes: string[];
  /** Human-readable caster descriptions, e.g. ["Warrior (player)", "Rogue (merc)"] */
  casterLabels: string[];
  /** Whether the critical heal path applies (populated only for heal contexts). */
  canCrit?: boolean;
  /** Whether this is an area buff (populated only for buff contexts). */
  isAreaBuff?: boolean;
}

export interface FormulaGroup<K extends string> {
  kind: K;
  skills: SkillEntry[];
}

export interface MechanicsCombatPageData {
  byDamageFormula: FormulaGroup<DamageFormulaKind>[];
  byHealBonus: FormulaGroup<HealBonusKind>[];
  byBuffAttr: FormulaGroup<BuffBonusAttrSource>[];
  byDebuffAttr: FormulaGroup<DebuffBonusAttrKind>[];
  byTimingModel: FormulaGroup<TimingModel>[];
}

// ---------------------------------------------------------------------------
// DB row → SkillDetailView reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstruct a SkillDetailView from a raw DB row using the same field
 * mapping as skills/[id]/+page.server.ts.  Every column from the SELECT *
 * on the skills table is present; joined columns are named explicitly.
 */
function rowToSkillDetail(
  r: Record<string, unknown>,
  playerClasses: string[],
): SkillDetailView {
  return {
    id: r.id as string,
    name: r.name as string,
    skill_type: r.skill_type as string,
    tier: (r.tier as number) || 0,
    max_level: (r.max_level as number) || 1,
    level_required: (r.level_required as number) || 0,
    required_skill_points: (r.required_skill_points as number) || 1,
    required_spent_points: (r.required_spent_points as number) || 0,
    player_classes: playerClasses,
    tooltip_template: r.tooltip_template as string | null,

    // Prerequisites
    prerequisite_skill_id: r.prerequisite_skill_id as string | null,
    prerequisite_skill_name: r.prerequisite_skill_name as string | null,
    prerequisite_level: (r.prerequisite_level as number) || 0,
    prerequisite2_skill_id: r.prerequisite2_skill_id as string | null,
    prerequisite2_skill_name: r.prerequisite2_skill_name as string | null,
    prerequisite2_level: (r.prerequisite2_level as number) || 0,

    // Weapon requirements
    required_weapon_category: r.required_weapon_category as string | null,
    required_weapon_category2: r.required_weapon_category2 as string | null,

    // Flags
    is_spell: Boolean(r.is_spell),
    is_veteran: Boolean(r.is_veteran),
    is_pet_skill: Boolean(r.is_pet_skill),
    is_mercenary_skill: Boolean(r.is_mercenary_skill),
    is_scroll: Boolean(r.is_scroll),
    base_skill: Boolean(r.base_skill),
    learn_default: Boolean(r.learn_default),
    allow_dungeon: Boolean(r.allow_dungeon ?? true),
    followup_default_attack: Boolean(r.followup_default_attack),

    // Costs and timing
    mana_cost: parseLinear(r.mana_cost),
    energy_cost: parseLinear(r.energy_cost),
    cooldown: parseLinear(r.cooldown),
    cast_time: parseLinear(r.cast_time),
    cast_range: parseLinear(r.cast_range),

    // Damage
    damage: parseLinear(r.damage),
    damage_percent: parseLinear(r.damage_percent),
    damage_type: r.damage_type as string | null,
    lifetap_percent: parseLinear(r.lifetap_percent),
    aggro: parseLinear(r.aggro),
    break_armor_prob: (r.break_armor_prob as number) || 0,
    is_assassination_skill: Boolean(r.is_assassination_skill),
    is_manaburn_skill: Boolean(r.is_manaburn_skill),

    // Healing
    heals_health: parseLinear(r.heals_health),
    heals_mana: parseLinear(r.heals_mana),
    can_heal_self: Boolean(r.can_heal_self),
    can_heal_others: Boolean(r.can_heal_others),

    // Crowd control
    stun_chance: parseLinear(r.stun_chance),
    stun_time: parseLinear(r.stun_time),
    fear_chance: parseLinear(r.fear_chance),
    fear_time: parseLinear(r.fear_time),
    knockback_chance: parseLinear(r.knockback_chance),

    // Buff duration
    duration_base: (r.duration_base as number) || 0,
    duration_per_level: (r.duration_per_level as number) || 0,

    // Buff targeting
    can_buff_self: Boolean(r.can_buff_self),
    can_buff_others: Boolean(r.can_buff_others),
    buff_category: r.buff_category as string | null,

    // Buff stat bonuses
    health_max_bonus: parseLinear(r.health_max_bonus),
    health_max_percent_bonus: parseLinear(r.health_max_percent_bonus),
    mana_max_bonus: parseLinear(r.mana_max_bonus),
    mana_max_percent_bonus: parseLinear(r.mana_max_percent_bonus),
    energy_max_bonus: parseLinear(r.energy_max_bonus),
    defense_bonus: parseLinear(r.defense_bonus),
    ward_bonus: parseLinear(r.ward_bonus),
    magic_resist_bonus: parseLinear(r.magic_resist_bonus),
    damage_bonus: parseLinear(r.damage_bonus),
    damage_percent_bonus: parseLinear(r.damage_percent_bonus),
    magic_damage_bonus: parseLinear(r.magic_damage_bonus),
    magic_damage_percent_bonus: parseLinear(r.magic_damage_percent_bonus),
    haste_bonus: parseLinear(r.haste_bonus),
    spell_haste_bonus: parseLinear(r.spell_haste_bonus),
    speed_bonus: parseLinear(r.speed_bonus),
    critical_chance_bonus: parseLinear(r.critical_chance_bonus),
    accuracy_bonus: parseLinear(r.accuracy_bonus),
    block_chance_bonus: parseLinear(r.block_chance_bonus),
    fear_resist_chance_bonus: parseLinear(r.fear_resist_chance_bonus),
    damage_shield: parseLinear(r.damage_shield),
    cooldown_reduction_percent: parseLinear(r.cooldown_reduction_percent),
    heal_on_hit_percent: parseLinear(r.heal_on_hit_percent),

    // Regen bonuses
    healing_per_second_bonus: parseLinear(r.healing_per_second_bonus),
    health_percent_per_second_bonus: parseLinear(
      r.health_percent_per_second_bonus,
    ),
    mana_per_second_bonus: parseLinear(r.mana_per_second_bonus),
    mana_percent_per_second_bonus: parseLinear(r.mana_percent_per_second_bonus),
    energy_per_second_bonus: parseLinear(r.energy_per_second_bonus),
    energy_percent_per_second_bonus: parseLinear(
      r.energy_percent_per_second_bonus,
    ),

    // Resist bonuses
    poison_resist_bonus: parseLinear(r.poison_resist_bonus),
    fire_resist_bonus: parseLinear(r.fire_resist_bonus),
    cold_resist_bonus: parseLinear(r.cold_resist_bonus),
    disease_resist_bonus: parseLinear(r.disease_resist_bonus),

    // Attribute bonuses
    strength_bonus: parseLinear(r.strength_bonus),
    intelligence_bonus: parseLinear(r.intelligence_bonus),
    dexterity_bonus: parseLinear(r.dexterity_bonus),
    constitution_bonus: parseLinear(r.constitution_bonus),
    wisdom_bonus: parseLinear(r.wisdom_bonus),
    charisma_bonus: parseLinear(r.charisma_bonus),

    // Special flags
    is_resurrect_skill: Boolean(r.is_resurrect_skill),
    is_balance_health: Boolean(r.is_balance_health),
    is_invisibility: Boolean(r.is_invisibility),
    is_mana_shield: Boolean(r.is_mana_shield),
    is_cleanse: Boolean(r.is_cleanse),
    is_dispel: Boolean(r.is_dispel),
    is_blindness: Boolean(r.is_blindness),
    is_enrage: Boolean(r.is_enrage),
    is_double_exp_spell: Boolean(r.is_double_exp_spell),
    is_permanent: Boolean(r.is_permanent),
    is_only_for_magic_classes: Boolean(r.is_only_for_magic_classes),
    remain_after_death: Boolean(r.remain_after_death),
    is_decrease_resists_skill: Boolean(r.is_decrease_resists_skill),

    // Debuff type flags
    is_poison_debuff: Boolean(r.is_poison_debuff),
    is_fire_debuff: Boolean(r.is_fire_debuff),
    is_cold_debuff: Boolean(r.is_cold_debuff),
    is_disease_debuff: Boolean(r.is_disease_debuff),
    is_melee_debuff: Boolean(r.is_melee_debuff),
    is_magic_debuff: Boolean(r.is_magic_debuff),
    prob_ignore_cleanse: (r.prob_ignore_cleanse as number) || 0,

    // Summon fields
    summoned_monster_id: r.summoned_monster_id as string | null,
    summoned_monster_name: r.summoned_monster_name as string | null,
    summoned_monster_level: r.summoned_monster_level as number | null,
    summon_count_per_cast: r.summon_count_per_cast as number | null,
    max_active_summons: r.max_active_summons as number | null,
    pet_prefab_name: r.pet_prefab_name as string | null,
    pet_id: r.pet_id as string | null,
    pet_name: r.pet_name as string | null,
    is_familiar: Boolean(r.is_familiar),

    // AoE fields
    affects_random_target: Boolean(r.affects_random_target),
    area_object_size: (r.area_object_size as number) || 0,
    area_objects_to_spawn: (r.area_objects_to_spawn as number) || 0,
  };
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

/** Append a SkillEntry to the matching group, creating the group on first use. */
function pushToGroup<K extends string>(
  groups: Map<K, SkillEntry[]>,
  kind: K,
  entry: SkillEntry,
): void {
  if (!groups.has(kind)) groups.set(kind, []);
  groups.get(kind)!.push(entry);
}

/** Convert a Map<K, SkillEntry[]> to a sorted FormulaGroup[] array, dropping empty groups. */
function toGroups<K extends string>(
  groups: Map<K, SkillEntry[]>,
): FormulaGroup<K>[] {
  return [...groups.entries()]
    .filter(([, skills]) => skills.length > 0)
    .map(([kind, skills]) => ({ kind, skills }));
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load: PageServerLoad = (): MechanicsCombatPageData => {
  // Q1: All skills with joined name columns, ordered so tier/name sort is stable.
  const skillRows = query<Record<string, unknown>>(
    `SELECT
       s.*,
       ps.name  AS prerequisite_skill_name,
       ps2.name AS prerequisite2_skill_name,
       sm.name  AS summoned_monster_name,
       pet_lookup.id   AS pet_id,
       pet_lookup.name AS pet_name
     FROM skills s
     LEFT JOIN skills ps  ON ps.id  = s.prerequisite_skill_id
     LEFT JOIN skills ps2 ON ps2.id = s.prerequisite2_skill_id
     LEFT JOIN monsters sm ON sm.id = s.summoned_monster_id
     LEFT JOIN pets pet_lookup ON lower(pet_lookup.name) = lower(s.pet_prefab_name)
     ORDER BY s.tier ASC, s.name ASC`,
  );

  // Q2: All pet assignments for every skill (used to identify merc/pet casters).
  const petRows = query<{
    skill_id: string;
    id: string;
    name: string;
    is_mercenary: number;
    is_familiar: number;
    type_monster: string | null;
  }>(
    `SELECT ps.skill_id, p.id, p.name, p.is_mercenary, p.is_familiar, p.type_monster
     FROM pet_skills ps
     JOIN pets p ON p.id = ps.pet_id`,
  );

  // Q3: Skills that have at least one monster caster.
  const monsterSkillIds = new Set(
    query<{ skill_id: string }>(
      "SELECT DISTINCT skill_id FROM monster_skills",
    ).map((r) => r.skill_id),
  );

  // Build skill_id → SkillPet[] map from pet rows.
  const petsBySkill = new Map<string, SkillPet[]>();
  for (const r of petRows) {
    const pet: SkillPet = {
      id: r.id,
      name: r.name,
      is_mercenary: Boolean(r.is_mercenary),
      is_familiar: Boolean(r.is_familiar),
      type_monster: r.type_monster,
    };
    const key = r.skill_id;
    if (!petsBySkill.has(key)) petsBySkill.set(key, []);
    petsBySkill.get(key)!.push(pet);
  }

  // Accumulate results into per-kind buckets.
  const damageGroups = new Map<DamageFormulaKind, SkillEntry[]>();
  const healGroups = new Map<HealBonusKind, SkillEntry[]>();
  const buffGroups = new Map<BuffBonusAttrSource, SkillEntry[]>();
  const debuffGroups = new Map<DebuffBonusAttrKind, SkillEntry[]>();
  const timingGroups = new Map<TimingModel, SkillEntry[]>();

  for (const row of skillRows) {
    const playerClasses: string[] = row.player_classes
      ? (JSON.parse(row.player_classes as string) as string[]).sort()
      : [];

    const skill = rowToSkillDetail(row, playerClasses);
    const pets = petsBySkill.get(skill.id) ?? [];
    const hasMonsters = monsterSkillIds.has(skill.id);
    // weapon_proc context: mechanics/combat page has no item data, treat as false.
    // Weapon procs use the same formula dispatch as the skill itself, so this
    // only affects whether a "weapon proc" caster label appears — acceptable omission.
    const spec = computeMechanicsSpec(skill, pets, hasMonsters, false);

    const base: Omit<SkillEntry, "casterLabels"> = {
      id: skill.id,
      name: skill.name,
      tier: skill.tier,
      player_classes: skill.player_classes,
    };

    for (const ctx of spec.damageContexts) {
      pushToGroup(damageGroups, ctx.formula, {
        ...base,
        casterLabels: ctx.casterLabels,
      });
    }

    for (const ctx of spec.healContexts) {
      pushToGroup(healGroups, ctx.bonusKind, {
        ...base,
        casterLabels: ctx.casterLabels,
        canCrit: ctx.canCrit,
      });
    }

    for (const ctx of spec.buffContexts) {
      pushToGroup(buffGroups, ctx.bonusAttrSource, {
        ...base,
        casterLabels: ctx.casterLabels,
        isAreaBuff: ctx.isAreaBuff,
      });
    }

    for (const ctx of spec.debuffContexts) {
      pushToGroup(debuffGroups, ctx.bonusAttrKind, {
        ...base,
        casterLabels: ctx.casterLabels,
      });
    }

    for (const ctx of spec.timingContexts) {
      pushToGroup(timingGroups, ctx.model, {
        ...base,
        casterLabels: ctx.casterLabels,
      });
    }
  }

  return {
    byDamageFormula: toGroups(damageGroups),
    byHealBonus: toGroups(healGroups),
    byBuffAttr: toGroups(buffGroups),
    byDebuffAttr: toGroups(debuffGroups),
    byTimingModel: toGroups(timingGroups),
  };
};
