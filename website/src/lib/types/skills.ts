/**
 * Linear scaling value (base + bonus_per_level * (level - 1))
 */
export interface LinearValue {
  base_value: number;
  bonus_per_level: number;
}

/**
 * Skill data for list view
 */
export interface SkillListView {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string[];
  is_spell: boolean;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
  effect: string;
  used_by_mercenaries: boolean;
  used_by_pets: boolean;
  pet_id: string | null;
  pet_name: string | null;
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
}

/**
 * Full skill data for detail page
 */
export interface SkillDetailView {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  required_skill_points: number;
  required_spent_points: number;
  player_classes: string[];
  tooltip_template: string | null;

  // Prerequisites
  prerequisite_skill_id: string | null;
  prerequisite_skill_name: string | null;
  prerequisite_level: number;
  prerequisite2_skill_id: string | null;
  prerequisite2_skill_name: string | null;
  prerequisite2_level: number;

  // Weapon requirements
  required_weapon_category: string | null;
  required_weapon_category2: string | null;

  // Flags
  is_spell: boolean;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
  is_scroll: boolean;
  base_skill: boolean;
  learn_default: boolean;
  allow_dungeon: boolean;
  followup_default_attack: boolean;

  // Costs and timing
  mana_cost: LinearValue | null;
  energy_cost: LinearValue | null;
  cooldown: LinearValue | null;
  cast_time: LinearValue | null;
  cast_range: LinearValue | null;

  // Damage
  damage: LinearValue | null;
  damage_percent: LinearValue | null;
  damage_type: string | null;
  lifetap_percent: LinearValue | null;
  aggro: LinearValue | null;
  break_armor_prob: number;
  is_assassination_skill: boolean;
  is_manaburn_skill: boolean;

  // Healing
  heals_health: LinearValue | null;
  heals_mana: LinearValue | null;
  can_heal_self: boolean;
  can_heal_others: boolean;

  // Crowd control (LinearValue — stored as JSON TEXT in DB)
  stun_chance: LinearValue | null;
  stun_time: LinearValue | null;
  fear_chance: LinearValue | null;
  fear_time: LinearValue | null;
  knockback_chance: LinearValue | null;

  // Buff duration
  duration_base: number;
  duration_per_level: number;

  // Buff targeting
  can_buff_self: boolean;
  can_buff_others: boolean;
  buff_category: string | null;

  // Buff stat bonuses
  health_max_bonus: LinearValue | null;
  health_max_percent_bonus: LinearValue | null;
  mana_max_bonus: LinearValue | null;
  mana_max_percent_bonus: LinearValue | null;
  energy_max_bonus: LinearValue | null;
  defense_bonus: LinearValue | null;
  ward_bonus: LinearValue | null;
  magic_resist_bonus: LinearValue | null;
  damage_bonus: LinearValue | null;
  damage_percent_bonus: LinearValue | null;
  magic_damage_bonus: LinearValue | null;
  magic_damage_percent_bonus: LinearValue | null;
  haste_bonus: LinearValue | null;
  spell_haste_bonus: LinearValue | null;
  speed_bonus: LinearValue | null;
  critical_chance_bonus: LinearValue | null;
  accuracy_bonus: LinearValue | null;
  block_chance_bonus: LinearValue | null;
  fear_resist_chance_bonus: LinearValue | null;
  damage_shield: LinearValue | null;
  cooldown_reduction_percent: LinearValue | null;
  heal_on_hit_percent: LinearValue | null;

  // Regen bonuses
  healing_per_second_bonus: LinearValue | null;
  health_percent_per_second_bonus: LinearValue | null;
  mana_per_second_bonus: LinearValue | null;
  mana_percent_per_second_bonus: LinearValue | null;
  energy_per_second_bonus: LinearValue | null;
  energy_percent_per_second_bonus: LinearValue | null;

  // Resist bonuses
  poison_resist_bonus: LinearValue | null;
  fire_resist_bonus: LinearValue | null;
  cold_resist_bonus: LinearValue | null;
  disease_resist_bonus: LinearValue | null;

  // Attribute bonuses
  strength_bonus: LinearValue | null;
  intelligence_bonus: LinearValue | null;
  dexterity_bonus: LinearValue | null;
  constitution_bonus: LinearValue | null;
  wisdom_bonus: LinearValue | null;
  charisma_bonus: LinearValue | null;

  // Special flags
  is_resurrect_skill: boolean;
  is_balance_health: boolean;
  is_invisibility: boolean;
  is_mana_shield: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
  is_blindness: boolean;
  is_enrage: boolean;
  is_double_exp_spell: boolean;
  is_permanent: boolean;
  is_only_for_magic_classes: boolean;
  remain_after_death: boolean;
  is_decrease_resists_skill: boolean;

  // Debuff type flags
  is_poison_debuff: boolean;
  is_fire_debuff: boolean;
  is_cold_debuff: boolean;
  is_disease_debuff: boolean;
  is_melee_debuff: boolean;
  is_magic_debuff: boolean;
  prob_ignore_cleanse: number;

  // Summon fields
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_prefab_name: string | null;
  pet_id: string | null;
  pet_name: string | null;
  is_familiar: boolean;

  // AoE fields
  affects_random_target: boolean;
  area_object_size: number;
  area_objects_to_spawn: number;
}

/**
 * Item that grants/triggers this skill
 */
export interface SkillItemSource {
  item_id: string;
  item_name: string;
  type: string;
  probability?: number;
}

/**
 * Monster that uses this skill
 */
export interface SkillMonster {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_elite: boolean;
  is_fabled: boolean;
}

/**
 * Pet/mercenary that uses this skill
 */
export interface SkillPet {
  id: string;
  name: string;
  is_mercenary: boolean;
  is_familiar: boolean;
  type_monster: string | null;
}

// ------------------------------------------------------------
// Mechanics spec — computed server-side, rendered declaratively
// ------------------------------------------------------------

export type DamageFormulaKind =
  // Physical
  | "normal" // STR×1.0 + all equipment
  | "ranger_melee" // STR×1.0 + all equip − bow slot bonus (slot 13)
  | "rogue_melee" // STR×1.0 + main-hand + 50% off-hand + other equip
  // Ranged (physical+DEX)
  | "ranged_player" // STR×1.0 + bow+armour + DEX×1.5 − melee slot bonus
  | "ranged_player_frontal" // STR×1.0 + all equip + DEX×1.5 (no subtraction)
  | "ranged_merc" // STR×1.0 + all equip + DEX×1.5 (no subtraction)
  // Poison
  | "poison_rogue" // STR×1.0 + main-hand + 50% off-hand + other equip + DEX×2.5
  // Magic
  | "magic_spell" // INT×1.5 + equipment
  | "magic_weapon" // INT×1.5 + STR×1.0 + equipment (additive; Cleric holy_wrath)
  | "magic_weapon_ranger" // INT×1.5 + magic equip + STR×1.0 + non-bow equip (wild_strike)
  // Special
  | "manaburn" // energy/mana × 2, bypasses mitigation
  | "scroll" // level × 15
  // Monster / NPC (level-scaled, no player stats)
  | "monster_melee" // baseDamage(level) — no STR/equipment
  | "monster_magic"; // baseMagicDamage(level) — no INT/equipment

export interface DamageContext {
  /** One or more caster descriptions that all share this formula. */
  casterLabels: string[];
  formula: DamageFormulaKind;
}

export type HealBonusKind =
  | "player_ranger" // base × min((WIS×3)×0.004, 5.0)
  | "player_other" // base × min(WIS×0.004, 5.0)
  | "merc" // base × min(WIS×0.004, 5.0) using merc's own WIS — no ×3 for Ranger merc
  | "scroll" // base + level × 8
  | "none"; // no bonus (monster, NPC, non-merc pet)

export interface HealContext {
  casterLabels: string[];
  bonusKind: HealBonusKind;
  /** Whether the critical heal path applies (can_heal_others only). */
  canCrit: boolean;
}

export type BuffBonusAttrSource =
  | "player_ranger_wis" // WIS × 3 (TargetBuffSkill only)
  | "player_wis" // WIS (TargetBuffSkill non-Ranger, or any AreaBuffSkill player)
  | "merc_wis" // merc's own WIS (TargetBuffSkill merc path)
  | "player_charisma" // player CHA (AreaBuffSkill + is_mercenary_skill override)
  | "player_level" // scroll: PlayerLevel × 8
  | "none"; // monster/NPC: 0

export interface BuffContext {
  casterLabels: string[];
  bonusAttrSource: BuffBonusAttrSource;
  /** True for area_buff (different Ranger/ward behaviour vs target_buff). */
  isAreaBuff: boolean;
}

export type TimingModel =
  | "player_auto" // interval = cast_time + clamp(delay×(1−haste)/25, 0.25, 2.0)
  | "player_skill" // interval = cast_time + cooldown (cooldown NOT haste-reduced for players)
  | "merc_auto" // interval = cast_time + cooldown×(1−haste)
  | "merc_skill" // interval = cast_time + cooldown (no haste reduction)
  | "monster_nospell" // interval = cast_time + cooldown×(1−haste) via FinishCastMeleeAttackMonster
  | "monster_spell"; // interval = cast_time + cooldown (FinishCast, no haste)

export interface TimingContext {
  casterLabels: string[];
  model: TimingModel;
}

export type DebuffBonusAttrKind = "str" | "dex" | "int" | "scroll" | "none";

export interface DebuffContext {
  /** Caster labels that share this bonus attribute kind (e.g. ["Warrior (player)", "Rogue (player)"]). */
  casterLabels: string[];
  /** How the bonus attribute is determined for this caster type.
   * Source: TargetDebuffSkill.cs:265-279 — non-Player (monster/NPC) falls through to default 0.
   */
  bonusAttrKind: DebuffBonusAttrKind;
}

export interface SkillMechanicsSpec {
  /** One entry per distinct formula; empty array for non-damage skills. */
  damageContexts: DamageContext[];
  /** One entry per distinct heal bonus; empty for non-heal skills. */
  healContexts: HealContext[];
  /** One entry per distinct buff attr source; empty for non-buff/passive skills. */
  buffContexts: BuffContext[];
  /**
   * Populated when followup_default_attack=true. Shows per-caster timing model.
   * Empty for skills where timing is simply cast_time + cooldown with no haste interaction.
   */
  timingContexts: TimingContext[];
  /** One entry per distinct debuff bonus attr kind; empty for non-debuff skills. */
  debuffContexts: DebuffContext[];
}
