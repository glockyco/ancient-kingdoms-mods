import type {
  SkillDetailView,
  SkillPet,
  Caster,
  DamageFormulaKind,
  DamageStat,
  HealBonusKind,
  BuffBonusAttrSource,
  TimingModel,
  DebuffBonusAttrKind,
  SkillMechanicsSpec,
} from "$lib/types/skills";
import { ALL_CLASS_IDS } from "$lib/utils/classes";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";

/** Group (caster, rule) pairs by rule, in first-seen order, keeping each group's first pair for its rule fields. */
function groupCasters<P extends { caster: Caster }>(
  pairs: P[],
  key: (pair: P) => string,
): Array<{ casters: Caster[]; rule: P }> {
  const groups = new Map<string, { casters: Caster[]; rule: P }>();
  for (const pair of pairs) {
    const group = groups.get(key(pair));
    if (group) group.casters.push(pair.caster);
    else groups.set(key(pair), { casters: [pair.caster], rule: pair });
  }
  return [...groups.values()];
}

/** Integer fields scaled by Buff.cs:45-275 and rounded by Charisma.cs:28-31. */
function hasCharismaScaledIntegerEffect(skill: SkillDetailView): boolean {
  return (
    hasNonZeroField(skill.health_max_bonus) ||
    hasNonZeroField(skill.mana_max_bonus) ||
    hasNonZeroField(skill.energy_max_bonus) ||
    hasNonZeroField(skill.damage_bonus) ||
    hasNonZeroField(skill.magic_damage_bonus) ||
    hasNonZeroField(skill.defense_bonus) ||
    hasNonZeroField(skill.ward_bonus) ||
    hasNonZeroField(skill.magic_resist_bonus) ||
    hasNonZeroField(skill.poison_resist_bonus) ||
    hasNonZeroField(skill.fire_resist_bonus) ||
    hasNonZeroField(skill.cold_resist_bonus) ||
    hasNonZeroField(skill.disease_resist_bonus) ||
    (skill.damage_over_time_bonus_per_charisma_point === 0 &&
      hasNonZeroField(skill.healing_per_second_bonus)) ||
    hasNonZeroField(skill.mana_per_second_bonus) ||
    hasNonZeroField(skill.energy_per_second_bonus)
  );
}

/** Percentage fields scaled by Buff.cs:59-275 and Charisma.cs:33-36. */
function hasCharismaScaledPercentageEffect(skill: SkillDetailView): boolean {
  return (
    hasNonZeroField(skill.health_max_percent_bonus) ||
    hasNonZeroField(skill.damage_percent_bonus) ||
    hasNonZeroField(skill.magic_damage_percent_bonus) ||
    hasNonZeroField(skill.block_chance_bonus) ||
    hasNonZeroField(skill.fear_resist_chance_bonus) ||
    hasNonZeroField(skill.critical_resist_bonus) ||
    hasNonZeroField(skill.accuracy_bonus) ||
    hasNonZeroField(skill.critical_chance_bonus) ||
    hasNonZeroField(skill.haste_bonus) ||
    hasNonZeroField(skill.spell_haste_bonus) ||
    hasNonZeroField(skill.health_percent_per_second_bonus) ||
    hasNonZeroField(skill.mana_percent_per_second_bonus) ||
    hasNonZeroField(skill.energy_percent_per_second_bonus) ||
    hasNonZeroField(skill.cooldown_reduction_percent)
  );
}

function hasCharismaScaledEffect(skill: SkillDetailView): boolean {
  return (
    hasCharismaScaledIntegerEffect(skill) ||
    hasCharismaScaledPercentageEffect(skill)
  );
}

// ---------------------------------------------------------------------------
// Damage formula dispatch
// ---------------------------------------------------------------------------

/** The skill fields that choose a damage handler's starting stats. */
export type DamageDispatchSkill = Pick<
  SkillDetailView,
  | "id"
  | "skill_type"
  | "damage_type"
  | "is_spell"
  | "is_scroll"
  | "required_weapon_category"
  | "is_manaburn_skill"
  | "is_bard_final_cadence"
>;

const DAMAGE_SKILL_TYPES = new Set([
  "target_damage",
  "area_damage",
  "frontal_damage",
  "target_projectile",
  "frontal_projectiles",
]);

/**
 * Resolve the damage formula for a player of a given class.
 * Source: server-scripts/TargetDamageSkill.cs, TargetProjectileSkill.cs,
 *         FrontalDamageSkill.cs, FrontalProjectilesSkill.cs, AreaDamageSkill.cs
 */
function playerDamageFormula(
  skill: DamageDispatchSkill,
  cls: string,
): DamageFormulaKind {
  if (skill.is_bard_final_cadence) return "bard_final_cadence";
  // Source: server-scripts/TargetDamageSkill.cs:132-159; TargetProjectileSkill.cs:216-219 — only Warrior/Rogue melee burns Rage, only Wizard projectiles burn Mana.
  if (
    skill.is_manaburn_skill &&
    ((skill.skill_type === "target_damage" &&
      (cls === "warrior" || cls === "rogue")) ||
      (skill.skill_type === "target_projectile" && cls === "wizard"))
  )
    return "manaburn";
  const dt = skill.damage_type;
  const type = skill.skill_type;
  const elemental =
    dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease";
  // Source: server-scripts/FrontalProjectilesSkill.cs:94-108 — Ranger precedes damage type. Area damage has no class-specific or magic-weapon branch.
  if (type === "frontal_projectiles") {
    if (cls === "ranger") return "ranged_player_frontal";
    if (dt === "Poison" && cls === "rogue") return "poison_rogue";
    return elemental || dt === "Poison" ? "magic_spell" : "normal";
  }
  if (type === "area_damage") return elemental ? "magic_spell" : "normal";
  // Source: server-scripts/TargetProjectileSkill.cs:184-204 — the elemental branch precedes Bow handling.
  if (
    type === "target_projectile" &&
    !elemental &&
    skill.required_weapon_category === "Bow"
  )
    return "ranged_player";
  if (
    dt === "Magic" &&
    !skill.is_spell &&
    skill.required_weapon_category?.startsWith("Weapon")
  ) {
    return cls === "ranger" && type !== "target_projectile"
      ? "magic_weapon_ranger"
      : "magic_weapon";
  }
  if (elemental) return "magic_spell";
  if (dt === "Poison") return cls === "rogue" ? "poison_rogue" : "magic_spell";
  if (
    cls === "ranger" &&
    (type === "target_damage" || type === "frontal_damage")
  )
    return "ranger_melee";
  // Source: server-scripts/TargetDamageSkill.cs:228-231; FrontalDamageSkill.cs:60-93 — only the single-target handler deducts the Rogue's off-hand.
  if (cls === "rogue" && type === "target_damage") return "rogue_melee";
  return "normal";
}

/**
 * Resolve the mercenary's contribution from the actual damage handler.
 */
function mercDamageFormula(
  skill: DamageDispatchSkill,
  typeMonster: string,
): DamageFormulaKind {
  if (skill.is_bard_final_cadence) return "bard_final_cadence_merc";
  const dt = skill.damage_type;
  const type = skill.skill_type;
  const elemental =
    dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease";
  // Source: server-scripts/AreaDamageSkill.cs:85-106; FrontalProjectilesSkill.cs:97-108 — neither handler gives a mercenary a class-specific Dexterity bonus.
  if (type === "area_damage") return elemental ? "magic_spell" : "normal";
  if (type === "frontal_projectiles")
    return elemental || dt === "Poison" ? "magic_spell" : "normal";
  if (
    dt === "Magic" &&
    !skill.is_spell &&
    skill.required_weapon_category?.startsWith("Weapon")
  )
    return "magic_weapon";
  if (elemental) return "magic_spell";
  // Source: server-scripts/TargetProjectileSkill.cs:189-191 — Ranger mercenary is tested after the elemental branch and before Poison.
  if (type === "target_projectile" && typeMonster === "Ranger")
    return "ranged_merc";
  // Source: server-scripts/TargetDamageSkill.cs:188-203; FrontalDamageSkill.cs:72-80; TargetProjectileSkill.cs:191 — only single-target melee Poison gives Rogue mercenaries the Dexterity bonus.
  if (dt === "Poison") {
    if (type === "target_damage")
      return typeMonster === "Rogue" ? "poison_rogue" : "magic_spell";
    if (type === "target_projectile") return "magic_spell";
    return "normal";
  }
  return typeMonster === "Rogue" ? "rogue_melee_merc" : "normal";
}

// Source: server-scripts/TargetDamageSkill.cs:180-215; TargetProjectileSkill.cs:184-191; AreaDamageSkill.cs:88-89; FrontalDamageSkill.cs:64-80; FrontalProjectilesSkill.cs:107-108 — each handler picks combat.magicDamage or combat.damage from damageType, and Poison lands on a different side per handler, independent of isSpell.
function otherDamageFormula(skill: DamageDispatchSkill): DamageFormulaKind {
  const dt = skill.damage_type;
  const elemental =
    dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease";
  const poisonMagic =
    dt === "Poison" &&
    ["target_damage", "target_projectile", "frontal_projectiles"].includes(
      skill.skill_type,
    );
  return elemental || poisonMagic ? "monster_magic" : "monster_melee";
}

// Source: server-scripts/TargetDamageSkill.cs:180-236; TargetProjectileSkill.cs:181-219; FrontalDamageSkill.cs:60-102; AreaDamageSkill.cs:85-106; FrontalProjectilesSkill.cs:94-114; Dexterity.cs:GetRangedAttackBonusPerPoint,GetPoisonDamageBonusPerPoint — the stats each handler adds to listed damage; scrolls, Mana Burn and Final Cadence add none.
/** The stats a formula adds to the skill's listed damage, before handler-specific weapon deductions. */
export function damageFormulaStats(
  skill: DamageDispatchSkill,
  kind: DamageFormulaKind,
): DamageStat[] {
  if (skill.is_scroll) return [];
  switch (kind) {
    case "manaburn":
    case "bard_final_cadence":
    case "bard_final_cadence_merc":
      return [];
    case "magic_spell":
      return ["spell_power"];
    case "magic_weapon":
    case "magic_weapon_ranger":
      return ["spell_power", "attack_power"];
    case "monster_magic":
      return skill.damage_type === "Magic" &&
        !skill.is_spell &&
        !!skill.required_weapon_category?.startsWith("Weapon") &&
        ["target_damage", "target_projectile", "frontal_damage"].includes(
          skill.skill_type,
        )
        ? ["spell_power", "attack_power"]
        : ["spell_power"];
    case "ranged_player":
    case "ranged_player_frontal":
    case "ranged_merc":
      return ["attack_power", "ranged_dexterity"];
    case "poison_rogue":
      return ["attack_power", "poison_dexterity"];
    case "normal":
    case "ranger_melee":
    case "rogue_melee":
    case "rogue_melee_merc":
    case "monster_melee":
      return ["attack_power"];
  }
}

function unanimousStats(
  skill: DamageDispatchSkill,
  kinds: DamageFormulaKind[],
): DamageStat[] {
  const [first, ...rest] = kinds.map((kind) => damageFormulaStats(skill, kind));
  const key = first.join("+");
  if (rest.some((stats) => stats.join("+") !== key)) {
    throw new Error(
      `Skill ${skill.id}: casters of one kind add different stats to its damage, so its effect summary cannot name one formula`,
    );
  }
  return first;
}

/**
 * The stats an effect summary adds to listed damage. Player classes take
 * precedence over mercenaries, and both over monsters, companions, familiars
 * and weapon procs, whose handlers all resolve like a monster's.
 */
export function summaryDamageStats(
  skill: DamageDispatchSkill,
  playerClasses: readonly string[],
  mercenaryTypes: readonly string[],
): DamageStat[] {
  if (!DAMAGE_SKILL_TYPES.has(skill.skill_type)) return [];
  if (playerClasses.length > 0) {
    return unanimousStats(
      skill,
      playerClasses.map((cls) => playerDamageFormula(skill, cls)),
    );
  }
  if (mercenaryTypes.length > 0) {
    return unanimousStats(
      skill,
      mercenaryTypes.map((type) => mercDamageFormula(skill, type)),
    );
  }
  return monsterDamageStats(skill);
}

/** The stats a monster, companion or familiar adds to the skill's listed damage. */
export function monsterDamageStats(skill: DamageDispatchSkill): DamageStat[] {
  if (!DAMAGE_SKILL_TYPES.has(skill.skill_type)) return [];
  return damageFormulaStats(skill, otherDamageFormula(skill));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Compute the mechanics spec for a skill page.
 *
 * Pure function — no side effects, no DB calls. All formula dispatch logic is
 * derived from server-scripts/*.cs source research and documented inline.
 *
 * @param skill        - Full skill detail row from the DB
 * @param usedByPets   - All pets/mercs that use this skill (must include type_monster)
 * @param hasMonsters  - Whether any monster NPC uses this skill
 * @param isWeaponProc - Whether this skill fires as a weapon proc
 *   Weapon proc skills have player_classes=[] but fire through the caster pipeline via
 *   weaponItem.procEffect.Apply(caster, 1). Damage procs enumerate player classes to
 *   capture class-specific formulas. Debuff procs use the player or mercenary's
 *   relevant attribute.
 */
export function computeMechanicsSpec(
  skill: SkillDetailView,
  usedByPets: SkillPet[],
  hasMonsters: boolean,
  isWeaponProc: boolean = false,
  weaponProcClasses: readonly string[] = ALL_CLASS_IDS,
): SkillMechanicsSpec {
  const playerClasses = skill.player_classes; // e.g. ["ranger", "rogue"]
  const mercPets = usedByPets.filter((p) => p.is_mercenary);
  const hasNonMercPet = usedByPets.some(
    (p) => !p.is_mercenary && !p.is_familiar,
  );
  const hasFamiliar = usedByPets.some((p) => p.is_familiar);

  // "other" covers monsters, NPCs, non-merc companion pets, and familiars.
  // None of these have class-specific formula branches in the server scripts.
  const otherCasters: Caster[] = [
    ...(hasMonsters ? [{ kind: "monster" } as const] : []),
    ...(hasNonMercPet ? [{ kind: "companion" } as const] : []),
    ...(hasFamiliar ? [{ kind: "familiar" } as const] : []),
  ];

  const isDamageSkill = DAMAGE_SKILL_TYPES.has(skill.skill_type);

  const isHealSkill =
    skill.skill_type === "target_heal" || skill.skill_type === "area_heal";

  const isBuffSkill =
    skill.skill_type === "target_buff" || skill.skill_type === "area_buff";
  // passive has no runtime scaling: PassiveSkill.Apply() is a no-op

  // ---------- damage ----------
  const damagePairs: Array<{ caster: Caster; formula: DamageFormulaKind }> = [];

  if (isDamageSkill) {
    for (const cls of playerClasses) {
      damagePairs.push({
        caster: { kind: "player", classId: cls },
        formula: playerDamageFormula(skill, cls),
      });
    }
    for (const pet of mercPets) {
      // type_monster is "Ranger", "Rogue", etc. (title-case from DB)
      const tm = pet.type_monster ?? "Unknown";
      damagePairs.push({
        caster: { kind: "mercenary", className: tm },
        formula: mercDamageFormula(skill, tm),
      });
    }
    for (const caster of otherCasters) {
      damagePairs.push({ caster, formula: otherDamageFormula(skill) });
    }
    // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; ProjectileSkillEffect.cs:FixedUpdate — equipped weapons trigger procs; only classes allowed by the granting equipment can use them.
    if (isWeaponProc) {
      for (const cls of weaponProcClasses) {
        damagePairs.push({
          caster: { kind: "player", classId: cls },
          formula: playerDamageFormula(skill, cls),
        });
      }
    }
    // Source: server-scripts/ScrollItem.cs:UseAfterCast; TargetProjectileSkill.cs:Apply; AreaDamageSkill.cs:Apply — scrolls cast as players, with their character contribution excluded by the damage handler.
    if (skill.is_scroll && playerClasses.length === 0) {
      damagePairs.push({
        caster: { kind: "any_player" },
        formula: playerDamageFormula(skill, "wizard"),
      });
    }
  }

  // ---------- heal ----------
  const healPairs: Array<{
    caster: Caster;
    bonusKind: HealBonusKind;
    canCrit: boolean;
  }> = [];

  if (isHealSkill && !skill.is_necromancer_death_bloom) {
    // Source: server-scripts/TargetHealSkill.cs:273-276; AreaHealSkill.cs:109-111 — target healing requires canHealOthers, area healing always rolls for critical healing.
    const canCrit = skill.skill_type === "area_heal" || skill.can_heal_others;

    // Source: server-scripts/ScrollItem.cs:UseAfterCast; TargetHealSkill.cs:Apply — scrolls call Apply as a player; pet/mercenary restoration keeps the player's Wisdom bonus.
    const healClasses = skill.is_scroll ? ALL_CLASS_IDS : playerClasses;
    for (const cls of healClasses) {
      const bonusKind: HealBonusKind =
        cls === "ranger"
          ? "player_ranger" // Source: Wisdom.cs — GetHealBonus(isRanger:true) → WIS×3×0.004
          : "player_other"; // Source: Wisdom.cs — GetHealBonus(isRanger:false) → WIS×0.004
      healPairs.push({
        caster: { kind: "player", classId: cls },
        bonusKind,
        canCrit,
      });
    }
    for (const pet of mercPets) {
      // Source: TargetHealSkill.cs — `caster is Pet { isMercenary: not false }` → pet.wisdom.GetHealBonus()
      // GetHealBonus() called without the isRanger flag; no ×3 multiplier even for Ranger merc
      healPairs.push({
        caster: { kind: "mercenary", className: pet.type_monster ?? "Unknown" },
        bonusKind: "merc",
        canCrit,
      });
    }
    // Source: TargetHealSkill.cs — else branch → bonus = 0
    for (const caster of otherCasters) {
      healPairs.push({ caster, bonusKind: "none", canCrit });
    }
  }

  // ---------- buff ----------
  const buffPairs: Array<{
    caster: Caster;
    bonusAttrSource: BuffBonusAttrSource;
    isAreaBuff: boolean;
  }> = [];

  const hasBardScaling =
    skill.is_bard_song &&
    skill.scales_with_charisma &&
    hasCharismaScaledEffect(skill);

  if (isBuffSkill && (!skill.is_bard_song || hasBardScaling)) {
    const isAreaBuff = skill.skill_type === "area_buff";

    if (skill.is_relic && isAreaBuff) {
      // Source: AreaBuffSkill.cs:38-41 — isRelic → caster.level.current * 10.
      // Relic items can be used by any player class regardless of skill.player_classes;
      // a single "Player" context covers all of them. No merc/pet path: relics are
      // player-only equipment usables.
      buffPairs.push({
        caster: { kind: "any_player" },
        bonusAttrSource: "player_level",
        isAreaBuff,
      });
    } else {
      // Source: server-scripts/RelicItem.cs:Use; TargetBuffSkill.cs:Apply — target relics use the ordinary player attribute, tripled for Rangers.
      for (const cls of skill.is_relic ? ALL_CLASS_IDS : playerClasses) {
        let src: BuffBonusAttrSource;
        if (hasBardScaling) {
          // Source: BardSongSkill.cs — Bard songs use the caster's Charisma.
          src = "player_cha";
        } else if (isAreaBuff && skill.is_mercenary_skill) {
          // Source: AreaBuffSkill.cs:GetLeadershipAttributeBonus,58 — Leadership uses round((WIS+CON+CHA)/2);
          // other player-cast mercenary buffs use round((WIS+CON)/2).
          src =
            skill.id === "leadership"
              ? "player_wis_con_cha_half"
              : "player_wis_con_avg";
        } else if (isAreaBuff) {
          // Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute — scalesWithIntelligence selects intelligence, otherwise wisdom.
          src = skill.scales_with_intelligence ? "player_int" : "player_wis";
        } else if (cls === "ranger") {
          // Source: TargetBuffSkill.cs:434-437; BuffSkill.cs:GetBuffPowerAttribute — Ranger → attribute * 3
          src = skill.scales_with_intelligence
            ? "player_ranger_int"
            : "player_ranger_wis";
        } else {
          // Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute — scalesWithIntelligence selects intelligence, otherwise wisdom.
          src = skill.scales_with_intelligence ? "player_int" : "player_wis";
        }
        buffPairs.push({
          caster: { kind: "player", classId: cls },
          bonusAttrSource: src,
          isAreaBuff,
        });
      }
      for (const pet of mercPets) {
        // Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute — mercenary buffs select intelligence when scalesWithIntelligence, otherwise wisdom.
        // Source: server-scripts/BardMercenarySkills.cs:RefreshAura — a Bard mercenary's song buff carries the mercenary's Charisma.
        buffPairs.push({
          caster: {
            kind: "mercenary",
            className: pet.type_monster ?? "Unknown",
          },
          bonusAttrSource: hasBardScaling
            ? "merc_cha"
            : skill.scales_with_intelligence
              ? "merc_int"
              : "merc_wis",
          isAreaBuff,
        });
      }
      // Source: BuffSkill.cs:GetBuffPowerAttribute — final else → 0
      // Only shown when a player or merc also casts the skill; pure monster-only
      // buff skills have bonusAttrSource=none which is uninformative to players.
      if (playerClasses.length > 0 || mercPets.length > 0) {
        for (const caster of otherCasters) {
          buffPairs.push({ caster, bonusAttrSource: "none", isAreaBuff });
        }
      }
    }
  }

  // ---------- timing ----------
  // Populated for follow-up attacks and non-spell combat-pet skill 0.
  // Source: server-scripts/Skills.cs:1141-1159; Combat.cs:341-347 — followupDefaultAttack for a non-spell mercenary subtracts haste * cooldown (haste cap)
  // Source: server-scripts/Player.cs:3422-3459 — GetSkillRefractoryPeriod returns 0.75 seconds for spells and computes weapon delay for other attacks
  // Source: server-scripts/Monster.cs:UpdateServer_CASTING — FinishCastMeleeAttackMonster vs FinishCast for monsters
  const timingPairs: Array<{ caster: Caster; model: TimingModel }> = [];

  if (
    skill.followup_default_attack ||
    usedByPets.some(
      (p) =>
        !p.is_mercenary &&
        !p.is_familiar &&
        p.skill_index === 0 &&
        !skill.is_spell,
    )
  ) {
    const isSpell = skill.is_spell;
    const hasReqWeapon = Boolean(skill.required_weapon_category);

    for (const cls of playerClasses) {
      // Source: Player.cs:2783 — delay-based refractory applies when !isSpell && hasReqWeapon
      // Source: Player.cs:refractoryPeriodSkill,3084-3087 — isSpell && !hasReqWeapon → flat 0.75s refractory (player_spell)
      // Note: spell auto-attacks have no required_weapon_category in the data, so isSpell alone is the discriminant.
      const model: TimingModel =
        !isSpell && hasReqWeapon
          ? "player_auto"
          : isSpell
            ? "player_spell"
            : "companion";
      timingPairs.push({ caster: { kind: "player", classId: cls }, model });
    }
    for (const pet of mercPets) {
      // Source: Skills.cs:1141-1159 — followupDefaultAttack && !isSpell → cooldown * (1 - haste)
      const model: TimingModel = isSpell ? "merc_spell" : "merc_auto";
      timingPairs.push({
        caster: { kind: "mercenary", className: pet.type_monster ?? "Unknown" },
        model,
      });
    }
    if (hasMonsters) {
      // Source: server-scripts/Monster.cs:2048-2054; Npc.cs:1302-1308 — spells call FinishCast, non-spells FinishCastMeleeAttackMonster.
      const model: TimingModel = isSpell ? "monster_spell" : "monster";
      timingPairs.push({ caster: { kind: "monster" }, model });
    }
    // Source: server-scripts/Skills.cs:1141-1169 — only non-familiar combat-pet non-spell skillIndex 0 receives haste-reduced cooldown.
    for (const pet of usedByPets.filter((p) => !p.is_mercenary)) {
      timingPairs.push({
        caster: { kind: pet.is_familiar ? "familiar" : "companion" },
        model:
          !pet.is_familiar && !isSpell && pet.skill_index === 0
            ? "companion_auto"
            : "companion",
      });
    }
  }

  // ---------- debuff ----------
  // Source: TargetDebuffSkill.cs:265-279 — bonusAttribute determined by caster type and skill flags.
  // Non-Player casters (monsters, NPCs, non-merc pets) fall through to default: bonusAttribute = 0.
  const isDebuffSkill =
    skill.skill_type === "target_debuff" || skill.skill_type === "area_debuff";

  // Only compute contexts when there are actually scaled fields to show.
  // Use hasNonZeroField to avoid false positives from all-zero JSON objects in DB.
  const hasDebuffScaling =
    isDebuffSkill &&
    !skill.is_cleanse &&
    ((skill.scales_with_charisma && hasCharismaScaledEffect(skill)) ||
      hasNonZeroField(skill.healing_per_second_bonus) ||
      hasNonZeroField(skill.defense_bonus) ||
      hasNonZeroField(skill.magic_resist_bonus) ||
      hasNonZeroField(skill.poison_resist_bonus) ||
      hasNonZeroField(skill.fire_resist_bonus) ||
      hasNonZeroField(skill.cold_resist_bonus) ||
      hasNonZeroField(skill.disease_resist_bonus) ||
      hasNonZeroField(skill.damage_bonus) ||
      hasNonZeroField(skill.magic_damage_bonus));

  const debuffPairs: Array<{
    caster: Caster;
    bonusAttrKind: DebuffBonusAttrKind;
  }> = [];

  if (hasDebuffScaling) {
    // Determine attribute kind for player/merc casters (same formula for both).
    const playerMercKind: DebuffBonusAttrKind = skill.scales_with_charisma
      ? "cha"
      : skill.is_melee_debuff
        ? "str"
        : (skill.is_poison_debuff || skill.is_disease_debuff) &&
            !skill.poison_disease_scales_with_intelligence
          ? "dex"
          : "int";

    for (const cls of playerClasses) {
      debuffPairs.push({
        caster: { kind: "player", classId: cls },
        bonusAttrKind: playerMercKind,
      });
    }
    // Source: TargetDamageSkill.cs:246-276 and ProjectileSkillEffect.cs:143-155 —
    // weapon proc effects call Apply(player/pet, 1). TargetDebuffSkill.cs:273-280
    // then reads the player or mercenary attribute even though proc skills have no
    // player_classes entries of their own.
    if (isWeaponProc) {
      debuffPairs.push({
        caster: { kind: "weapon_effect" },
        bonusAttrKind: playerMercKind,
      });
    }
    for (const pet of mercPets) {
      debuffPairs.push({
        caster: { kind: "mercenary", className: pet.type_monster ?? "Unknown" },
        bonusAttrKind: playerMercKind,
      });
    }
    // Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute — other casters receive no attribute bonus; only show that comparison beside a scaled caster.
    if (debuffPairs.length > 0) {
      for (const caster of otherCasters) {
        debuffPairs.push({ caster, bonusAttrKind: "none" });
      }
    }
  }

  return {
    damageContexts: groupCasters(damagePairs, (pair) => pair.formula).map(
      ({ casters, rule }) => ({ casters, formula: rule.formula }),
    ),
    healContexts: groupCasters(
      healPairs,
      (pair) => `${pair.bonusKind}:${pair.canCrit}`,
    ).map(({ casters, rule }) => ({
      casters,
      bonusKind: rule.bonusKind,
      canCrit: rule.canCrit,
    })),
    buffContexts: groupCasters(
      buffPairs,
      (pair) => `${pair.bonusAttrSource}:${pair.isAreaBuff}`,
    ).map(({ casters, rule }) => ({
      casters,
      bonusAttrSource: rule.bonusAttrSource,
      isAreaBuff: rule.isAreaBuff,
    })),
    timingContexts: groupCasters(timingPairs, (pair) => pair.model).map(
      ({ casters, rule }) => ({ casters, model: rule.model }),
    ),
    debuffContexts: groupCasters(debuffPairs, (pair) => pair.bonusAttrKind).map(
      ({ casters, rule }) => ({ casters, bonusAttrKind: rule.bonusAttrKind }),
    ),
  };
}
