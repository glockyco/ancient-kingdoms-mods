import type { LinearValue } from "$lib/types/skills";

/**
 * Monster context for damage calculation
 */
export interface MonsterContext {
  damage: number;
  magicDamage: number;
}

/**
 * Base skill interface with all fields that formatSkillEffect needs to handle
 */
export interface Skill {
  id?: string;
  skill_type: string;
  damage_type: string | null;
  max_level?: number;

  // Damage fields
  damage: string | LinearValue | null;
  damage_percent: string | LinearValue | null;
  lifetap_percent: string | LinearValue | number | null;
  knockback_chance: string | LinearValue | number | null;
  stun_chance: string | LinearValue | number | null;
  stun_time: string | LinearValue | number | null;
  fear_chance: string | LinearValue | number | null;
  fear_time: string | LinearValue | number | null;
  aggro?: string | LinearValue | null;
  is_assassination_skill?: boolean;
  is_manaburn_skill?: boolean;
  break_armor_prob?: number;

  // Healing fields
  heals_health: string | LinearValue | null;
  heals_mana?: string | LinearValue | null;
  is_resurrect_skill?: boolean;
  is_balance_health?: boolean;

  // Buff/debuff stat fields (38 BonusSkill fields)
  health_max_bonus?: string | LinearValue | null;
  health_max_percent_bonus?: string | LinearValue | null;
  mana_max_bonus?: string | LinearValue | null;
  mana_max_percent_bonus?: string | LinearValue | null;
  energy_max_bonus?: string | LinearValue | null;
  defense_bonus: string | LinearValue | null;
  ward_bonus?: string | LinearValue | null;
  magic_resist_bonus: string | LinearValue | null;
  poison_resist_bonus: string | LinearValue | null;
  fire_resist_bonus: string | LinearValue | null;
  cold_resist_bonus: string | LinearValue | null;
  disease_resist_bonus: string | LinearValue | null;
  damage_bonus: string | LinearValue | null;
  damage_percent_bonus: string | LinearValue | null;
  magic_damage_bonus: string | LinearValue | null;
  magic_damage_percent_bonus?: string | LinearValue | null;
  haste_bonus: string | LinearValue | null;
  spell_haste_bonus?: string | LinearValue | null;
  speed_bonus: string | LinearValue | null;
  critical_chance_bonus: string | LinearValue | null;
  accuracy_bonus: string | LinearValue | null;
  block_chance_bonus: string | LinearValue | null;
  fear_resist_chance_bonus?: string | LinearValue | null;
  damage_shield: string | LinearValue | null;
  cooldown_reduction_percent?: string | LinearValue | null;
  heal_on_hit_percent?: string | LinearValue | null;
  healing_per_second_bonus: string | LinearValue | null;
  health_percent_per_second_bonus: string | LinearValue | null;
  mana_per_second_bonus: string | LinearValue | null;
  mana_percent_per_second_bonus: string | LinearValue | null;
  energy_per_second_bonus?: string | LinearValue | null;
  energy_percent_per_second_bonus?: string | LinearValue | null;
  strength_bonus?: string | LinearValue | null;
  intelligence_bonus?: string | LinearValue | null;
  dexterity_bonus?: string | LinearValue | null;
  charisma_bonus?: string | LinearValue | null;
  wisdom_bonus?: string | LinearValue | null;
  constitution_bonus?: string | LinearValue | null;

  // Buff duration
  duration_base: number;

  // Special flags
  is_invisibility?: boolean;
  is_mana_shield?: boolean;
  is_cleanse?: boolean;
  is_dispel?: boolean;
  is_blindness?: boolean;
  is_enrage?: boolean;

  // Summon fields
  summoned_monster_id?: string | null;
  summoned_monster_name?: string | null;
  summoned_monster_level?: number | null;
  summon_count_per_cast?: number | null;
  max_active_summons?: number | null;
  pet_name?: string | null;
  is_familiar?: boolean;

  // AoE properties
  affects_random_target?: boolean;
  area_object_size?: number;
  area_objects_to_spawn?: number;

  // Debuff type flags
  is_poison_debuff?: boolean;
  is_fire_debuff?: boolean;
  is_cold_debuff?: boolean;
  is_disease_debuff?: boolean;
  is_melee_debuff?: boolean;
  is_magic_debuff?: boolean;

  // Cleanse resistance
  prob_ignore_cleanse?: number;
}

/**
 * Parse LinearValue JSON or return direct numeric value
 */
function parseLinearValue(
  field: string | LinearValue | number | null | undefined,
): LinearValue | null {
  if (field === null || field === undefined) return null;

  // Already a LinearValue object
  if (typeof field === "object" && "base_value" in field) {
    if (field.base_value === 0 && field.bonus_per_level === 0) return null;
    return field;
  }

  // Numeric value - convert to LinearValue with 0 scaling
  if (typeof field === "number") {
    if (field === 0) return null;
    return { base_value: field, bonus_per_level: 0 };
  }

  // JSON string
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field) as LinearValue;
      if (parsed.base_value === 0 && parsed.bonus_per_level === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Format LinearValue for display
 * Monster context: show computed value at fixed level
 * Player context: show "base (+X/lvl)" scaling notation
 */
function formatLinearValue(
  lv: LinearValue,
  monsterContext: MonsterContext | undefined,
  skillLevel: number = 1,
): string {
  // Monster context: compute at fixed skill level
  if (monsterContext) {
    const value = lv.base_value + lv.bonus_per_level * (skillLevel - 1);
    return value.toLocaleString();
  }

  // Player context: show scaling notation
  if (lv.bonus_per_level === 0) {
    return lv.base_value.toLocaleString();
  }

  const sign = lv.bonus_per_level > 0 ? "+" : "";
  return `${lv.base_value.toLocaleString()} (${sign}${lv.bonus_per_level.toLocaleString()}/lvl)`;
}

/**
 * Format percentage (0.15 → "15%", 0.002 → "0.2%")
 * Uses one decimal place for sub-1% values to avoid rounding to zero.
 */
function formatPercent(value: number): string {
  const pct = value * 100;
  if (Math.abs(pct) < 1 && pct !== 0) {
    return `${parseFloat(pct.toFixed(1))}%`;
  }
  return `${Math.round(pct)}%`;
}

/**
 * Format LinearValue as percentage with optional scaling
 */
function formatLinearPercent(
  lv: LinearValue,
  monsterContext: MonsterContext | undefined,
  skillLevel: number = 1,
): string {
  if (monsterContext) {
    const value = lv.base_value + lv.bonus_per_level * (skillLevel - 1);
    return formatPercent(value);
  }

  if (lv.bonus_per_level === 0) {
    return formatPercent(lv.base_value);
  }

  const sign = lv.bonus_per_level > 0 ? "+" : "";
  return `${formatPercent(lv.base_value)} (${sign}${formatPercent(lv.bonus_per_level)}/lvl)`;
}

/**
 * Format damage effects
 */
function formatDamage(
  skill: Skill,
  monsterContext: MonsterContext | undefined,
): string[] {
  const parts: string[] = [];

  const skillDmg = parseLinearValue(skill.damage);
  const damagePercent = parseLinearValue(skill.damage_percent);

  if (!skillDmg && !damagePercent) return parts;

  // Calculate total damage
  let totalDmg = 0;

  // Monster context: add combat stat to skill damage
  if (monsterContext) {
    const combatStat =
      skill.damage_type === "Magic" ||
      skill.damage_type === "Fire" ||
      skill.damage_type === "Cold" ||
      skill.damage_type === "Disease"
        ? monsterContext.magicDamage
        : monsterContext.damage;

    totalDmg = combatStat + (skillDmg?.base_value ?? 0);

    // Apply damage_percent multiplier
    if (damagePercent) {
      totalDmg = Math.round(totalDmg * damagePercent.base_value);
    }

    const typeLabel =
      skill.damage_type && skill.damage_type !== "Normal"
        ? ` ${skill.damage_type.toLowerCase()}`
        : "";
    parts.push(`${totalDmg.toLocaleString()}${typeLabel} dmg`);
  }
  // Player context: show base damage with scaling
  else {
    if (skillDmg) {
      const dmgStr = formatLinearValue(skillDmg, undefined);
      const typeLabel =
        skill.damage_type && skill.damage_type !== "Normal"
          ? ` ${skill.damage_type.toLowerCase()}`
          : "";
      parts.push(`${dmgStr}${typeLabel} dmg`);
    }

    // Damage percent (rare case: damage_percent without base damage)
    if (damagePercent && damagePercent.base_value > 0) {
      parts.push(`${formatLinearPercent(damagePercent, undefined)} weapon dmg`);
    }
  }

  return parts;
}

/**
 * Format healing effects
 */
function formatHealing(
  skill: Skill,
  monsterContext: MonsterContext | undefined,
): string[] {
  const parts: string[] = [];

  const heal = parseLinearValue(skill.heals_health);
  if (heal) {
    parts.push(`${formatLinearValue(heal, monsterContext)} hp`);
  }

  const healMana = parseLinearValue(skill.heals_mana);
  if (healMana) {
    parts.push(`${formatLinearValue(healMana, monsterContext)} mana`);
  }

  // Source: server-scripts/Player.cs:10008-10014 — CmdResurrect
  // health = health.max * 0.6, mana = health.max * 0.2, xp = +75% of lossExp
  if (skill.is_resurrect_skill) {
    parts.push("resurrect (60% max HP, 20% max HP as mana, +75% lost XP)");
  }

  if (skill.is_balance_health) {
    parts.push("balance hp");
  }

  return parts;
}

/**
 * Format crowd control effects
 */
function formatCrowdControl(
  skill: Skill,
  monsterContext: MonsterContext | undefined,
): string[] {
  const parts: string[] = [];

  const lifetap = parseLinearValue(skill.lifetap_percent);
  if (lifetap) {
    parts.push(`${formatLinearPercent(lifetap, monsterContext)} lifetap`);
  }

  if (skill.break_armor_prob && skill.break_armor_prob > 0) {
    parts.push(`${formatPercent(skill.break_armor_prob)} break armor`);
  }

  const stun = parseLinearValue(skill.stun_chance);
  if (stun) {
    const stunDur = parseLinearValue(skill.stun_time);
    const durSuffix =
      stunDur && stunDur.base_value > 0 ? ` (${stunDur.base_value}s)` : "";
    parts.push(`${formatLinearPercent(stun, monsterContext)} stun${durSuffix}`);
  }

  const fear = parseLinearValue(skill.fear_chance);
  if (fear) {
    const fearDur = parseLinearValue(skill.fear_time);
    const durSuffix =
      fearDur && fearDur.base_value > 0 ? ` (${fearDur.base_value}s)` : "";
    parts.push(`${formatLinearPercent(fear, monsterContext)} fear${durSuffix}`);
  }

  const knockback = parseLinearValue(skill.knockback_chance);
  if (knockback) {
    parts.push(`${formatLinearPercent(knockback, monsterContext)} knockback`);
  }

  // AoE properties
  if (skill.affects_random_target) {
    parts.push("random target");
  }

  if (skill.area_objects_to_spawn && skill.area_objects_to_spawn > 0) {
    const sizeInfo = skill.area_object_size
      ? `, size ${skill.area_object_size}`
      : "";
    parts.push(`${skill.area_objects_to_spawn} zones${sizeInfo}`);
  }

  const aggro = parseLinearValue(skill.aggro);
  if (aggro && aggro.base_value !== 0) {
    parts.push(
      `${aggro.base_value > 0 ? "+" : ""}${formatLinearValue(aggro, monsterContext)} aggro`,
    );
  }

  return parts;
}

/**
 * Format summon/teleport effects
 */
function formatSummons(skill: Skill): string[] {
  const parts: string[] = [];

  // Teleport (summon_count_per_cast == 0)
  if (
    skill.skill_type === "summon_monsters" &&
    skill.summon_count_per_cast === 0
  ) {
    parts.push("teleports target to self, stun (2s)");
    return parts;
  }

  // Regular summon
  if (skill.summoned_monster_id || skill.pet_name) {
    const name =
      skill.summoned_monster_name ||
      skill.pet_name ||
      skill.summoned_monster_id ||
      "pet";
    const count =
      skill.summon_count_per_cast && skill.summon_count_per_cast > 1
        ? `${skill.summon_count_per_cast}x `
        : "";

    const details: string[] = [];
    if (
      skill.summoned_monster_level !== null &&
      skill.summoned_monster_level !== undefined
    ) {
      details.push(`lv${skill.summoned_monster_level}`);
    }
    if (
      skill.max_active_summons !== null &&
      skill.max_active_summons !== undefined
    ) {
      details.push(`max ${skill.max_active_summons}`);
    }
    const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
    parts.push(`summons ${count}${name}${suffix}`);
  }

  return parts;
}

/**
 * Format buff/debuff stat effects
 */
function formatBuffDebuffStats(
  skill: Skill,
  monsterContext: MonsterContext | undefined,
): string[] {
  const parts: string[] = [];

  // High priority special effects
  if (skill.is_dispel) parts.push("dispels buffs");
  // Source: server-scripts/TargetBuffSkill.cs:284 — cleanse matches on the skill's own debuff type flags
  if (skill.is_cleanse) {
    const all =
      skill.is_poison_debuff &&
      skill.is_disease_debuff &&
      skill.is_fire_debuff &&
      skill.is_cold_debuff &&
      skill.is_magic_debuff;
    if (all) {
      parts.push("cleanses all debuffs");
    } else {
      const types: string[] = [];
      if (skill.is_poison_debuff) types.push("poison");
      if (skill.is_disease_debuff) types.push("disease");
      if (skill.is_fire_debuff) types.push("fire");
      if (skill.is_cold_debuff) types.push("cold");
      if (skill.is_magic_debuff) types.push("magic");
      parts.push(`cleanses ${types.join(" & ")} debuffs`);
    }
  }
  if (skill.is_blindness) parts.push("blinds");
  if (skill.is_invisibility) parts.push("grants invis");
  if (skill.is_mana_shield) parts.push("mana shield");

  // Root/slow — server threshold for full root (immobilized) is speed <= -50
  // Source: server-scripts/Monster.cs, Pet.cs, Npc.cs — speed <= -50f branch
  const speedBonus = parseLinearValue(skill.speed_bonus);
  if (speedBonus) {
    if (speedBonus.base_value <= -50) {
      parts.push("root");
    } else if (speedBonus.base_value !== 0) {
      const sign = speedBonus.base_value > 0 ? "+" : "";
      parts.push(
        `${sign}${formatLinearValue(speedBonus, monsterContext)} speed`,
      );
    }
  }

  // Resource pools
  const healthMaxBonus = parseLinearValue(skill.health_max_bonus);
  if (healthMaxBonus) {
    const sign = healthMaxBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearValue(healthMaxBonus, monsterContext)} max hp`,
    );
  }

  const healthMaxPctBonus = parseLinearValue(skill.health_max_percent_bonus);
  if (healthMaxPctBonus) {
    const sign = healthMaxPctBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(healthMaxPctBonus, monsterContext)} max hp`,
    );
  }

  const manaMaxBonus = parseLinearValue(skill.mana_max_bonus);
  if (manaMaxBonus) {
    const sign = manaMaxBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearValue(manaMaxBonus, monsterContext)} max mana`,
    );
  }

  const manaMaxPctBonus = parseLinearValue(skill.mana_max_percent_bonus);
  if (manaMaxPctBonus) {
    const sign = manaMaxPctBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(manaMaxPctBonus, monsterContext)} max mana`,
    );
  }

  const energyMaxBonus = parseLinearValue(skill.energy_max_bonus);
  if (energyMaxBonus) {
    const sign = energyMaxBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearValue(energyMaxBonus, monsterContext)} max energy`,
    );
  }

  // Combat stats
  const damageBonus = parseLinearValue(skill.damage_bonus);
  if (damageBonus && damageBonus.base_value !== 0) {
    const sign = damageBonus.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearValue(damageBonus, monsterContext)} dmg`);
  }

  const damagePctBonus = parseLinearValue(skill.damage_percent_bonus);
  if (damagePctBonus && damagePctBonus.base_value !== 0) {
    const sign = damagePctBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(damagePctBonus, monsterContext)} dmg`,
    );
  }

  const magicDmgBonus = parseLinearValue(skill.magic_damage_bonus);
  if (magicDmgBonus && magicDmgBonus.base_value !== 0) {
    const sign = magicDmgBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearValue(magicDmgBonus, monsterContext)} spell power`,
    );
  }

  const magicDmgPctBonus = parseLinearValue(skill.magic_damage_percent_bonus);
  if (magicDmgPctBonus && magicDmgPctBonus.base_value !== 0) {
    const sign = magicDmgPctBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(magicDmgPctBonus, monsterContext)} spell power`,
    );
  }

  const defenseBonus = parseLinearValue(skill.defense_bonus);
  if (defenseBonus && defenseBonus.base_value !== 0) {
    const sign = defenseBonus.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearValue(defenseBonus, monsterContext)} def`);
  }

  const wardBonus = parseLinearValue(skill.ward_bonus);
  if (wardBonus && wardBonus.base_value !== 0) {
    const sign = wardBonus.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearValue(wardBonus, monsterContext)} ward`);
  }

  // Attack speed and CDR
  const hasteBonus = parseLinearValue(skill.haste_bonus);
  if (hasteBonus && hasteBonus.base_value !== 0) {
    const sign = hasteBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(hasteBonus, monsterContext)} haste`,
    );
  }

  const spellHasteBonus = parseLinearValue(skill.spell_haste_bonus);
  if (spellHasteBonus && spellHasteBonus.base_value !== 0) {
    const sign = spellHasteBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(spellHasteBonus, monsterContext)} spell haste`,
    );
  }

  const cdrBonus = parseLinearValue(skill.cooldown_reduction_percent);
  if (cdrBonus && cdrBonus.base_value !== 0) {
    const sign = cdrBonus.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearPercent(cdrBonus, monsterContext)} CDR`);
  }

  // Crit / Block / Accuracy
  const critBonus = parseLinearValue(skill.critical_chance_bonus);
  if (critBonus && critBonus.base_value !== 0) {
    const sign = critBonus.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearPercent(critBonus, monsterContext)} crit`);
  }

  const blockBonus = parseLinearValue(skill.block_chance_bonus);
  if (blockBonus && blockBonus.base_value !== 0) {
    const sign = blockBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(blockBonus, monsterContext)} block`,
    );
  }

  const accBonus = parseLinearValue(skill.accuracy_bonus);
  if (accBonus && accBonus.base_value !== 0) {
    const sign = accBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(accBonus, monsterContext)} accuracy`,
    );
  }

  const fearResistBonus = parseLinearValue(skill.fear_resist_chance_bonus);
  if (fearResistBonus && fearResistBonus.base_value !== 0) {
    const sign = fearResistBonus.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(fearResistBonus, monsterContext)} fear resist`,
    );
  }

  // Resistances
  const resistFields: [string | LinearValue | null | undefined, string][] = [
    [skill.magic_resist_bonus, "magic res"],
    [skill.poison_resist_bonus, "poison res"],
    [skill.fire_resist_bonus, "fire res"],
    [skill.cold_resist_bonus, "cold res"],
    [skill.disease_resist_bonus, "disease res"],
  ];

  for (const [field, label] of resistFields) {
    const val = parseLinearValue(field);
    if (val && val.base_value !== 0) {
      const sign = val.base_value > 0 ? "+" : "";
      parts.push(`${sign}${formatLinearValue(val, monsterContext)} ${label}`);
    }
  }

  // Regen / DoT
  const hps = parseLinearValue(skill.healing_per_second_bonus);
  if (hps && hps.base_value !== 0) {
    if (hps.base_value > 0) {
      parts.push(`${formatLinearValue(hps, monsterContext)} hp/s`);
    } else {
      parts.push(
        `${formatLinearValue({ base_value: Math.abs(hps.base_value), bonus_per_level: Math.abs(hps.bonus_per_level) }, monsterContext)} dmg/s`,
      );
    }
  }

  const hpPct = parseLinearValue(skill.health_percent_per_second_bonus);
  if (hpPct && hpPct.base_value !== 0) {
    const sign = hpPct.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearPercent(hpPct, monsterContext)} hp/s`);
  }

  const mps = parseLinearValue(skill.mana_per_second_bonus);
  if (mps && mps.base_value !== 0) {
    if (mps.base_value > 0) {
      parts.push(`${formatLinearValue(mps, monsterContext)} mana/s`);
    } else {
      parts.push(
        `${formatLinearValue({ base_value: Math.abs(mps.base_value), bonus_per_level: Math.abs(mps.bonus_per_level) }, monsterContext)} mana drain/s`,
      );
    }
  }

  const manaPct = parseLinearValue(skill.mana_percent_per_second_bonus);
  if (manaPct && manaPct.base_value !== 0) {
    const sign = manaPct.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearPercent(manaPct, monsterContext)} mana/s`);
  }

  const eps = parseLinearValue(skill.energy_per_second_bonus);
  if (eps && eps.base_value !== 0) {
    const sign = eps.base_value > 0 ? "+" : "";
    parts.push(`${sign}${formatLinearValue(eps, monsterContext)} energy/s`);
  }

  const energyPct = parseLinearValue(skill.energy_percent_per_second_bonus);
  if (energyPct && energyPct.base_value !== 0) {
    const sign = energyPct.base_value > 0 ? "+" : "";
    parts.push(
      `${sign}${formatLinearPercent(energyPct, monsterContext)} energy/s`,
    );
  }

  // Damage shield / heal on hit
  const dmgShield = parseLinearValue(skill.damage_shield);
  if (dmgShield && dmgShield.base_value > 0) {
    parts.push(`${formatLinearValue(dmgShield, monsterContext)} dmg shield`);
  }

  const healOnHit = parseLinearValue(skill.heal_on_hit_percent);
  if (healOnHit && healOnHit.base_value > 0) {
    parts.push(`${formatLinearPercent(healOnHit, monsterContext)} heal on hit`);
  }

  // Primary stats
  const statFields: [string | LinearValue | null | undefined, string][] = [
    [skill.strength_bonus, "str"],
    [skill.intelligence_bonus, "int"],
    [skill.dexterity_bonus, "dex"],
    [skill.constitution_bonus, "con"],
    [skill.wisdom_bonus, "wis"],
    [skill.charisma_bonus, "cha"],
  ];

  for (const [field, label] of statFields) {
    const val = parseLinearValue(field);
    if (val && val.base_value !== 0) {
      const sign = val.base_value > 0 ? "+" : "";
      parts.push(`${sign}${formatLinearValue(val, monsterContext)} ${label}`);
    }
  }

  // Debuff type tags (if no specific stats shown and is a debuff)
  if (
    parts.length === 0 &&
    (skill.skill_type === "area_debuff" || skill.skill_type === "target_debuff")
  ) {
    if (skill.is_poison_debuff) parts.push("poison DoT");
    else if (skill.is_fire_debuff) parts.push("fire DoT");
    else if (skill.is_cold_debuff) parts.push("cold DoT");
    else if (skill.is_disease_debuff) parts.push("disease DoT");
    else if (skill.is_melee_debuff) parts.push("melee debuff");
    else if (skill.is_magic_debuff) parts.push("magic debuff");
  }

  // Cleanse resistance
  if (skill.prob_ignore_cleanse && skill.prob_ignore_cleanse > 0) {
    parts.push(`${formatPercent(skill.prob_ignore_cleanse)} cleanse resist`);
  }

  return parts;
}

/**
 * Format a skill's effect as a concise summary string
 *
 * @param skill - Skill data to format
 * @param monsterContext - Optional monster combat stats for damage calculation
 * @returns Formatted skill effect string (empty if no effects)
 *
 * Category order: Damage > Healing > CC > Summons > Buffs/Debuffs
 */
const HARDCODED_EFFECTS: Record<string, string> = {
  improved_backstab: "+25% combat advantage dmg",
  bind_affinity: "set custom respawn & portal scroll destination",
  binding: "set custom respawn & portal scroll destination",
  elixir_endurance: "+60s potion buff duration/lvl",
  veteran_awareness: "reveals nearby monsters on minimap",
  parry: "negate & counter melee attack",
  symbiosis: "pet inherits +10% of your attributes/lvl (max 50%)",
  summon_player: "teleport target to caster, stun (2s)",
  disarm_trap: "detect and disarm traps",
  alchemy: "craft potions and elixirs",
  baking: "craft food and consumables",
  crafting: "craft equipment and items",
  digging: "dig for buried treasure",
  gathering: "gather herbs and reagents",
  mining: "mine ore and minerals",
  opening: "open locked chests",
  blushburst: "cosmetic visual effect",
  emerald_pop: "cosmetic visual effect",
  golden_whirl: "cosmetic visual effect",
  skyflare: "cosmetic visual effect",
  // Source: server-scripts/TargetBuffSkill.cs — isCallHeroes teleports all
  // active mercenaries to player position and clears their fear; returns before
  // applying any buff. mana_percent_per_second_bonus in game data is unused.
  call_of_the_heroes:
    "teleport all active mercenaries to you, remove their fear",
  teleport: "",
  new_skill_placeholder: "",
};

export function formatSkillEffect(
  skill: Skill,
  monsterContext?: MonsterContext,
): string {
  if (
    skill.id &&
    Object.prototype.hasOwnProperty.call(HARDCODED_EFFECTS, skill.id)
  ) {
    return HARDCODED_EFFECTS[skill.id];
  }

  const parts: string[] = [];

  // 1. Damage
  parts.push(...formatDamage(skill, monsterContext));

  // 2. Healing
  parts.push(...formatHealing(skill, monsterContext));

  // 3. Crowd control
  parts.push(...formatCrowdControl(skill, monsterContext));

  // 4. Summons
  parts.push(...formatSummons(skill));

  // 5. Passives (special case: enrage)
  if (skill.skill_type === "passive" && skill.is_enrage) {
    const enrageValue = monsterContext ? "+50-100%" : "+33%";
    parts.push(`${enrageValue} dmg below 25% hp`);
  }

  // 6. Buffs/debuffs
  // Always show buff/debuff stats (fixes bug where stats were suppressed if damage was present)
  if (
    skill.skill_type === "area_buff" ||
    skill.skill_type === "area_debuff" ||
    skill.skill_type === "target_buff" ||
    skill.skill_type === "target_debuff" ||
    skill.skill_type === "passive"
  ) {
    const buffStats = formatBuffDebuffStats(skill, monsterContext);
    parts.push(...buffStats);
  }

  // Special mechanics
  if (skill.is_assassination_skill) {
    parts.push("execute <25% hp");
  }
  if (skill.is_manaburn_skill) {
    parts.push("burns mana/rage for dmg");
  }

  // Add duration if present and we have stat effects
  if (skill.duration_base > 0 && parts.length > 0) {
    // Check if this is a buff/debuff (not damage/heal/summon)
    const hasBuffStats =
      skill.skill_type === "area_buff" ||
      skill.skill_type === "area_debuff" ||
      skill.skill_type === "target_buff" ||
      skill.skill_type === "target_debuff";

    if (hasBuffStats) {
      return `${parts.join(", ")}, ${skill.duration_base}s`;
    }
  }

  return parts.join(", ");
}
