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
  is_teleport: boolean;
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

export type WeaponSlotName = "main" | "off" | "bow" | "melee" | "wand";

export type DamageFormulaKind =
  // Physical
  | "normal" // STR×1.0 + all equipment — e.g. slam
  | "ranger_melee" // STR×1.0 + all equip − bow slot bonus (slot 13) — e.g. swift_slash
  | "rogue_melee" // STR×1.0 + main-hand + ⌊50% off-hand⌋ + other equip — e.g. ambush
  | "rogue_melee_merc" // STR×1.0 + main-hand + off-hand (full, no penalty) + other equip — e.g. pierce
  // Ranged (physical+DEX)
  | "ranged_player" // STR×1.0 + bow+armour + DEX×1.5 − melee slot bonus — e.g. archer_shot
  | "ranged_player_frontal" // STR×1.0 + all equip + DEX×1.5 (no subtraction) — e.g. forest_guardians_aid
  | "ranged_merc" // STR×1.0 + bow + melee weapon + other equip + DEX×1.5 — e.g. explorer_shot
  // Poison
  | "poison_rogue" // STR×1.0 + main-hand + ⌊50% off-hand⌋ + other equip + DEX×2.5 — e.g. deadly_strike
  // Magic
  | "magic_spell" // INT×1.5 + equipment — e.g. fireball
  | "magic_weapon" // INT×1.5 + STR×1.0 + equipment (additive; Cleric) — e.g. holy_wrath
  | "magic_weapon_ranger" // INT×1.5 + magic equip + STR×1.0 + non-bow equip (Ranger) — e.g. wild_strike
  // Special
  | "manaburn" // energy/mana ×2, bypasses mitigation — e.g. rageblow
  // Monster / NPC (level-scaled, no player stats)
  | "monster_melee" // baseDamage(level) — e.g. ant_attack
  | "monster_magic"; // baseMagicDamage(level) — e.g. abyssal_orb

export interface DamageContext {
  /** One or more caster descriptions that all share this formula. */
  casterLabels: string[];
  formula: DamageFormulaKind;
}

export type HealBonusKind =
  | "player_ranger" // base × min((WIS×3)×0.004, 5.0) — e.g. breeze
  | "player_other" // base × min(WIS×0.004, 5.0) — e.g. healing
  | "merc" // base × min(WIS×0.004, 5.0) using merc's own WIS; no ×3 for Ranger merc — e.g. swift_bloom
  | "none"; // no bonus (monster, NPC, non-merc pet) — e.g. healing_circle

export interface HealContext {
  casterLabels: string[];
  bonusKind: HealBonusKind;
  /** Whether the critical heal path applies (can_heal_others only). */
  canCrit: boolean;
}

export type BuffBonusAttrSource =
  | "player_ranger_wis" // WIS×3 (TargetBuffSkill only, not AreaBuffSkill) — e.g. ancestral_spirits
  | "player_wis" // WIS (TargetBuffSkill non-Ranger, or any AreaBuffSkill player) — e.g. inspiration
  | "merc_wis" // merc's own WIS — e.g. spirit_of_wolf
  | "player_charisma" // player CHA (AreaBuffSkill + is_mercenary_skill override) — only skill: leadership (its non-zero fields don't respond to bonusAttribute when positive, so CHA has no practical effect currently)
  | "none"; // monster/NPC: 0 (only shown when player/merc also casts the skill)

export interface BuffContext {
  casterLabels: string[];
  bonusAttrSource: BuffBonusAttrSource;
  /** True for area_buff (different Ranger/ward behaviour vs target_buff). */
  isAreaBuff: boolean;
}

export type TimingModel =
  // interval = cast_time + clamp(delay×(1−haste)/25, 0.25, 2.0); weapon refractory period.
  // Warrior and Rogue generate Rage; all other classes use Mana.
  | "player_auto" // e.g. crush_strike
  // interval = cast_time × (1 − spellHaste) + 0.75s refractory; hard cap: 50% (Combat.cs:332).
  // Source: server-scripts/Skills.cs:673-675, server-scripts/Combat.cs:332, server-scripts/Player.cs:298
  | "player_spell" // e.g. fire_blast, wind_shock, smite, mystic_spark
  | "companion" // interval = cast_time + cooldown; companions, familiars, no-weapon followup
  | "merc_auto" // interval = cast_time + cooldown×(1−haste); merc non-spell — e.g. explorer_shot
  // interval = cast_time × (1 − spellHaste) + cooldown; cast reduced by spell haste (cap 50%), cooldown not.
  // Source: server-scripts/Skills.cs:673-675 (cast reduction), Skills.cs:772 (flat cooldown), Combat.cs:332 (cap)
  | "merc_spell" // e.g. flame_blast, gale_burst, divine_smite
  // Monster.cs and Npc.cs both call FinishCastMeleeAttackMonster which haste-reduces
  // cooldown unconditionally regardless of isSpell — one model covers both.
  | "monster"; // interval = cast_time + cooldown×(1−haste) — e.g. blood_attack

export interface TimingContext {
  casterLabels: string[];
  model: TimingModel;
}

export type DebuffBonusAttrKind =
  | "str" // is_melee_debuff=1 — e.g. rangers_mark
  | "dex" // is_poison_debuff=1 or is_disease_debuff=1 — e.g. poison_rend
  | "int" // default (magic/elemental debuff) — e.g. symbol_of_the_arbiter
  | "none"; // monster/NPC/companion: 0 — e.g. ancient_curse

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
