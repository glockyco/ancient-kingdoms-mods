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

/**
 * How each damage type is mitigated and avoided, mirroring the game one row per type.
 *
 * `stat` is the stat that reduces the damage. Source: server-scripts/Combat.cs:844-861 — the
 * per-damage-type switch, each read multiplied by 0.0005.
 * `avoidance` is which roll can prevent the hit. Source: server-scripts/Combat.cs:654-661 —
 * Normal damage goes to GetProbResistMeleeDamage, every other type to its own GetProbResist*.
 *
 * Physical is the one type whose stat does double duty. `defense` reduces the damage at 0.0005
 * per point, and it also feeds the block roll at 0.0001 per point, because blockChance is
 * derived from it. Source: server-scripts/Combat.cs:307-319. Both physical formulas refer
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
  Physical: { stat: "Armor Class", avoidance: "block" },
  Magic: { stat: "Magic Resist", avoidance: "resist" },
  Fire: { stat: "Fire Resist", avoidance: "resist" },
  Cold: { stat: "Cold Resist", avoidance: "resist" },
  Poison: { stat: "Poison Resist", avoidance: "resist" },
  Disease: { stat: "Disease Resist", avoidance: "resist" },
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
  }[],
): string[] {
  const eligible = new Set<string>();
  for (const item of items) {
    const classes =
      !item.classes?.length || item.classes.includes("all")
        ? ALL_CLASS_IDS
        : item.classes;
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
    grantedByItems.every((item) => item.type === "scroll");
  const hasStatBonuses = [
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

  const hasRegenBonuses = [
    skill.healing_per_second_bonus,
    skill.health_percent_per_second_bonus,
    skill.mana_per_second_bonus,
    skill.mana_percent_per_second_bonus,
    skill.energy_per_second_bonus,
    skill.energy_percent_per_second_bonus,
  ].some(hasLinearValue);

  const hasResistBonuses = [
    skill.poison_resist_bonus,
    skill.fire_resist_bonus,
    skill.cold_resist_bonus,
    skill.disease_resist_bonus,
  ].some(hasLinearValue);

  const hasAttributeBonuses = [
    skill.strength_bonus,
    skill.intelligence_bonus,
    skill.dexterity_bonus,
    skill.constitution_bonus,
    skill.wisdom_bonus,
    skill.charisma_bonus,
  ].some(hasLinearValue);

  // is_cleanse is excluded: cleanse description is in the effect summary,
  // and the card adds nothing unless the skill also has stat bonuses or other effects.
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
    mechanicsSpec.buffContexts.some(
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
        hasNonZeroField(skill.magic_damage_bonus)));

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
    skill.required_skill_points > 1 ||
    skill.required_spent_points > 0 ||
    !!skill.prerequisite_skill_id ||
    !!skill.prerequisite2_skill_id ||
    meaningfulWeapon;
  // Pet/mercenary usage flags for skill-level notes inside the mechanics card
  const usedByMercenary = usedByPets.some((p) => p.is_mercenary);
  const usedByBardMercenary = usedByPets.some(
    (p) => p.is_mercenary && p.type_monster === "Bard",
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
  // Source: server-scripts/Skills.cs:1141-1169 — Haste shortens the cooldown of mercenary auto attacks, a companion's first non-spell skill and monster or NPC non-spell attacks.
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

  // Source: server-scripts/Combat.cs:1534-1578 — melee debuffs resist with Defense, the others with their matching resistance.
  const debuffResistance = skill.is_melee_debuff
    ? "Armor Class"
    : skill.is_poison_debuff
      ? "Poison Resist"
      : skill.is_fire_debuff
        ? "Fire Resist"
        : skill.is_cold_debuff
          ? "Cold Resist"
          : skill.is_disease_debuff
            ? "Disease Resist"
            : skill.is_magic_debuff
              ? "Magic Resist"
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
