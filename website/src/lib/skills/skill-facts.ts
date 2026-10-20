import type {
  SkillDetailView,
  SkillPet,
  SkillItemSource,
  SkillMechanicsSpec,
  TimingModel,
} from "$lib/types/skills";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";
import { hasLinearValue } from "./skill-format";
import { ALL_CLASS_IDS } from "$lib/utils/classes";
import { atRank } from "$lib/calculation/format";
import type { LinearValue } from "$lib/types/skills";
import { statName } from "$lib/stats";

/** Bonuses a debuff may not carry and still bypass a boss's debuff immunity. */
const BOSS_DOT_ZERO_FIELDS = [
  "health_max_bonus",
  "health_max_percent_bonus",
  "mana_max_bonus",
  "mana_max_percent_bonus",
  "energy_max_bonus",
  "damage_bonus",
  "damage_percent_bonus",
  "magic_damage_bonus",
  "magic_damage_percent_bonus",
  "defense_bonus",
  "ward_bonus",
  "damage_shield",
  "magic_resist_bonus",
  "poison_resist_bonus",
  "fire_resist_bonus",
  "cold_resist_bonus",
  "disease_resist_bonus",
  "block_chance_bonus",
  "fear_resist_chance_bonus",
  "critical_resist_bonus",
  "accuracy_bonus",
  "critical_chance_bonus",
  "haste_bonus",
  "spell_haste_bonus",
  "mana_percent_per_second_bonus",
  "mana_per_second_bonus",
  "energy_percent_per_second_bonus",
  "energy_per_second_bonus",
  "cooldown_reduction_percent",
  "heal_on_hit_percent",
  "lifetap_healing_percent_bonus",
  "strength_bonus",
  "intelligence_bonus",
  "dexterity_bonus",
  "charisma_bonus",
  "wisdom_bonus",
  "constitution_bonus",
] as const satisfies readonly (keyof SkillDetailView)[];

/** Whether a debuff still affects monsters listing Immune to Debuffs, by kind of monster. */
export interface ImmuneDebuffBypass {
  boss: boolean;
  otherMonster: boolean;
}

/**
 * A boss lets through only damage over time, optionally with a slow, that changes nothing else.
 * Other monsters let through resistance-decrease skills and positive Health Regeneration. Debuffs
 * never carry the undead illusion or Avatar of War flags the boss check also refuses.
 * Source: server-scripts/BuffSkill.cs:IgnoreImmuneDebuff; TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply
 */
export function immuneDebuffBypass(
  skill: SkillDetailView,
  rank: number,
): ImmuneDebuffBypass {
  const value = (field: LinearValue | null) =>
    field ? atRank(field, rank) : 0;
  const healing = value(skill.healing_per_second_bonus);
  const healthPercent = value(skill.health_percent_per_second_bonus);
  const refusedByBoss =
    skill.is_dispel ||
    skill.is_cleanse ||
    skill.is_blindness ||
    skill.is_invisibility ||
    (skill.illusion_race ?? "").trim() !== "" ||
    healing > 0 ||
    healthPercent > 0 ||
    (healing >= 0 && healthPercent >= 0);
  return {
    boss:
      !refusedByBoss &&
      value(skill.speed_bonus) <= 0 &&
      BOSS_DOT_ZERO_FIELDS.every((field) => value(skill[field]) === 0),
    otherMonster: skill.is_decrease_resists_skill || healing > 0,
  };
}

/**
 * How each damage type is mitigated and avoided, mirroring the game one row per type.
 *
 * `stat` is the stat that reduces the damage. Source: server-scripts/Combat.cs:855-872 — the
 * per-damage-type switch, each read multiplied by 0.0005.
 * `avoidance` is which roll can prevent the hit. Source: server-scripts/Combat.cs:665-672 —
 * Normal damage goes to GetProbResistMeleeDamage, every other type to its own GetProbResist*.
 *
 * Physical is the one type whose stat does double duty. `defense` reduces the damage at 0.0005
 * per point, and it also feeds the block roll at 0.0001 per point, because blockChance is
 * derived from it. Source: server-scripts/Combat.cs:309-321. Both physical formulas refer
 * to Defense.
 *
 * Stat names are looked up here and never assembled from a fragment. Appending "Resist" to a
 * damage type once produced `physicalResist`, which the game does not implement.
 */
export interface DamageMechanics {
  stat: string;
  avoidance: "block" | "resist";
}

const DAMAGE_MECHANICS: Record<string, DamageMechanics> = {
  Physical: { stat: statName("armor_class"), avoidance: "block" },
  Magic: { stat: statName("magic_resist"), avoidance: "resist" },
  Fire: { stat: statName("fire_resist"), avoidance: "resist" },
  Cold: { stat: statName("cold_resist"), avoidance: "resist" },
  Poison: { stat: statName("poison_resist"), avoidance: "resist" },
  Disease: { stat: statName("disease_resist"), avoidance: "resist" },
};

/** What the skill page derives from a skill and the pets that use it. */
export interface SkillFacts {
  isWildStrike: boolean;
  losesVeteranPoints: boolean;
  hasScrollMasteryScaling: boolean;
  hasScrollDispelScaling: boolean;
  scrollOnly: boolean;
  hasBuffEffects: boolean;
  hasAnyBonuses: boolean;
  hasAttributeScaledBonuses: boolean;
  hasCrowdControl: boolean;
  hasDamage: boolean;
  hasActualDamage: boolean;
  meaningfulWeapon: boolean;
  hasRequirements: boolean;
  usedByMercenary: boolean;
  usedByMonster: boolean;
  usedByBardMercenary: boolean;
  /** A Bard or Necromancer mercenary uses the skill, whose rank never falls below 1. */
  usedByRankOneMercenary: boolean;
  usedByCompanion: boolean;
  usedByFamiliar: boolean;
  /** The skills that summon the familiars using this skill, which set its rank. */
  familiarSummonSkills: { id: string; name: string }[];
  shortensCast: boolean;
  timingModels: Set<TimingModel>;
  hasteCooldownCasters: string;
  isDamageType: boolean;
  isHealType: boolean;
  isBuffType: boolean;
  isDebuffType: boolean;
  debuffResistance: string | null;
  damageMechanics: DamageMechanics | null;
}

// Source: server-scripts/EquipmentItem.cs:CanClassUse; server-scripts/ProjectileSkillEffect.cs:FixedUpdate — equipped weapons respect class restrictions, and bow procs fire only for Rangers.
export function weaponProcClasses(
  items: {
    classes: string[] | null;
    weaponCategory: string | null;
    classRestrictionsWithheld?: boolean;
  }[],
): string[] {
  const eligible = new Set<string>();
  for (const item of items) {
    const classes =
      (!item.classes?.length || item.classes.includes("all")) &&
      !item.classRestrictionsWithheld
        ? ALL_CLASS_IDS
        : (item.classes ?? []);
    for (const classId of classes) {
      if (item.weaponCategory !== "Bow" || classId === "ranger")
        eligible.add(classId);
    }
  }
  return [...eligible];
}

export function skillFacts(
  skill: SkillDetailView,
  usedByPets: SkillPet[],
  mechanicsSpec: SkillMechanicsSpec,
  grantedByItems: SkillItemSource[],
  usedByMonster = false,
  usedByNpc = false,
): SkillFacts {
  const isWildStrike = skill.id === "wild_strike";
  const losesVeteranPoints =
    skill.is_veteran && skill.required_skill_points > 1;
  const isScrollTriggered = grantedByItems.some(
    (item) => item.type === "scroll",
  );
  const hasScrollMasteryScaling = isScrollTriggered && skill.max_level > 1;
  const hasScrollDispelScaling = hasScrollMasteryScaling && skill.is_dispel;
  const scrollOnly =
    isScrollTriggered &&
    skill.player_classes.length === 0 &&
    usedByPets.length === 0 &&
    !usedByMonster &&
    !usedByNpc &&
    grantedByItems.every((item) => item.type === "scroll");
  // Source: server-scripts/TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — a cleanse spell removes debuffs and never applies its own buff fields.
  const appliesBuffFields = !skill.is_cleanse;
  const hasStatBonuses =
    appliesBuffFields &&
    [
      skill.health_max_bonus,
      skill.health_max_percent_bonus,
      skill.mana_max_bonus,
      skill.mana_max_percent_bonus,
      skill.energy_max_bonus,
      skill.defense_bonus,
      skill.ward_bonus,
      skill.magic_resist_bonus,
      skill.damage_bonus,
      skill.damage_percent_bonus,
      skill.magic_damage_bonus,
      skill.magic_damage_percent_bonus,
      skill.haste_bonus,
      skill.spell_haste_bonus,
      skill.speed_bonus,
      skill.critical_chance_bonus,
      skill.critical_resist_bonus,
      skill.accuracy_bonus,
      skill.block_chance_bonus,
      skill.fear_resist_chance_bonus,
      skill.damage_shield,
      skill.cooldown_reduction_percent,
      skill.heal_on_hit_percent,
    ].some(hasLinearValue);

  const hasRegenBonuses =
    appliesBuffFields &&
    [
      skill.healing_per_second_bonus,
      skill.health_percent_per_second_bonus,
      skill.mana_per_second_bonus,
      skill.mana_percent_per_second_bonus,
      skill.energy_per_second_bonus,
      skill.energy_percent_per_second_bonus,
    ].some(hasLinearValue);

  const hasResistBonuses =
    appliesBuffFields &&
    [
      skill.poison_resist_bonus,
      skill.fire_resist_bonus,
      skill.cold_resist_bonus,
      skill.disease_resist_bonus,
    ].some(hasLinearValue);

  const hasAttributeBonuses =
    appliesBuffFields &&
    [
      skill.strength_bonus,
      skill.intelligence_bonus,
      skill.dexterity_bonus,
      skill.constitution_bonus,
      skill.wisdom_bonus,
      skill.charisma_bonus,
    ].some(hasLinearValue);

  // A cleanse's description lives in the effect summary, and its buff fields never apply.
  // duration_base alone is not sufficient: some skills (e.g. master_poisoner,
  // detect_traps) have a duration but no displayable stat rows — their effect is
  // hardcoded by name in server scripts and described in the effect summary instead.
  const hasBuffEffects =
    hasStatBonuses ||
    hasRegenBonuses ||
    hasResistBonuses ||
    hasAttributeBonuses ||
    skill.is_invisibility ||
    skill.is_mana_shield ||
    skill.is_blindness ||
    skill.is_enrage ||
    skill.is_permanent ||
    skill.is_only_for_magic_classes;

  const hasAnyBonuses =
    hasStatBonuses ||
    hasRegenBonuses ||
    hasResistBonuses ||
    hasAttributeBonuses;

  // Fields that use the generic Buff bonus attribute. Bard songs instead scale
  // every eligible effect through their Charisma multiplier.
  const hasAttributeScaledBonuses =
    appliesBuffFields &&
    (mechanicsSpec.buffContexts.some(
      (ctx) =>
        ctx.bonusAttrSource === "player_cha" ||
        ctx.bonusAttrSource === "merc_cha",
    ) ||
      hasNonZeroField(skill.health_max_bonus) ||
      hasNonZeroField(skill.defense_bonus) ||
      hasNonZeroField(skill.magic_resist_bonus) ||
      hasNonZeroField(skill.poison_resist_bonus) ||
      hasNonZeroField(skill.fire_resist_bonus) ||
      hasNonZeroField(skill.cold_resist_bonus) ||
      hasNonZeroField(skill.disease_resist_bonus) ||
      hasNonZeroField(skill.healing_per_second_bonus) ||
      hasNonZeroField(skill.damage_shield) ||
      hasNonZeroField(skill.ward_bonus) ||
      (skill.id === "leadership" &&
        (hasNonZeroField(skill.damage_bonus) ||
          hasNonZeroField(skill.magic_damage_bonus))));

  const hasCrowdControl =
    hasLinearValue(skill.stun_chance) ||
    hasLinearValue(skill.fear_chance) ||
    hasLinearValue(skill.knockback_chance);

  const hasDamage = !!(
    hasLinearValue(skill.damage) ||
    hasLinearValue(skill.damage_percent) ||
    hasLinearValue(skill.aggro) ||
    hasLinearValue(skill.lifetap_percent) ||
    skill.break_armor_prob > 0 ||
    skill.is_assassination_skill ||
    skill.is_manaburn_skill
  );

  // Source: server-scripts/AreaDamageSkill.cs:Apply; server-scripts/TargetDamageSkill.cs:ApplyDamage — damage is applied only when the calculated amount is positive.
  // Aggro-only skills call DealDamageAt with amountDamage=0, so no damage formula applies
  const hasActualDamage = !!(
    hasLinearValue(skill.damage) ||
    hasLinearValue(skill.damage_percent) ||
    skill.is_manaburn_skill ||
    skill.is_assassination_skill
  );

  // "Weapon" means any melee weapon (StartsWith match) — not a meaningful restriction.
  // Source: server-scripts/ScriptableSkill.cs — CheckWeapon(), line 100
  const meaningfulWeapon =
    !!skill.required_weapon_category &&
    skill.required_weapon_category !== "Weapon";

  const hasRequirements =
    (skill.player_classes.length > 0 && skill.tier >= 1 && skill.tier <= 4) ||
    skill.level_required > 1 ||
    (skill.player_classes.length > 0 && skill.required_skill_points !== 1) ||
    skill.required_spent_points > 0 ||
    !!skill.prerequisite_skill_id ||
    !!skill.prerequisite2_skill_id ||
    meaningfulWeapon;
  // Pet/mercenary usage flags for skill-level notes inside the mechanics card
  const usedByMercenary = usedByPets.some((p) => p.is_mercenary);
  const usedByBardMercenary = usedByPets.some(
    (p) => p.is_mercenary && p.type_monster === "Bard",
  );
  // Source: server-scripts/PetSkills.cs:RefreshSkillLevels — Bard and Necromancer mercenaries keep every skill at rank 1 or higher.
  const usedByRankOneMercenary = usedByPets.some(
    (p) =>
      p.is_mercenary &&
      (p.type_monster === "Bard" || p.type_monster === "Necromancer"),
  );
  const usedByCompanion = usedByPets.some(
    (p) => !p.is_mercenary && !p.is_familiar,
  );
  const usedByFamiliar = usedByPets.some((p) => p.is_familiar);
  const familiarSummonSkills = usedByPets.flatMap((p) =>
    p.is_familiar && p.summon_skill_id && p.summon_skill_name
      ? [{ id: p.summon_skill_id, name: p.summon_skill_name }]
      : [],
  );

  // Source: server-scripts/Skills.cs:924-933 — player and mercenary spells subtract their spell-haste percentage of the cast time; monsters cast with 0 spell haste.
  const shortensCast =
    skill.is_spell &&
    !skill.is_scroll &&
    skill.channel_pulses === 0 &&
    (skill.cast_time?.base_value ?? 0) > 0 &&
    (skill.player_classes.length > 0 || usedByMercenary);
  const timingModels = new Set(
    mechanicsSpec.timingContexts.map((ctx) => ctx.model),
  );
  // Source: server-scripts/Skills.cs:1141-1173 — Haste shortens the cooldown of mercenary auto attacks, a companion's first non-spell skill and monster or NPC non-spell attacks.
  const hasteCooldownCasters = new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(
    (
      [
        ["merc_auto", "mercenaries"],
        ["companion_auto", "companions"],
        ["monster", "monsters and NPCs"],
      ] as const
    )
      .filter(([model]) => timingModels.has(model))
      .map(([, casters]) => casters),
  );

  const isDamageType =
    skill.skill_type === "target_damage" ||
    skill.skill_type === "area_damage" ||
    skill.skill_type === "frontal_damage" ||
    skill.skill_type === "target_projectile" ||
    skill.skill_type === "frontal_projectiles";

  const isHealType =
    skill.skill_type === "target_heal" || skill.skill_type === "area_heal";

  const isBuffType =
    skill.skill_type === "target_buff" ||
    skill.skill_type === "area_buff" ||
    skill.skill_type === "passive";

  const isDebuffType =
    skill.skill_type === "target_debuff" || skill.skill_type === "area_debuff";

  // Source: server-scripts/Combat.cs:1545-1589 — melee debuffs resist with Defense, the others with their matching resistance.
  const debuffResistance = skill.is_melee_debuff
    ? statName("armor_class")
    : skill.is_poison_debuff
      ? statName("poison_resist")
      : skill.is_fire_debuff
        ? statName("fire_resist")
        : skill.is_cold_debuff
          ? statName("cold_resist")
          : skill.is_disease_debuff
            ? statName("disease_resist")
            : skill.is_magic_debuff
              ? statName("magic_resist")
              : null;
  const damageMechanics = ((): DamageMechanics | null => {
    if (!isDamageType) return null;
    // The game's enum value is DamageType.Normal and "Physical" is only its exported spelling, so
    // a damage skill that declares no type is physical rather than untyped.
    if (!skill.damage_type) return DAMAGE_MECHANICS.Physical;
    // Unknown exported types render an explicit unmapped-rule warning.
    return DAMAGE_MECHANICS[skill.damage_type] ?? null;
  })();

  return {
    isWildStrike,
    losesVeteranPoints,
    hasScrollMasteryScaling,
    hasScrollDispelScaling,
    scrollOnly,
    hasBuffEffects,
    hasAnyBonuses,
    hasAttributeScaledBonuses,
    hasCrowdControl,
    hasDamage,
    hasActualDamage,
    meaningfulWeapon,
    hasRequirements,
    usedByMercenary,
    usedByMonster,
    usedByBardMercenary,
    usedByRankOneMercenary,
    usedByCompanion,
    usedByFamiliar,
    familiarSummonSkills,
    shortensCast,
    timingModels,
    hasteCooldownCasters,
    isDamageType,
    isHealType,
    isBuffType,
    isDebuffType,
    debuffResistance,
    damageMechanics,
  };
}
