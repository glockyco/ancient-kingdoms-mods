import type { TrapType } from "$lib/constants/traps";

/**
 * Linear scaling value (base + bonus_per_level * (level - 1))
 */
export type DamageType =
  "Physical" | "Magic" | "Poison" | "Fire" | "Cold" | "Disease" | "Unknown";

export interface LinearValue {
  base_value: number;
  bonus_per_level: number;
}

/** The fields of a skill's detail view that hold a rank-scaled value. */
export type LinearSkillField = {
  [K in keyof SkillDetailView]-?: SkillDetailView[K] extends LinearValue | null
    ? K
    : never;
}[keyof SkillDetailView];

/**
 * Skill data for list view
 */
export interface SkillListView {
  id: string;
  name: string;
  visual_public_path: string | null;
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
  /** Whether `pet_id` is a mercenary, which decides its detail-page section. */
  pet_is_mercenary: boolean;
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
  is_relic: boolean;
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
  channel_pulses: number;
  health_cost_percent: LinearValue | null;
  mana_restored_percent: LinearValue | null;
  healing_percent: LinearValue | null;
  healing_percent_per_intelligence: number;
  is_necromancer_blood_pact: boolean;
  is_necromancer_death_bloom: boolean;
  is_necromancer_pet_buff: boolean;
  is_necromancer_reaper_form: boolean;

  // Damage
  damage: LinearValue | null;
  damage_percent: LinearValue | null;
  damage_type: DamageType | null;
  damage_over_time_type: DamageType | null;
  damage_shield_type: DamageType | null;
  lifetap_percent: LinearValue | null;
  aggro: LinearValue | null;
  break_armor_prob: number;
  is_assassination_skill: boolean;
  is_manaburn_skill: boolean;

  // Healing
  heals_health: LinearValue | null;
  heals_mana: LinearValue | null;
  charmed_damage_percent: LinearValue | null;
  can_heal_self: boolean;
  can_heal_others: boolean;

  // Crowd control (LinearValue — stored as JSON TEXT in DB)
  stun_chance: LinearValue | null;
  stun_time: LinearValue | null;
  fear_chance: LinearValue | null;
  fear_time: LinearValue | null;
  knockback_chance: LinearValue | null;
  knockback_distance: number;

  // Buff duration
  duration_base: number;
  duration_per_level: number;

  // Buff targeting
  can_buff_self: boolean;
  can_buff_others: boolean;
  buff_category: string | null;
  also_buff_active_pet: boolean;
  scales_with_intelligence: boolean;
  lifetap_healing_percent_bonus: LinearValue | null;

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
  critical_resist_bonus: LinearValue | null;
  accuracy_bonus: LinearValue | null;
  block_chance_bonus: LinearValue | null;
  fear_resist_chance_bonus: LinearValue | null;
  fear_resist_chance_bonus_cap: number;
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
  ignores_see_invisibility: boolean;
  /** The buff redraws a player as undead. */
  is_undead_illusion: boolean;
  /** Player race the buff disguises the caster as, or null when it grants no illusion. */
  illusion_race: string | null;
  is_mana_shield: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
  /** For a dispel: the monster buffs whose Cleanse Resist is above 0%, highest first. */
  monster_buffs_with_cleanse_resist?: {
    id: string;
    name: string;
    prob_ignore_cleanse: number;
  }[];
  is_teleport: boolean;
  is_blindness: boolean;
  is_enrage: boolean;
  is_double_exp_spell: boolean;
  scales_with_charisma: boolean;
  damage_over_time_bonus_per_charisma_point: number;
  is_bard_song: boolean;
  is_bard_charm: boolean;
  is_bard_final_cadence: boolean;
  is_bard_virtuosity: boolean;
  /** Virtuosity's attack and spell power bonus per active song beyond three. */
  additional_damage_percent_per_song: number;
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
  poison_disease_scales_with_intelligence: boolean;
  damage_over_time_bonus_per_intelligence_point: number;
  prob_ignore_cleanse: number;

  // Passive mechanics
  additional_active_bard_songs: number;
  unlimited_active_bard_songs: boolean;
  bard_song_duration_bonus_per_level: number;
  extra_gather_item_chance: number;
  food_and_drink_buff_duration_bonus_per_level: number;
  damage_over_time_execute_bonus: LinearValue | null;

  // Summon fields
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_id: string | null;
  /** Whether `pet_id` is a mercenary, which decides its detail-page section. */
  pet_is_mercenary: boolean;
  pet_name: string | null;
  is_familiar: boolean;

  // AoE fields
  affects_random_target: boolean;
  /** An area damage skill whose hits travel as projectiles. */
  area_projectile: boolean;
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

export interface SkillTrapUsage {
  type: TrapType;
  zone_id: string;
  zone_name: string;
  trap_count: number;
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
  skill_index?: number;
  /** For a familiar, the skill that summons it and sets its rank. */
  summon_skill_id?: string | null;
  summon_skill_name?: string | null;
}

// ------------------------------------------------------------
// Mechanics spec — computed server-side, rendered declaratively
// ------------------------------------------------------------

/** Who casts a skill in one mechanics context. */
export type Caster =
  /** A player of one class, by lower-case class id such as "ranger". */
  | { kind: "player"; classId: string }
  /** Any player regardless of class, as for relics. */
  | { kind: "any_player" }
  /** A mercenary, by its class name such as "Ranger". */
  | { kind: "mercenary"; className: string }
  /** A weapon's on-hit effect, applied by a player or a mercenary. */
  | { kind: "weapon_effect" }
  /** A monster or NPC. */
  | { kind: "monster" }
  | { kind: "companion" }
  | { kind: "familiar" };

export type DamageFormulaKind =
  // Physical
  | "normal" // Character-window Damage.
  | "ranger_melee" // Character-window Damage, with the bow deduction in the melee handler.
  | "rogue_melee" // Character-window Damage, with the rounded-up off-hand deduction in single-target melee.
  | "rogue_melee_merc" // Mercenary Damage, with no player off-hand deduction.
  // Ranged (physical+DEX)
  | "ranged_player" // Character-window Damage plus rounded Dexterity bonus, minus equipped melee weapon damage.
  | "ranged_player_frontal" // Character-window Damage plus rounded Dexterity bonus, without weapon subtraction.
  | "ranged_merc" // Mercenary Damage plus its rounded Dexterity bonus.
  // Poison
  | "poison_rogue" // Damage plus the rounded poison Dexterity bonus. Player single-target melee also deducts off-hand damage.
  // Magic
  | "magic_spell" // Character-window Magic Damage, including percentage bonuses.
  | "magic_weapon" // Magic Damage plus Damage, both already percentage-scaled.
  | "magic_weapon_ranger" // Magic Damage plus Damage, then the bow deduction.
  // Special
  | "bard_final_cadence" // player: second rounding after the active-song Melody multiplier
  | "bard_final_cadence_merc" // Charisma only; no Melody multiplier
  | "manaburn" // Warrior/Rogue single-target melee burns Rage for double damage. Wizard projectile burns Mana for triple damage.
  // Monster / NPC
  | "monster_melee" // The caster's own Damage at its level.
  | "monster_magic"; // The caster's own Magic Damage at its level.

/** A character-window stat, or Dexterity share, that a damage handler adds to a skill's listed damage. */
export type DamageStat =
  | "spell_power"
  | "attack_power"
  | "ranged_dexterity" // Rounded 150% of Dexterity.
  | "poison_dexterity"; // Rounded 250% of Dexterity.

/** A weapon's Base Damage that a damage handler subtracts from a player's stats. */
export type DamageDeduction =
  | "bow" // The equipped bow's Base Damage.
  | "off_hand_half" // Half the off-hand weapon's Base Damage, rounded up.
  | "main_hand"; // The main-hand weapon's Base Damage.

/** A term an effect summary adds to, or subtracts from, a skill's listed damage. */
export type DamageTerm = DamageStat | DamageDeduction;

export interface DamageContext {
  /** Every caster that shares this formula. */
  casters: Caster[];
  formula: DamageFormulaKind;
}

export type HealBonusKind =
  | "player_ranger" // Skill healing plus a separately rounded Wisdom bonus, using triple Wisdom and capped at 500%.
  | "player_other" // Skill healing plus a separately rounded Wisdom bonus, capped at 500%.
  | "merc" // Mercenary's own Wisdom, without the Ranger player's triple-Wisdom bonus.
  | "none"; // no bonus (monster, NPC, non-merc pet) — e.g. healing_circle

export interface HealContext {
  casters: Caster[];
  bonusKind: HealBonusKind;
  /** Area healing rolls for critical healing. Target healing requires can_heal_others. */
  canCrit: boolean;
}

export type BuffBonusAttrSource =
  | "player_cha" // Bard songs multiply eligible buff values by Charisma-derived Bard power
  | "player_ranger_int" // INT×3 for targeted Intelligence-scaled buffs
  | "player_int" // INT for Intelligence-scaled player buffs
  | "merc_int" // mercenary INT for Intelligence-scaled buffs
  | "player_ranger_wis" // WIS×3 (TargetBuffSkill only, not AreaBuffSkill) — e.g. ancestral_spirits
  | "player_wis" // WIS (TargetBuffSkill non-Ranger, or any AreaBuffSkill player) — e.g. inspiration
  | "merc_wis" // merc's own WIS — e.g. spirit_of_wolf
  | "merc_cha" // Bard mercenary songs multiply eligible buff values by the mercenary's Charisma. Source: server-scripts/BardMercenarySkills.cs:RefreshAura
  | "player_wis_con_avg" // round((WIS+CON)/2) for ordinary player-cast mercenary buffs. Source: AreaBuffSkill.cs:58
  | "player_wis_con_cha_half" // round((WIS+CON+CHA)/2) for Leadership. Source: AreaBuffSkill.cs:GetLeadershipAttributeBonus,58
  | "player_level" // casterLevel × 10 — relic skills (AreaBuffSkill.isRelic). Source: AreaBuffSkill.cs:38-41
  | "none"; // monster/NPC: 0 (only shown when player/merc also casts the skill)

export interface BuffContext {
  casters: Caster[];
  bonusAttrSource: BuffBonusAttrSource;
  /** True for area_buff (different Ranger/ward behaviour vs target_buff). */
  isAreaBuff: boolean;
}

export type TimingModel =
  // interval = cast_time + clamp(delay×(1−haste)/25, 0.25, 2.0); weapon refractory period.
  // Warrior and Rogue generate Rage; all other classes use Mana.
  | "player_auto" // e.g. crush_strike
  // interval = cast_time × (1 − spellHaste) + 0.75s refractory; spell haste is bounded to −50%–50%.
  // Source: server-scripts/Skills.cs:924-933, server-scripts/Player.cs:2905, server-scripts/Player.cs:refractoryPeriodSkill
  | "player_spell" // e.g. fire_blast, wind_shock, smite, mystic_spark
  | "companion" // flat cooldown: familiars, spells, and combat-pet skills other than index 0
  | "companion_auto" // non-familiar combat pet non-spell skill index 0: haste-reduced cooldown
  | "merc_auto" // interval = cast_time + cooldown×(1−haste); merc non-spell — e.g. explorer_shot
  // interval = cast_time × (1 − spellHaste) + cooldown; cast reduced by the bounded spell haste, cooldown not.
  // Source: server-scripts/Skills.cs:924-933 (cast reduction), server-scripts/Skills.cs:1141-1173 (flat cooldown), server-scripts/Pet.cs:2259-2264 (bounded spell haste)
  | "merc_spell" // e.g. flame_blast, gale_burst, divine_smite
  | "monster_spell" // spell cast time + flat cooldown; StartCast(skill, 0f) ignores spell haste
  | "monster"; // non-spell: cast_time + cooldown×(1−haste)

export interface TimingContext {
  casters: Caster[];
  model: TimingModel;
}

export type DebuffBonusAttrKind =
  | "str" // is_melee_debuff=1 — e.g. rangers_mark
  | "dex" // poison/disease without poison_disease_scales_with_intelligence
  | "int" // Intelligence-scaled poison/disease, or other magic/elemental debuff
  | "cha" // Bard songs use Charisma as bonusAttribute
  | "none"; // monster/NPC/companion: 0 — e.g. ancient_curse

export interface DebuffContext {
  /** Every caster that shares this bonus attribute kind. */
  casters: Caster[];
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
   * Populated for followup_default_attack or non-spell combat-pet skill index 0.
   * Shows the relevant cast and cooldown rules for each caster context.
   */
  timingContexts: TimingContext[];
  /** One entry per distinct debuff bonus attr kind; empty for non-debuff skills. */
  debuffContexts: DebuffContext[];
}
