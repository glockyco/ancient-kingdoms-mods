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
  // Source: TargetDamageSkill.cs — is_manaburn check precedes everything
  if (skill.is_manaburn_skill) return "manaburn";
  // Source: TargetDamageSkill.cs — isScroll → player.level.current * 15
  if (skill.is_scroll) return "scroll";

  const dt = skill.damage_type;
  const isSpell = skill.is_spell;
  const skillType = skill.skill_type;
  const reqWeapon = skill.required_weapon_category;

  // Ranger projectile checks must precede the elemental check because
  // FrontalProjectilesSkill.cs:97 and TargetProjectileSkill.cs apply combat.damage+DEX
  // regardless of damage_type — if we hit the elemental check first for a Magic-type
  // Ranger frontal (e.g. forest_guardians_aid), we'd return the wrong formula.
  //
  // Source: FrontalProjectilesSkill.cs:97-100 — Ranger check precedes damage type switch
  if (skillType === "frontal_projectiles" && cls === "ranger")
    return "ranged_player_frontal";
  // Source: TargetProjectileSkill.cs:195-200 — Player Ranger + Bow requirement
  if (
    skillType === "target_projectile" &&
    reqWeapon === "Bow" &&
    cls === "ranger"
  )
    return "ranged_player";

  // Source: TargetDamageSkill.cs — Magic + !isSpell + requiredWeaponCategory.StartsWith("Weapon")
  // adds combat.damage on top of combat.magicDamage; must be checked before the broad elemental guard.
  // Rangers additionally subtract the bow slot bonus (line 218-222), same reduction as ranger_melee.
  if (dt === "Magic" && !isSpell && reqWeapon?.startsWith("Weapon"))
    return cls === "ranger" ? "magic_weapon_ranger" : "magic_weapon";

  // Source: TargetDamageSkill.cs switch(damageType) — Magic/Fire/Cold/Disease always use
  // combat.magicDamage regardless of isSpell. The && isSpell guard was incorrect.
  if (dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease")
    return "magic_spell";

  // Source: TargetDamageSkill.cs:184-199 — Poison dispatch
  if (dt === "Poison" && cls === "rogue") return "poison_rogue";
  if (dt === "Poison") return "magic_spell";

  // Source: TargetDamageSkill.cs:218-221, FrontalDamageSkill.cs:88-92
  // Ranger subtracts bow slot bonus from combat.damage (Normal type only)
  if (
    (skillType === "target_damage" || skillType === "frontal_damage") &&
    dt === "Normal" &&
    cls === "ranger"
  )
    return "ranger_melee";

  // Source: TargetDamageSkill.cs:223-226 — Rogue subtracts ceil(off-hand × 0.5)
  if (
    (skillType === "target_damage" || skillType === "frontal_damage") &&
    dt === "Normal" &&
    cls === "rogue"
  )
    return "rogue_melee";

  // Default: combat.damage (STR×1.0 + all equipment)
  return "normal";
}

/**
 * Resolve the damage formula for a mercenary pet by type_monster.
 * Source: server-scripts/TargetDamageSkill.cs (Rogue merc Poison path),
 *         server-scripts/TargetProjectileSkill.cs (Ranger merc ranged path),
 *         server-scripts/FrontalProjectilesSkill.cs (Ranger merc frontal path)
 */
function mercDamageFormula(
  skill: SkillDetailView,
  typeMonster: string,
): DamageFormulaKind {
  // Source: TargetDamageSkill.cs — is_manaburn check precedes everything
  if (skill.is_manaburn_skill) return "manaburn";

  const dt = skill.damage_type;
  const isSpell = skill.is_spell;
  const skillType = skill.skill_type;
  const reqWeapon = skill.required_weapon_category;

  // FrontalProjectilesSkill.cs:97 only checks `caster is Player { className: "Ranger" }` —
  // a merc Pet is not a Player, so merc Ranger frontal falls to the else branch: combat.damage only.
  // No Ranger merc has frontal_projectiles skills today, but the dispatch must be correct.
  // Source: TargetProjectileSkill.cs — `caster is Pet { isMercenary: not false, typeMonster: "Ranger" }`
  // combat.damage + pet2.dexterity.GetRangedAttackBonusPerPoint() (DEX×1.5)
  if (skillType === "target_projectile" && typeMonster === "Ranger")
    return "ranged_merc";

  // Source: TargetDamageSkill.cs — Magic + !isSpell + requiredWeaponCategory.StartsWith("Weapon")
  if (dt === "Magic" && !isSpell && reqWeapon?.startsWith("Weapon"))
    return "magic_weapon";

  // Source: TargetDamageSkill.cs switch(damageType) — all elemental types always use
  // combat.magicDamage regardless of isSpell.
  if (dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease")
    return "magic_spell";

  // Source: TargetDamageSkill.cs — `caster is Pet { isMercenary: not false, typeMonster: "Rogue" }`
  if (dt === "Poison" && typeMonster === "Rogue") return "poison_rogue";
  if (dt === "Poison") return "magic_spell";

  // Source: TargetDamageSkill.cs:223-226 — the `caster is Player { className: "Rogue" }` guard
  // does NOT apply to Pet/merc casters. Rogue mercs dual-wield daggers; both contribute
  // at full damage (no 0.5× off-hand penalty).
  if (
    (skillType === "target_damage" || skillType === "frontal_damage") &&
    dt === "Normal" &&
    typeMonster === "Rogue"
  )
    return "rogue_melee_merc";

  // Default: combat.damage (STR×1.0 + all equipment)
  return "normal";
}

/**
 * Resolve the damage formula for a monster, NPC, or non-merc pet.
 * Source: TargetDamageSkill.cs switch(damageType) — no class-specific branches.
 * Monsters use level-scaled base values; no STR/INT/equipment contributions.
 */
function otherDamageFormula(skill: SkillDetailView): DamageFormulaKind {
  const dt = skill.damage_type;
  const isSpell = skill.is_spell;

  if (
    (dt === "Magic" || dt === "Fire" || dt === "Cold" || dt === "Disease") &&
    isSpell
  )
    return "monster_magic";
  return "monster_melee";
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
 *   Weapon proc damage skills have player_classes=[] but fire through the full player
 *   pipeline via weaponItem.procEffect.Apply(player, 1). Enumerates all 6 classes to
 *   capture class-specific formula differences (e.g. Poison + Rogue).
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
      const label = `${tm} Merc`;
      damagePairs.push({ label, formula: mercDamageFormula(skill, tm) });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster/NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      damagePairs.push({
        label: parts.join("/"),
        formula: otherDamageFormula(skill),
      });
    }
    // Source: TargetDamageSkill.cs — weapon procs fire through the full player damage
    // pipeline at level 1 via weaponItem.procEffect.Apply(player, 1). Enumerate all 6
    // player classes so class-specific formulas (e.g. Poison+Rogue) are handled correctly.
    // Guarded on isWeaponProc only; weapon procs always have player_classes=[] so
    // damagePairs is always empty at this point when isWeaponProc is true.
    if (isWeaponProc) {
      const allClasses = [
        "warrior",
        "rogue",
        "ranger",
        "wizard",
        "druid",
        "cleric",
      ];
      const formulaMap = new Map<DamageFormulaKind, string[]>();
      for (const cls of allClasses) {
        const f = playerDamageFormula(skill, cls);
        const group = formulaMap.get(f) ?? [];
        group.push(cls);
        formulaMap.set(f, group);
      }
      for (const [formula, classes] of formulaMap) {
        // All 6 classes on the same formula → one clean label.
        const label =
          classes.length === allClasses.length
            ? "Player (weapon proc)"
            : classes
                .map(
                  (c) => `${c.charAt(0).toUpperCase() + c.slice(1)} (player)`,
                )
                .join("/");
        damagePairs.push({ label, formula });
      }
    }
    // Scroll damage skills (is_scroll=1) often have player_classes=[] since scrolls
    // can be used by anyone. If no caster context was generated, add a fallback so the
    // template can render the scroll formula (Damage = PlayerLevel × 15).
    if (skill.is_scroll && damagePairs.length === 0) {
      damagePairs.push({ label: "Scroll", formula: "scroll" });
    }
  }

  // ---------- heal ----------
  const healPairs: Array<{
    label: string;
    bonusKind: HealBonusKind;
    canCrit: boolean;
  }> = [];

  if (isHealSkill) {
    // Source: TargetHealSkill.cs — canCrit gate uses can_heal_others flag
    const canCrit = skill.can_heal_others;

    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      // Source: TargetHealSkill.cs — isScroll → player.level.current * 8 replaces WIS bonus
      const bonusKind: HealBonusKind = skill.is_scroll
        ? "scroll"
        : cls === "ranger"
          ? "player_ranger" // Source: Wisdom.cs — GetHealBonus(isRanger:true) → WIS×3×0.004
          : "player_other"; // Source: Wisdom.cs — GetHealBonus(isRanger:false) → WIS×0.004
      healPairs.push({ label, bonusKind, canCrit });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} Merc`;
      // Source: TargetHealSkill.cs — `caster is Pet { isMercenary: not false }` → pet.wisdom.GetHealBonus()
      // GetHealBonus() called without the isRanger flag; no ×3 multiplier even for Ranger merc
      healPairs.push({ label, bonusKind: "merc", canCrit });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster/NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      // Source: TargetHealSkill.cs — else branch → bonus = 0
      healPairs.push({
        label: parts.join("/"),
        bonusKind: "none",
        canCrit: false,
      });
    }
    // Scroll heal skills (is_scroll=1) often have player_classes=[] since scrolls are
    // class-agnostic. If no caster context was generated, add a fallback so the template
    // can render the scroll formula (Final Heal = Base Heal + PlayerLevel x 8).
    if (skill.is_scroll && healPairs.length === 0) {
      healPairs.push({ label: "Scroll", bonusKind: "scroll", canCrit: false });
    }
  }

  // ---------- buff ----------
  const buffPairs: Array<{
    label: string;
    bonusAttrSource: BuffBonusAttrSource;
    isAreaBuff: boolean;
  }> = [];

  if (isBuffSkill) {
    const isAreaBuff = skill.skill_type === "area_buff";

    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      let src: BuffBonusAttrSource;
      if (skill.is_scroll) {
        // Source: TargetBuffSkill.cs:425-428, AreaBuffSkill.cs:27-29 — isScroll → PlayerLevel * 8
        src = "player_level";
      } else if (isAreaBuff && skill.is_mercenary_skill) {
        // Source: AreaBuffSkill.cs:43-47 — isMercenarySkill overrides num2 = player4.charisma.value
        src = "player_charisma";
      } else if (isAreaBuff) {
        // Source: AreaBuffSkill.cs:25 — plain player.wisdom.value; NO Ranger×3 for area buffs
        src = "player_wis";
      } else if (cls === "ranger") {
        // Source: TargetBuffSkill.cs:419 — player8.className=="Ranger" → wisdom.value * 3
        src = "player_ranger_wis";
      } else {
        // Source: TargetBuffSkill.cs:419 — else → wisdom.value
        src = "player_wis";
      }
      buffPairs.push({ label, bonusAttrSource: src, isAreaBuff });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} Merc`;
      // Source: TargetBuffSkill.cs:419 — `caster is Pet { isMercenary: not false }` → pet3.wisdom.value
      // Source: AreaBuffSkill.cs:25 — same merc branch, no Ranger×3
      buffPairs.push({ label, bonusAttrSource: "merc_wis", isAreaBuff });
    }
    if (hasOtherCaster && (playerClasses.length > 0 || mercPets.length > 0)) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster/NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      // Source: TargetBuffSkill.cs:419 — final else → 0
      // Only shown when a player or merc also casts the skill; pure monster-only
      // buff skills have bonusAttrSource=none which is uninformative to players.
      buffPairs.push({
        label: parts.join("/"),
        bonusAttrSource: "none",
        isAreaBuff,
      });
    }
    // Scroll buff skills (is_scroll=1) often have player_classes=[] since scrolls are
    // class-agnostic. If no caster context was generated, add a fallback so the template
    // can render the scroll formula (bonusAttribute = PlayerLevel × 8).
    // Mirrors the same fallback in the damage and heal sections.
    if (skill.is_scroll && buffPairs.length === 0) {
      buffPairs.push({
        label: "Scroll",
        bonusAttrSource: "player_level",
        isAreaBuff,
      });
    }
  }

  // ---------- timing ----------
  // Only populated when followup_default_attack=true.
  // Source: server-scripts/Skills.cs:762-773 — followupDefaultAttack + !isSpell + isMercenary → cooldown×(1-haste)
  // Source: server-scripts/Player.cs:2783 — refractory period for players with a weapon requirement
  // Source: server-scripts/Monster.cs:1625 — FinishCastMeleeAttackMonster vs FinishCast for monsters
  const timingPairs: Array<{ label: string; model: TimingModel }> = [];

  if (skill.followup_default_attack) {
    const isSpell = skill.is_spell;
    const hasReqWeapon = Boolean(skill.required_weapon_category);

    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      // Source: Player.cs:2783 — refractory applies when !isSpell && followupDefaultAttack && requiredWeaponCategory set
      const model: TimingModel =
        !isSpell && hasReqWeapon ? "player_auto" : "player_skill";
      timingPairs.push({ label, model });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      const label = `${tm} Merc`;
      // Source: Skills.cs:762-768 — followupDefaultAttack && !isSpell → cooldown * (1 - haste)
      const model: TimingModel = isSpell ? "merc_skill" : "merc_auto";
      timingPairs.push({ label, model });
    }
    if (hasMonsters) {
      // Source: Monster.cs:1625, Npc.cs:1266 — both call FinishCastMeleeAttackMonster
      // unconditionally regardless of isSpell, so spells and non-spells have the same
      // haste-reduced cooldown behaviour. A single model covers both.
      const model: TimingModel = "monster";
      timingPairs.push({ label: "Monster/NPC", model });
    }
    // Non-merc companion pets and familiars use FinishCast (flat cooldown) — same shape as player_skill
    if (hasNonMercPet || hasFamiliar) {
      const parts: string[] = [];
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      timingPairs.push({ label: parts.join("/"), model: "player_skill" });
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
    (hasNonZeroField(skill.healing_per_second_bonus) ||
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
    const playerMercKind: DebuffBonusAttrKind = skill.is_scroll
      ? "scroll"
      : skill.is_melee_debuff
        ? "str"
        : skill.is_poison_debuff || skill.is_disease_debuff
          ? "dex"
          : "int";

    for (const cls of playerClasses) {
      const label = `${cls.charAt(0).toUpperCase() + cls.slice(1)} (player)`;
      debuffPairs.push({ label, bonusAttrKind: playerMercKind });
    }
    for (const pet of mercPets) {
      const tm = pet.type_monster ?? "Unknown";
      debuffPairs.push({ label: `${tm} Merc`, bonusAttrKind: playerMercKind });
    }
    if (hasOtherCaster) {
      const parts: string[] = [];
      if (hasMonsters) parts.push("Monster/NPC");
      if (hasNonMercPet) parts.push("Companion");
      if (hasFamiliar) parts.push("Familiar");
      debuffPairs.push({ label: parts.join("/"), bonusAttrKind: "none" });
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
