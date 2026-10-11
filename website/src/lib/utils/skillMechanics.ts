import type {
  SkillDetailView,
  SkillPet,
  DamageFormulaKind,
  DamageContext,
  HealBonusKind,
  HealContext,
  BuffBonusAttrSource,
  BuffContext,
  TimingModel,
  TimingContext,
  DebuffBonusAttrKind,
  DebuffContext,
  SkillMechanicsSpec,
} from "$lib/types/skills";
import { ALL_CLASS_IDS } from "$lib/utils/classes";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";

// ---------------------------------------------------------------------------
// Helpers — group (label, formula) pairs into deduplicated context entries
// ---------------------------------------------------------------------------

/** Merge individual (label, formula) pairs into grouped DamageContext entries. */
function groupDamage(
  pairs: Array<{ label: string; formula: DamageFormulaKind }>,
): DamageContext[] {
  const map = new Map<DamageFormulaKind, string[]>();
  for (const { label, formula } of pairs) {
    if (!map.has(formula)) map.set(formula, []);
    map.get(formula)!.push(label);
  }
  return [...map.entries()].map(([formula, casterLabels]) => ({
    casterLabels,
    formula,
  }));
}

function groupHeal(
  pairs: Array<{ label: string; bonusKind: HealBonusKind; canCrit: boolean }>,
): HealContext[] {
  // Key = bonusKind + canCrit — both must match to merge
  const map = new Map<string, { labels: string[]; canCrit: boolean }>();
  for (const { label, bonusKind, canCrit } of pairs) {
    const key = `${bonusKind}:${canCrit}`;
    if (!map.has(key)) map.set(key, { labels: [], canCrit });
    map.get(key)!.labels.push(label);
  }
  return [...map.entries()].map(([key, { labels, canCrit }]) => ({
    casterLabels: labels,
    bonusKind: key.split(":")[0] as HealBonusKind,
    canCrit,
  }));
}

function groupBuff(
  pairs: Array<{
    label: string;
    bonusAttrSource: BuffBonusAttrSource;
    isAreaBuff: boolean;
  }>,
): BuffContext[] {
  const map = new Map<string, { labels: string[]; isAreaBuff: boolean }>();
  for (const { label, bonusAttrSource, isAreaBuff } of pairs) {
    const key = `${bonusAttrSource}:${isAreaBuff}`;
    if (!map.has(key)) map.set(key, { labels: [], isAreaBuff });
    map.get(key)!.labels.push(label);
  }
  return [...map.entries()].map(([key, { labels, isAreaBuff }]) => ({
    casterLabels: labels,
    bonusAttrSource: key.split(":")[0] as BuffBonusAttrSource,
    isAreaBuff,
  }));
}

function groupTiming(
  pairs: Array<{ label: string; model: TimingModel }>,
): TimingContext[] {
  const map = new Map<TimingModel, string[]>();
  for (const { label, model } of pairs) {
    if (!map.has(model)) map.set(model, []);
    map.get(model)!.push(label);
  }
  return [...map.entries()].map(([model, casterLabels]) => ({
    casterLabels,
    model,
  }));
}

function groupDebuff(
  pairs: Array<{ label: string; bonusAttrKind: DebuffBonusAttrKind }>,
): DebuffContext[] {
  const map = new Map<DebuffBonusAttrKind, string[]>();
  for (const { label, bonusAttrKind } of pairs) {
    if (!map.has(bonusAttrKind)) map.set(bonusAttrKind, []);
    map.get(bonusAttrKind)!.push(label);
  }
  return [...map.entries()].map(([bonusAttrKind, casterLabels]) => ({
    casterLabels,
    bonusAttrKind,
  }));
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

/**
 * Resolve the damage formula for a player of a given class.
 * Source: server-scripts/TargetDamageSkill.cs, TargetProjectileSkill.cs,
 *         FrontalDamageSkill.cs, FrontalProjectilesSkill.cs, AreaDamageSkill.cs
 */
function playerDamageFormula(
  skill: SkillDetailView,
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
  skill: SkillDetailView,
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
function otherDamageFormula(skill: SkillDetailView): DamageFormulaKind {
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
): SkillMechanicsSpec {
  const playerClasses = skill.player_classes; // e.g. ["ranger", "rogue"]
  const mercPets = usedByPets.filter((p) => p.is_mercenary);
  const hasNonMercPet = usedByPets.some(
    (p) => !p.is_mercenary && !p.is_familiar,
  );
  const hasFamiliar = usedByPets.some((p) => p.is_familiar);

  // "other" covers monsters, NPCs, non-merc companion pets, and familiars.
  // None of these have class-specific formula branches in the server scripts.
  const hasOtherCaster = hasMonsters || hasNonMercPet || hasFamiliar;

  const isDamageSkill =
    skill.skill_type === "target_damage" ||
    skill.skill_type === "area_damage" ||
    skill.skill_type === "frontal_damage" ||
    skill.skill_type === "target_projectile" ||
    skill.skill_type === "frontal_projectiles";

  const isHealSkill =
    skill.skill_type === "target_heal" || skill.skill_type === "area_heal";

  const isBuffSkill =
    skill.skill_type === "target_buff" || skill.skill_type === "area_buff";
  // passive has no runtime scaling: PassiveSkill.Apply() is a no-op

  // ---------- damage ----------
  const damagePairs: Array<{ label: string; formula: DamageFormulaKind }> = [];

  if (isDamageSkill) {
    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      damagePairs.push({ label, formula: playerDamageFormula(skill, cls) });
    }
    for (const pet of mercPets) {
      // type_monster is "Ranger", "Rogue", etc. (title-case from DB)
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} mercenary`;
      damagePairs.push({ label, formula: mercDamageFormula(skill, tm) });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster or NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      damagePairs.push({
        label: parts.join(", "),
        formula: otherDamageFormula(skill),
      });
    }
    // Source: TargetDamageSkill.cs — weapon procs fire through the full player damage
    // pipeline at level 1 via weaponItem.procEffect.Apply(player, 1). Enumerate every
    // player class so class-specific formulas (e.g. Poison+Rogue) are handled correctly.
    // Guarded on isWeaponProc only; weapon procs always have player_classes=[] so
    // damagePairs is always empty at this point when isWeaponProc is true.
    if (isWeaponProc) {
      for (const cls of ALL_CLASS_IDS) {
        damagePairs.push({
          label: `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`,
          formula: playerDamageFormula(skill, cls),
        });
      }
    }
  }

  // ---------- heal ----------
  const healPairs: Array<{
    label: string;
    bonusKind: HealBonusKind;
    canCrit: boolean;
  }> = [];

  if (isHealSkill && !skill.is_necromancer_death_bloom) {
    // Source: server-scripts/TargetHealSkill.cs:273-276; AreaHealSkill.cs:109-111 — target healing requires canHealOthers, area healing always rolls for critical healing.
    const canCrit = skill.skill_type === "area_heal" || skill.can_heal_others;

    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      const bonusKind: HealBonusKind =
        cls === "ranger"
          ? "player_ranger" // Source: Wisdom.cs — GetHealBonus(isRanger:true) → WIS×3×0.004
          : "player_other"; // Source: Wisdom.cs — GetHealBonus(isRanger:false) → WIS×0.004
      healPairs.push({ label, bonusKind, canCrit });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} mercenary`;
      // Source: TargetHealSkill.cs — `caster is Pet { isMercenary: not false }` → pet.wisdom.GetHealBonus()
      // GetHealBonus() called without the isRanger flag; no ×3 multiplier even for Ranger merc
      healPairs.push({ label, bonusKind: "merc", canCrit });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster or NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      // Source: TargetHealSkill.cs — else branch → bonus = 0
      healPairs.push({
        label: parts.join(", "),
        bonusKind: "none",
        canCrit,
      });
    }
  }

  // ---------- buff ----------
  const buffPairs: Array<{
    label: string;
    bonusAttrSource: BuffBonusAttrSource;
    isAreaBuff: boolean;
  }> = [];

  const hasBardScaling =
    skill.is_bard_song &&
    skill.scales_with_charisma &&
    hasCharismaScaledEffect(skill);

  if (isBuffSkill && (!skill.is_bard_song || hasBardScaling)) {
    const isAreaBuff = skill.skill_type === "area_buff";

    if (skill.is_relic) {
      // Source: AreaBuffSkill.cs:38-41 — isRelic → caster.level.current * 10.
      // Relic items can be used by any player class regardless of skill.player_classes;
      // a single "Player" context covers all of them. No merc/pet path: relics are
      // player-only equipment usables.
      buffPairs.push({
        label: "Player",
        bonusAttrSource: "player_level",
        isAreaBuff,
      });
    } else {
      for (const cls of playerClasses) {
        const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
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
        buffPairs.push({ label, bonusAttrSource: src, isAreaBuff });
      }
      for (const pet of mercPets) {
        const tm = pet.type_monster ?? "Unknown";
        const label = `${tm} mercenary`;
        // Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute — mercenary buffs select intelligence when scalesWithIntelligence, otherwise wisdom.
        // Source: server-scripts/BardMercenarySkills.cs:RefreshAura — a Bard mercenary's song buff carries the mercenary's Charisma.
        buffPairs.push({
          label,
          bonusAttrSource: hasBardScaling
            ? "merc_cha"
            : skill.scales_with_intelligence
              ? "merc_int"
              : "merc_wis",
          isAreaBuff,
        });
      }
      if (hasOtherCaster && (playerClasses.length > 0 || mercPets.length > 0)) {
        const parts: string[] = [];
        if (hasMonsters) parts.push("Monster or NPC");
        if (hasNonMercPet) parts.push("Companion");
        if (hasFamiliar) parts.push("Familiar");
        // Source: BuffSkill.cs:GetBuffPowerAttribute — final else → 0
        // Only shown when a player or merc also casts the skill; pure monster-only
        // buff skills have bonusAttrSource=none which is uninformative to players.
        buffPairs.push({
          label: parts.join(", "),
          bonusAttrSource: "none",
          isAreaBuff,
        });
      }
    }
  }

  // ---------- timing ----------
  // Populated for follow-up attacks and non-spell combat-pet skill 0.
  // Source: server-scripts/Skills.cs:1141-1159; Combat.cs:339-345 — followupDefaultAttack for a non-spell mercenary subtracts haste * cooldown (haste cap)
  // Source: server-scripts/Player.cs:3394-3431 — GetSkillRefractoryPeriod returns 0.75 seconds for spells and computes weapon delay for other attacks
  // Source: server-scripts/Monster.cs:UpdateServer_CASTING — FinishCastMeleeAttackMonster vs FinishCast for monsters
  const timingPairs: Array<{ label: string; model: TimingModel }> = [];

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
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      // Source: Player.cs:2783 — delay-based refractory applies when !isSpell && hasReqWeapon
      // Source: Player.cs:refractoryPeriodSkill,3084-3087 — isSpell && !hasReqWeapon → flat 0.75s refractory (player_spell)
      // Note: spell auto-attacks have no required_weapon_category in the data, so isSpell alone is the discriminant.
      const model: TimingModel =
        !isSpell && hasReqWeapon
          ? "player_auto"
          : isSpell
            ? "player_spell"
            : "companion";
      timingPairs.push({ label, model });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} mercenary`;
      // Source: Skills.cs:1141-1159 — followupDefaultAttack && !isSpell → cooldown * (1 - haste)
      const model: TimingModel = isSpell ? "merc_spell" : "merc_auto";
      timingPairs.push({ label, model });
    }
    if (hasMonsters) {
      // Source: server-scripts/Monster.cs:2048-2054; Npc.cs:1302-1308 — spells call FinishCast, non-spells FinishCastMeleeAttackMonster.
      const model: TimingModel = isSpell ? "monster_spell" : "monster";
      timingPairs.push({ label: "Monster or NPC", model });
    }
    // Source: server-scripts/Skills.cs:1141-1169 — only non-familiar combat-pet non-spell skillIndex 0 receives haste-reduced cooldown.
    for (const pet of usedByPets.filter((p) => !p.is_mercenary)) {
      timingPairs.push({
        label: pet.is_familiar ? "Familiar" : "Companion",
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
    label: string;
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
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      debuffPairs.push({ label, bonusAttrKind: playerMercKind });
    }
    // Source: TargetDamageSkill.cs:246-276 and ProjectileSkillEffect.cs:143-155 —
    // weapon proc effects call Apply(player/pet, 1). TargetDebuffSkill.cs:273-280
    // then reads the player or mercenary attribute even though proc skills have no
    // player_classes entries of their own.
    if (isWeaponProc) {
      debuffPairs.push({
        label: "Player or mercenary (weapon effect on hit)",
        bonusAttrKind: playerMercKind,
      });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      debuffPairs.push({
        label: `${tm} mercenary`,
        bonusAttrKind: playerMercKind,
      });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster or NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      debuffPairs.push({ label: parts.join(", "), bonusAttrKind: "none" });
    }
  }

  return {
    damageContexts: groupDamage(damagePairs),
    healContexts: groupHeal(healPairs),
    buffContexts: groupBuff(buffPairs),
    timingContexts: groupTiming(timingPairs),
    debuffContexts: groupDebuff(debuffPairs),
  };
}
