import type { DamageTerm, DamageType, LinearValue } from "$lib/types/skills";
import { iround, multiplyF32 } from "$lib/calculation/unity-math";
import { formatDuration } from "./format";

/** Returns true when a LinearValue field has at least one non-zero component.
 * The DB stores all LinearValue fields as JSON objects even when both components
 * are zero, so a raw null-check is insufficient to detect "no value".
 */
export function hasNonZeroField(f: LinearValue | null): boolean {
  return f != null && (f.base_value !== 0 || f.bonus_per_level !== 0);
}

/**
 * Monster context for damage calculation
 */
export interface MonsterContext {
  damage: number;
  magicDamage: number;
}

export interface SkillEffectFormatOptions {
  /** Resolves damage with these stats and drops the notes about the reader's casters. */
  monster?: MonsterContext;
}

/**
 * Everything formatSkillEffect reads. `skillEffectInput` builds it from a
 * skill's detail view and the casters the mechanics cards use, and the
 * BetterBestiary port builds it from a live skill. An absent field means the
 * skill has no such value.
 */
export interface Skill {
  id?: string;
  skill_type: string;
  damage_type?: DamageType | null;
  damage_over_time_type?: DamageType | null;
  damage_shield_type?: DamageType | null;
  max_level?: number;

  // Casters and delivery
  /** Only monsters and NPCs cast the skill, so values are resolved at their fixed rank. */
  npc_caster_only?: boolean;
  is_mercenary_skill?: boolean;
  required_weapon_category?: string | null;
  /** Base cast range in yd. */
  cast_range?: number;
  can_buff_self?: boolean;
  can_buff_others?: boolean;
  /** An area damage skill whose hits travel as projectiles. */
  area_projectile?: boolean;
  is_only_for_magic_classes?: boolean;
  is_undead_illusion?: boolean;
  /** The buff level of the potions that apply the skill, or null when none does. */
  potion_buff_level?: number | null;
  /** Whose kind an unflagged area heal reaches: a player's reaches players, a pet's pets, a monster's monsters. */
  area_heal_caster?: AreaHealCaster;
  /** How the summary's casters' attributes change each listed value, keyed by field. */
  notes?: SummaryNotes;

  // Damage fields
  damage?: LinearValue | null;
  damage_percent?: LinearValue | null;
  /** Terms the summary's casters add to or subtract from listed damage. Absent means listed damage only. */
  damage_terms?: DamageTerm[];
  /** Terms a monster caster adds to listed damage, for the monster context. */
  monster_damage_terms?: DamageTerm[];
  lifetap_percent?: LinearValue | null;
  knockback_chance?: LinearValue | null;
  knockback_distance?: number | null;
  stun_chance?: LinearValue | null;
  stun_time?: LinearValue | null;
  fear_chance?: LinearValue | null;
  fear_time?: LinearValue | null;
  aggro?: LinearValue | null;
  is_assassination_skill?: boolean;
  is_manaburn_skill?: boolean;
  break_armor_prob?: number;

  // Healing fields
  heals_health?: LinearValue | null;
  heals_mana?: LinearValue | null;
  charmed_damage_percent?: LinearValue | null;
  is_resurrect_skill?: boolean;
  is_balance_health?: boolean;
  health_cost_percent?: LinearValue | null;
  mana_restored_percent?: LinearValue | null;
  healing_percent?: LinearValue | null;
  healing_percent_per_intelligence?: number;

  // Buff/debuff stat fields
  health_max_bonus?: LinearValue | null;
  health_max_percent_bonus?: LinearValue | null;
  mana_max_bonus?: LinearValue | null;
  mana_max_percent_bonus?: LinearValue | null;
  energy_max_bonus?: LinearValue | null;
  defense_bonus?: LinearValue | null;
  ward_bonus?: LinearValue | null;
  magic_resist_bonus?: LinearValue | null;
  poison_resist_bonus?: LinearValue | null;
  fire_resist_bonus?: LinearValue | null;
  cold_resist_bonus?: LinearValue | null;
  disease_resist_bonus?: LinearValue | null;
  damage_bonus?: LinearValue | null;
  damage_percent_bonus?: LinearValue | null;
  magic_damage_bonus?: LinearValue | null;
  magic_damage_percent_bonus?: LinearValue | null;
  haste_bonus?: LinearValue | null;
  spell_haste_bonus?: LinearValue | null;
  speed_bonus?: LinearValue | null;
  critical_chance_bonus?: LinearValue | null;
  critical_resist_bonus?: LinearValue | null;
  accuracy_bonus?: LinearValue | null;
  block_chance_bonus?: LinearValue | null;
  fear_resist_chance_bonus?: LinearValue | null;
  fear_resist_chance_bonus_cap?: number;
  damage_shield?: LinearValue | null;
  cooldown_reduction_percent?: LinearValue | null;
  heal_on_hit_percent?: LinearValue | null;
  healing_per_second_bonus?: LinearValue | null;
  health_percent_per_second_bonus?: LinearValue | null;
  mana_per_second_bonus?: LinearValue | null;
  mana_percent_per_second_bonus?: LinearValue | null;
  energy_per_second_bonus?: LinearValue | null;
  energy_percent_per_second_bonus?: LinearValue | null;
  strength_bonus?: LinearValue | null;
  intelligence_bonus?: LinearValue | null;
  dexterity_bonus?: LinearValue | null;
  charisma_bonus?: LinearValue | null;
  wisdom_bonus?: LinearValue | null;
  constitution_bonus?: LinearValue | null;

  // Buff duration
  duration_base?: number;
  duration_per_level?: number | null;
  is_permanent?: boolean;

  // Special flags
  is_double_exp_spell?: boolean;
  is_invisibility?: boolean;
  ignores_see_invisibility?: boolean;
  illusion_race?: string | null;
  is_mana_shield?: boolean;
  is_cleanse?: boolean;
  is_dispel?: boolean;
  is_teleport?: boolean;
  is_blindness?: boolean;
  is_enrage?: boolean;
  is_bard_song?: boolean;
  is_bard_charm?: boolean;
  is_bard_final_cadence?: boolean;
  is_bard_virtuosity?: boolean;
  additional_damage_percent_per_song?: number;
  additional_active_bard_songs?: number;
  unlimited_active_bard_songs?: boolean;
  bard_song_duration_bonus_per_level?: number;
  extra_gather_item_chance?: number;
  food_and_drink_buff_duration_bonus_per_level?: number;
  is_pet_skill?: boolean;
  channel_pulses?: number;
  also_buff_active_pet?: boolean;
  is_necromancer_blood_pact?: boolean;
  is_necromancer_death_bloom?: boolean;
  is_necromancer_pet_buff?: boolean;
  is_necromancer_reaper_form?: boolean;
  lifetap_healing_percent_bonus?: LinearValue | null;
  damage_over_time_execute_bonus?: LinearValue | null;

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

/** The kind of entity an effect summary's area heal is cast by. */
export type AreaHealCaster = "player" | "pet" | "monster";

/** The listed values a caster's attribute can change, so a summary note can qualify them. */
export const NOTED_FIELDS = [
  "damage",
  "heals_health",
  "charmed_damage_percent",
  "health_max_bonus",
  "health_max_percent_bonus",
  "mana_max_bonus",
  "energy_max_bonus",
  "defense_bonus",
  "ward_bonus",
  "magic_resist_bonus",
  "poison_resist_bonus",
  "fire_resist_bonus",
  "cold_resist_bonus",
  "disease_resist_bonus",
  "damage_bonus",
  "damage_percent_bonus",
  "magic_damage_bonus",
  "magic_damage_percent_bonus",
  "haste_bonus",
  "spell_haste_bonus",
  "critical_chance_bonus",
  "critical_resist_bonus",
  "accuracy_bonus",
  "block_chance_bonus",
  "fear_resist_chance_bonus",
  "damage_shield",
  "cooldown_reduction_percent",
  "healing_per_second_bonus",
  "health_percent_per_second_bonus",
  "mana_per_second_bonus",
  "mana_percent_per_second_bonus",
  "energy_per_second_bonus",
  "energy_percent_per_second_bonus",
] as const;

export type NotedField = (typeof NOTED_FIELDS)[number];

/**
 * How the summary's casters' attributes change a listed value, such as "+2 per
 * INT", keyed by its field. `is_bard_song` qualifies the "Bard song" fragment
 * when song power scales every value the song shows.
 */
export type SummaryNotes = Partial<Record<NotedField | "is_bard_song", string>>;

/** A rank-scaled value, or null when it is absent or zero at every rank. */
function parseLinearValue(
  field: LinearValue | null | undefined,
): LinearValue | null {
  if (!field || (field.base_value === 0 && field.bonus_per_level === 0)) {
    return null;
  }
  return field;
}

/** "1,234" or "−0.5", with a true minus sign. */
function formatNumber(value: number): string {
  return value.toLocaleString("en-US").replace(/^-/, "−");
}

/** 0.15 as "15%", 0.025 as "2.5%", −0.05 as "−5%". */
function formatPercent(value: number): string {
  return `${String(parseFloat((value * 100).toFixed(2))).replace(/^-/, "−")}%`;
}

/**
 * A rank-scaled value as one formula. In the monster context it is the value
 * at `skillLevel`.
 */
export function formatLinearValue(
  lv: LinearValue,
  options: SkillEffectFormatOptions | undefined,
  skillLevel: number = 1,
): string {
  if (options?.monster) {
    return formatNumber(lv.base_value + lv.bonus_per_level * (skillLevel - 1));
  }
  return lv.bonus_per_level === 0
    ? formatNumber(lv.base_value)
    : formatSkillLevelFormula(lv, formatNumber);
}

/** A rank-scaled value with a unit on every number. */
export function formatLinearValueWithUnit(
  value: LinearValue,
  unit: string,
): string {
  const formatValue = (number: number) => `${formatNumber(number)}${unit}`;
  return value.bonus_per_level === 0
    ? formatValue(value.base_value)
    : formatSkillLevelFormula(value, formatValue);
}

// Source: server-scripts/LinearFloat.cs:10-13 — a rank's value is baseValue + bonusPerLevel × (rank − 1).
/**
 * A value that changes with rank, written so its first number is the value at
 * rank 1, as in "1 + 4 × (rank − 1)". A value whose rank-1 value equals its
 * step reads "20 × rank".
 */
function formatSkillLevelFormula(
  value: LinearValue,
  formatValue: (value: number) => string,
): string {
  if (value.base_value === value.bonus_per_level) {
    return `${formatValue(value.bonus_per_level)} × rank`;
  }
  const operator = value.bonus_per_level > 0 ? "+" : "−";
  return `${formatValue(value.base_value)} ${operator} ${formatValue(Math.abs(value.bonus_per_level))} × (rank − 1)`;
}

/** The lowercase damage type a summary names, or "" when it names none. */
export function formatDamageType(type: DamageType | null | undefined): string {
  switch (type) {
    case "Physical":
      return "physical";
    case "Magic":
      return "magic";
    case "Poison":
      return "poison";
    case "Fire":
      return "fire";
    case "Cold":
      return "cold";
    case "Disease":
      return "disease";
    case "Unknown":
      return "";
    default:
      return "";
  }
}

/** A duration that may change with rank. */
export function formatLinearDuration(
  baseValue: number,
  bonusPerLevel: number,
): string {
  if (bonusPerLevel === 0) return formatDuration(baseValue);
  return formatSkillLevelFormula(
    { base_value: baseValue, bonus_per_level: bonusPerLevel },
    (value) => `${formatNumber(value)}s`,
  );
}

/** A percentage that may change with rank. In the monster context it is the value at `skillLevel`. */
export function formatLinearPercent(
  lv: LinearValue,
  options: SkillEffectFormatOptions | undefined,
  skillLevel: number = 1,
): string {
  if (options?.monster) {
    return formatPercent(lv.base_value + lv.bonus_per_level * (skillLevel - 1));
  }
  return lv.bonus_per_level === 0
    ? formatPercent(lv.base_value)
    : formatSkillLevelFormula(lv, formatPercent);
}

/** "a", "a & b" or "a, b & c". */
function joinAnd(items: readonly string[]): string {
  return items.length > 1
    ? `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`
    : items.join("");
}

/** A fragment followed by its present qualifiers in parentheses. */
function qualify(
  fragment: string,
  ...qualifiers: (string | undefined)[]
): string {
  const present = qualifiers.filter(
    (qualifier): qualifier is string => !!qualifier,
  );
  return present.length === 0
    ? fragment
    : `${fragment} (${present.join(", ")})`;
}

/** A signed rank-scaled amount followed by its label. */
function signedValue(
  value: LinearValue,
  label: string,
  options: SkillEffectFormatOptions | undefined,
): string {
  return `${value.base_value > 0 ? "+" : ""}${formatLinearValue(value, options)} ${label}`;
}

/** A signed rank-scaled percentage followed by its label. */
function signedPercent(
  value: LinearValue,
  label: string,
  options: SkillEffectFormatOptions | undefined,
): string {
  return `${value.base_value > 0 ? "+" : ""}${formatLinearPercent(value, options)} ${label}`;
}

/** The value with its sign flipped at every rank. */
function negated(value: LinearValue): LinearValue {
  return {
    base_value: -value.base_value,
    bonus_per_level: -value.bonus_per_level,
  };
}

const DAMAGE_TERM_LABELS: Record<DamageTerm, string> = {
  spell_power: "spell power",
  attack_power: "attack power",
  ranged_dexterity: "150% of DEX",
  poison_dexterity: "250% of DEX",
  bow: "bow base dmg",
  off_hand_half: "50% of off-hand base dmg",
  main_hand: "main-hand base dmg",
};

/** Damage terms the formula subtracts. */
const DAMAGE_DEDUCTIONS: ReadonlySet<DamageTerm> = new Set<DamageTerm>([
  "bow",
  "off_hand_half",
  "main_hand",
]);

/** Append a formatted linear value to a sum, folding its leading sign into the operator. */
function addTerm(sum: string, term: string): string {
  if (term.startsWith("−")) {
    return `${sum} − ${term.slice(1)}`;
  }
  return `${sum} + ${term}`;
}

/** Wrap a sum or a rank formula in parentheses so a multiplication binds to all of it. */
function group(expression: string): string {
  return / [+−] /.test(expression) ? `(${expression})` : expression;
}

// Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; AreaDamageSkill.cs:Apply; AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities — handlers add listed damage to their stats, then multiply the sum by a damage percentage above 0 and round.
// Source: server-scripts/FrontalProjectilesSkill.cs:Apply — frontal projectiles add listed damage without a percentage.
/**
 * Format damage effects
 */
function formatDamage(
  skill: Skill,
  options: SkillEffectFormatOptions | undefined,
  notes: SummaryNotes,
): string[] {
  const skillDmg = parseLinearValue(skill.damage);
  const damagePercent = parseLinearValue(skill.damage_percent);
  if (!skillDmg && !damagePercent) return [];

  const multiplier =
    skill.skill_type === "frontal_projectiles" ? null : damagePercent;
  const formattedType = formatDamageType(skill.damage_type);
  const typeLabel = formattedType ? ` ${formattedType}` : "";

  // Monster context: resolve the monster's stats into one number.
  if (options?.monster) {
    const monster = options.monster;
    const statTotal = (skill.monster_damage_terms ?? []).reduce(
      (total, term) => {
        if (term === "spell_power") return total + monster.magicDamage;
        if (term === "attack_power") return total + monster.damage;
        throw new Error(`Monsters have no ${term} damage term`);
      },
      0,
    );
    const combined = statTotal + (skillDmg?.base_value ?? 0);
    const total =
      multiplier && multiplier.base_value > 0
        ? iround(multiplyF32(combined, multiplier.base_value))
        : combined;
    return [`${formatNumber(total)}${typeLabel} dmg`];
  }

  // Formula context: name the terms so the multiplier visibly covers them and the listed damage.
  const terms = skill.damage_terms ?? [];
  const added = terms
    .filter((term) => !DAMAGE_DEDUCTIONS.has(term))
    .map((term) => DAMAGE_TERM_LABELS[term]);
  const subtracted = terms
    .filter((term) => DAMAGE_DEDUCTIONS.has(term))
    .map((term) => DAMAGE_TERM_LABELS[term]);
  if (added.length === 0 && subtracted.length > 0) {
    throw new Error(
      `Skill ${skill.id}: a damage formula subtracts Base Damage without adding a stat`,
    );
  }
  const listed = skillDmg ? formatLinearValue(skillDmg, options) : null;
  const stats = [added.join(" + "), ...subtracted].join(" − ");
  const combined =
    stats === ""
      ? (listed ?? "0")
      : listed === null
        ? stats
        : addTerm(stats, listed);
  if (!multiplier)
    return [qualify(`${combined}${typeLabel} dmg`, notes.damage)];
  const maxLevel = skill.max_level ?? 1;
  const lapses =
    multiplier.base_value <= 0 ||
    multiplier.base_value + multiplier.bonus_per_level * (maxLevel - 1) <= 0;
  return [
    qualify(
      `${group(combined)} × ${group(formatLinearPercent(multiplier, options))}${typeLabel} dmg`,
      notes.damage,
      lapses ? "multiplied only above 0%" : undefined,
    ),
  ];
}

/**
 * Format healing effects
 */
function formatHealing(
  skill: Skill,
  options: SkillEffectFormatOptions | undefined,
  notes: SummaryNotes,
): string[] {
  const parts: string[] = [];
  const cost = parseLinearValue(skill.health_cost_percent);
  const restored = parseLinearValue(skill.mana_restored_percent);
  // Source: server-scripts/NecromancerBloodPactSkill.cs:GetHealthCost — CeilToInt(health.max * healthCostPercent.Get(skillLevel)).
  // Source: server-scripts/NecromancerBloodPactSkill.cs:GetManaRestored — FloorToInt(mana.max * manaRestoredPercent.Get(skillLevel)).
  // Source: server-scripts/NecromancerBloodPactSkill.cs:Apply — Math.Min(GetManaRestored, mana.max - mana.current); subtracts GetHealthCost.
  if (skill.is_necromancer_blood_pact && cost && restored) {
    parts.push(
      `spend ${formatLinearPercent(cost, options)} max hp (rounded up), restore ${formatLinearPercent(restored, options)} max mana (rounded down, at most missing mana)`,
    );
    return parts;
  }
  const healing = parseLinearValue(skill.healing_percent);
  // Source: server-scripts/NecromancerDeathBloomSkill.cs:GetHealthCost — CeilToInt(health.max * healthCostPercent).
  // Source: server-scripts/NecromancerDeathBloomSkill.cs:GetHealingAmount — RoundToInt(GetHealthCost * (healingPercent.Get(skillLevel) + GetIntelligenceBonus)).
  // Source: server-scripts/NecromancerDeathBloomSkill.cs:GetIntelligenceBonus — Max(0, intelligence.value) * healingPercentPerIntelligence.
  if (skill.is_necromancer_death_bloom && cost && healing) {
    const intelligence = skill.healing_percent_per_intelligence ?? 0;
    const bonus = intelligence
      ? ` + ${formatPercent(intelligence)} per INT`
      : "";
    parts.push(
      `spend ${formatLinearPercent(cost, options)} max hp (rounded up), heal target for health spent × (${formatLinearPercent(healing, options)}${bonus}) (rounded)`,
    );
    return parts;
  }

  // Source: server-scripts/AreaHealSkill.cs:Apply,CheckDistance — a mercenary area heal reaches every active mercenary of the caster at any distance and restores Rage instead of Mana to Warrior and Rogue mercenaries.
  const mercenaryHeal =
    skill.skill_type === "area_heal" && skill.is_mercenary_skill;
  if (mercenaryHeal) parts.push("heals your mercenaries at any distance");

  // Source: server-scripts/AreaHealSkill.cs:Apply — balancing sets everyone in range to their average share of maximum Health and heals nothing.
  if (skill.is_balance_health) {
    parts.push(`balances the hp % of ${areaHealRecipients(skill)}`);
    return parts;
  }
  if (skill.skill_type === "area_heal" && !skill.is_mercenary_skill) {
    parts.push(`heals ${areaHealRecipients(skill)}`);
  }

  const heal = parseLinearValue(skill.heals_health);
  if (heal) {
    parts.push(
      qualify(`${formatLinearValue(heal, options)} hp`, notes.heals_health),
    );
  }

  const healMana = parseLinearValue(skill.heals_mana);
  if (healMana) {
    parts.push(
      `${formatLinearValue(healMana, options)} ${mercenaryHeal ? "mana or rage" : "mana"}`,
    );
  }

  // Source: server-scripts/Player.cs:UserCode_CmdResurrect__Int32__Single__Single__NetworkIdentity — resurrection restores 60% max HP, 20% max HP as mana, and +75% of lossExp.
  // Source: server-scripts/TargetHealSkill.cs:CorrectedTarget,Apply — a dead mercenary target returns at 10% of its maximum Health.
  if (skill.is_resurrect_skill) {
    parts.push(
      "resurrect player (60% max hp, mana = 20% max hp, +75% lost XP) or mercenary (10% max hp)",
    );
  }

  return parts;
}

// Source: server-scripts/AreaHealSkill.cs:Apply — an area heal without the pet or mercenary flag reaches its caster and every living, visible entity in range of the caster's own type, plus, for a player caster, every player's companions and mercenaries.
/** Who an area heal without the pet or mercenary flag reaches. */
function areaHealRecipients(skill: Skill): string {
  const range = `within ${formatNumber(skill.cast_range ?? 0)} yd`;
  switch (skill.area_heal_caster) {
    case "player":
      return `you & every player, companion & mercenary ${range}`;
    case "pet":
      return `itself & every companion & mercenary ${range}, not players`;
    case "monster":
      return `itself & every monster ${range}`;
    case undefined:
      throw new Error(
        `Skill ${skill.id}: an area heal summary needs the kind of its caster`,
      );
  }
}

/** Whether the summary describes a monster's or NPC's cast, whose threat and debuff immunity never involve the reader. */
function castByMonsters(
  skill: Skill,
  options: SkillEffectFormatOptions | undefined,
): boolean {
  return options?.monster !== undefined || !!skill.npc_caster_only;
}

/**
 * Format crowd control effects
 */
function formatCrowdControl(
  skill: Skill,
  options: SkillEffectFormatOptions | undefined,
): string[] {
  const parts: string[] = [];

  // Source: server-scripts/AreaDamageSkill.cs:Apply; ProjectileSkillEffect.cs:FixedUpdate — an area skill's projectiles carry no lifetap or knockback.
  const areaProjectile =
    skill.skill_type === "area_damage" && !!skill.area_projectile;

  const lifetap = parseLinearValue(skill.lifetap_percent);
  if (lifetap && !areaProjectile) {
    parts.push(`${formatLinearPercent(lifetap, options)} lifetap`);
  }

  // Source: server-scripts/Combat.cs:DealDamageAt — a hit that is not avoided may take 1-4 durability from one random equipped item of a player or mercenary.
  if (skill.break_armor_prob && skill.break_armor_prob > 0) {
    parts.push(
      `${formatPercent(skill.break_armor_prob)} chance a random equipped item loses 1-4 durability`,
    );
  }

  // Source: server-scripts/Combat.cs:DealDamageAt — stun, fear and knockback are one else-if chain, and fear lasts a random 50-100% of fearTime.
  const stun = parseLinearValue(skill.stun_chance);
  if (stun) {
    const stunDur = parseLinearValue(skill.stun_time);
    const durSuffix = stunDur
      ? ` (${formatLinearDuration(stunDur.base_value, stunDur.bonus_per_level)})`
      : "";
    parts.push(`${formatLinearPercent(stun, options)} stun${durSuffix}`);
  }

  const fear = parseLinearValue(skill.fear_chance);
  if (fear) {
    const fearDur = parseLinearValue(skill.fear_time);
    const durSuffix = !fearDur
      ? ""
      : fearDur.bonus_per_level === 0
        ? ` (${fearDur.base_value / 2}-${fearDur.base_value}s)`
        : ` (50-100% of ${formatLinearDuration(fearDur.base_value, fearDur.bonus_per_level)})`;
    parts.push(
      `${stun ? "else " : ""}${formatLinearPercent(fear, options)} fear${durSuffix}`,
    );
  }

  const knockback = parseLinearValue(skill.knockback_chance);
  if (knockback && !areaProjectile) {
    const distance = Number(skill.knockback_distance ?? 0);
    const reach = distance > 0 ? ` ${distance} yd` : "";
    parts.push(
      `${stun || fear ? "else " : ""}${formatLinearPercent(knockback, options)} knockback${reach}`,
    );
  }

  // AoE properties
  if (skill.affects_random_target) {
    parts.push("random target");
  }

  // Source: server-scripts/AreaObjectSpawnSkill.cs:AreaObjectSpawner.SpawnObjects,GetCandidates — one zone lands on the caster's target, the rest at random, each hitting within half its size.
  if (skill.area_objects_to_spawn && skill.area_objects_to_spawn > 0) {
    const sizeInfo = skill.area_object_size
      ? `, ${skill.area_object_size} yd wide`
      : "";
    parts.push(
      `${skill.area_objects_to_spawn} random zones + 1 on target${sizeInfo}`,
    );
  }

  // Source: server-scripts/Combat.cs:DealDamageAt — only monster and NPC victims record threat, so the threat of a monster's or NPC's skill never reaches a player.
  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; AreaDamageSkill.cs:Apply — positive threat from a direct hit adds the caster's maximum Health.
  const aggro = parseLinearValue(skill.aggro);
  if (aggro && aggro.base_value !== 0 && !castByMonsters(skill, options)) {
    const directHit =
      skill.skill_type === "target_damage" ||
      (skill.skill_type === "area_damage" && !skill.area_projectile);
    const healthThreat =
      aggro.base_value > 0 && directHit ? " plus caster max hp" : "";
    parts.push(
      `${aggro.base_value > 0 ? "+" : ""}${formatLinearValue(aggro, options)} aggro${healthThreat}`,
    );
  }

  return parts;
}

/**
 * Format summon/teleport effects
 */
function formatSummons(skill: Skill): string[] {
  const parts: string[] = [];

  // Summon Player is the only summon_count_per_cast 0 skill and has its own text.

  // Regular summon
  if (skill.summoned_monster_id || skill.pet_name) {
    const name =
      skill.summoned_monster_name ||
      skill.pet_name ||
      skill.summoned_monster_id ||
      "pet";
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

    if (skill.summon_count_per_cast === -1) {
      parts.push(`summons 1x ${name} per player/mercenary${suffix}`);
    } else {
      const count = skill.summon_count_per_cast ?? 1;
      parts.push(`summons ${count}x ${name}${suffix}`);
    }
  }

  return parts;
}

/** The five resistances, in display order. */
const RESISTS = [
  ["magic_resist_bonus", "magic"],
  ["poison_resist_bonus", "poison"],
  ["fire_resist_bonus", "fire"],
  ["cold_resist_bonus", "cold"],
  ["disease_resist_bonus", "disease"],
] as const satisfies readonly (readonly [NotedField, string])[];

/**
 * Format buff/debuff stat effects
 */
function formatBuffDebuffStats(
  skill: Skill,
  options: SkillEffectFormatOptions | undefined,
  notes: SummaryNotes,
): string[] {
  const parts: string[] = [];
  const debuff =
    skill.skill_type === "area_debuff" || skill.skill_type === "target_debuff";
  /** A signed amount with its caster note, when it is set (and nonzero at rank 1 when `nonzeroBase`). */
  const pushValue = (
    key: NotedField,
    label: string,
    nonzeroBase: boolean,
    ...qualifiers: (string | undefined)[]
  ) => {
    const value = parseLinearValue(skill[key]);
    if (!value || (nonzeroBase && value.base_value === 0)) return;
    parts.push(
      qualify(signedValue(value, label, options), notes[key], ...qualifiers),
    );
  };
  const pushPercent = (
    key: NotedField,
    label: string,
    nonzeroBase: boolean,
    ...qualifiers: (string | undefined)[]
  ) => {
    const value = parseLinearValue(skill[key]);
    if (!value || (nonzeroBase && value.base_value === 0)) return;
    parts.push(
      qualify(signedPercent(value, label, options), notes[key], ...qualifiers),
    );
  };

  // 1. Special flags (binary game-changers that define the skill's identity)
  // Source: server-scripts/Skills.cs:hasDoubleExp; Monster.cs:OnDeath; GatherItem.cs; Player.cs — double XP covers kills, gathering, fishing, crafting, alchemy and scribing, but not quest rewards.
  if (skill.is_double_exp_spell) {
    parts.push(
      "2× XP from kills, gathering, fishing, crafting, alchemy & scribing",
    );
  }
  if (skill.is_dispel) parts.push("dispels buffs");
  // Source: server-scripts/TargetBuffSkill.cs:137-161 (HasMatchingCleanseDebuff) — cleanse matches on the skill's own debuff type flags
  if (skill.is_cleanse) {
    // A target cleanse matches debuff types, so physical and untyped debuffs never match. No area cleanse carries every type flag, which would remove every debuff.
    parts.push(`cleanses ${joinAnd(cleanseTypes(skill))} debuffs`);
    // Source: server-scripts/TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — a cleanse spell removes debuffs instead of applying its own buff fields.
    return parts;
  }
  if (skill.is_blindness) parts.push("blinds");
  // Source: server-scripts/Skills.cs:HasInvisibilityIgnoringDetection — ignoreSeeInvisibility hides the wearer from see-invisibility too.
  if (skill.is_invisibility) {
    parts.push(
      skill.ignores_see_invisibility
        ? "grants invis, even vs see invis"
        : "grants invis",
    );
  }
  // A buff carrying illusionRace redraws the wearer as that race until it ends.
  // Source: server-scripts/BuffSkill.cs:illusionRace,86-96 (illusionRace, HasAppearanceIllusion),
  // server-scripts/Player.cs:6887-6897 (ReSkinPlayer picks the illusion race)
  if (skill.illusion_race) parts.push(`${skill.illusion_race} illusion`);
  if (skill.is_mana_shield) parts.push("mana shield");
  // Source: server-scripts/BuffSkill.cs:HasAppearanceIllusion; Skills.cs — undeadIlussion redraws a player as undead.
  if (skill.is_undead_illusion) parts.push("undead illusion");

  // 2. Movement (matches game tooltip order)
  // Speed-based CC tiers mirror the server FSM thresholds in Monster.cs/Npc.cs/Pet.cs.
  // Sleep (speedBonus <= -50f): breaks on any damage hit or DoT tick (BreakMezz, Skills.cs).
  // Root (-50f < speedBonus <= -10f): does NOT break on damage; RemoveRoot self-break timer.
  // Slow (speedBonus > -10f and < 0): pure speed reduction, no CC mechanic.
  // Source: server-scripts/Monster.cs, Npc.cs, Pet.cs (FSM branches), server-scripts/Skills.cs (BreakMezz)
  const speedBonus = parseLinearValue(skill.speed_bonus);
  if (speedBonus) {
    if (speedBonus.base_value <= -50) {
      parts.push("sleep");
    } else if (speedBonus.base_value <= -10) {
      parts.push("root");
    } else if (speedBonus.base_value !== 0) {
      parts.push(signedValue(speedBonus, "speed", options));
    }
  }

  // 3. Resource pools
  pushValue("health_max_bonus", "max hp", false);
  // Source: server-scripts/Skills.cs:GetHealthPercentBonus — isPetSkill passive healthMaxPercentBonus goes to non-mercenary, non-familiar Pet, not the owner.
  pushPercent(
    "health_max_percent_bonus",
    skill.skill_type === "passive" && skill.is_pet_skill
      ? "companion max hp"
      : "max hp",
    false,
  );
  pushValue("mana_max_bonus", "max mana", false);
  const manaMaxPercent = parseLinearValue(skill.mana_max_percent_bonus);
  if (manaMaxPercent) {
    parts.push(signedPercent(manaMaxPercent, "max mana", options));
  }
  pushValue("energy_max_bonus", "max rage", false);

  // 4. Offense
  pushValue("damage_bonus", "attack power", true);
  pushPercent("damage_percent_bonus", "attack power", true);
  pushValue("magic_damage_bonus", "spell power", true);
  // Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active Reaper Form also multiplies the caster's DoT ticks on others by its spell power bonus.
  pushPercent(
    "magic_damage_percent_bonus",
    skill.is_necromancer_reaper_form ? "spell power & DoT dmg" : "spell power",
    true,
  );

  const lifetapHealing = parseLinearValue(skill.lifetap_healing_percent_bonus);
  // Source: server-scripts/Combat.cs:1329-1339 — lifetapPercent healing multiplies by 1 + lifetapHealingPercentBonus.Get(buff.level).
  if (lifetapHealing) {
    parts.push(
      `+${formatLinearPercent(lifetapHealing, options)} lifetap healing`,
    );
  }
  const dotExecute = parseLinearValue(skill.damage_over_time_execute_bonus);
  // Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — health.current below health.max * 0.3f sums PassiveSkill.damageOverTimeExecuteBonus.Get(skill.level).
  if (dotExecute) {
    parts.push(
      `+${formatLinearPercent(dotExecute, options)} DoT dmg vs targets below 30% hp`,
    );
  }
  // 4. Defense (mitigation stats grouped together)
  const defenseBonus = parseLinearValue(skill.defense_bonus);
  const magicResistBonus = parseLinearValue(skill.magic_resist_bonus);
  // Source: server-scripts/Combat.cs:DealDamageAt — 10,000 AC and Magic Resist block every direct hit. Skills.cs, TargetDebuffSkill.cs and AreaDebuffSkill.cs also spare such a player or pet from DoT ticks and debuffs.
  const invulnerable =
    (defenseBonus?.base_value ?? 0) >= 10000 &&
    (magicResistBonus?.base_value ?? 0) >= 10000;
  if (invulnerable) {
    parts.push(
      castByMonsters(skill, options) ? "immune to direct dmg" : "invulnerable",
    );
  } else {
    pushValue("defense_bonus", "AC", true);
  }

  pushValue("ward_bonus", "ward", true);

  if (!invulnerable) {
    // Resists with the same amount and note read as one fragment, such as "+10 poison & disease res".
    const groups: { names: string[]; key: NotedField; value: LinearValue }[] =
      [];
    for (const [key, name] of RESISTS) {
      const value = parseLinearValue(skill[key]);
      if (!value || value.base_value === 0) continue;
      const group = groups.find(
        (candidate) =>
          candidate.value.base_value === value.base_value &&
          candidate.value.bonus_per_level === value.bonus_per_level &&
          notes[candidate.key] === notes[key],
      );
      if (group) group.names.push(name);
      else groups.push({ names: [name], key, value });
    }
    for (const { names, key, value } of groups) {
      const label = names.length === RESISTS.length ? "all" : joinAnd(names);
      parts.push(
        qualify(signedValue(value, `${label} res`, options), notes[key]),
      );
    }
  }

  // 5. Attack speed
  pushPercent("haste_bonus", "haste", true);
  pushPercent("spell_haste_bonus", "spell casting haste", true);

  // 7. Hit/chance modifiers
  pushPercent("critical_chance_bonus", "crit", true);
  pushPercent("critical_resist_bonus", "critical resist", true);
  pushPercent("accuracy_bonus", "accuracy", true);
  pushPercent("block_chance_bonus", "block", true);
  const fearResistCap = skill.fear_resist_chance_bonus_cap ?? 0;
  pushPercent(
    "fear_resist_chance_bonus",
    "fear resist",
    true,
    fearResistCap > 0 ? `max ${formatPercent(fearResistCap)}` : undefined,
  );

  // Cooldown reduction is an instant cast effect, formatted by formatSkillEffect.

  // 9. On-hit proc effects
  const dmgShield = parseLinearValue(skill.damage_shield);
  if (dmgShield && dmgShield.base_value > 0) {
    const formattedType = formatDamageType(skill.damage_shield_type);
    const typeLabel = formattedType ? ` ${formattedType}` : "";
    // Source: server-scripts/TargetDebuffSkill.cs:CorrectedTarget,Apply; Combat.cs:DealDamageAt — a debuff lands on the caster's target, so its shield hurts whoever strikes that target in melee.
    if (skill.skill_type === "area_debuff") {
      throw new Error(
        `Skill ${skill.id}: an area debuff damage shield has no summary text`,
      );
    }
    parts.push(
      qualify(
        `${formatLinearValue(dmgShield, options)}${typeLabel} dmg shield${debuff ? " on its target" : ""}`,
        notes.damage_shield,
      ),
    );
  }

  // Source: server-scripts/Combat.cs:DealDamageAt — the victim's healOnHitPercent heals the attacker of a non-spell melee DamageSkill hit.
  const healOnHit = parseLinearValue(skill.heal_on_hit_percent);
  if (healOnHit && healOnHit.base_value > 0) {
    parts.push(
      `melee hits on the target heal the attacker ${formatLinearPercent(healOnHit, options)} of dmg`,
    );
  }

  // 10. Regen / DoT
  // Source: server-scripts/Skills.cs — a negative regeneration value ticks as damage on whoever wears the buff.
  const hps = parseLinearValue(skill.healing_per_second_bonus);
  if (hps && hps.base_value !== 0) {
    if (hps.base_value > 0) {
      parts.push(
        qualify(
          `${formatLinearValue(hps, options)} hp/s`,
          notes.healing_per_second_bonus,
        ),
      );
    } else {
      const formattedType = formatDamageType(skill.damage_over_time_type);
      const typeLabel = formattedType ? ` ${formattedType}` : "";
      parts.push(
        qualify(
          `${debuff ? "" : "wearer takes "}${formatLinearValue(negated(hps), options)}${typeLabel} dmg/s`,
          notes.healing_per_second_bonus,
        ),
      );
    }
  }

  // Source: server-scripts/Skills.cs:1647-1653,1841-1842 — a negative healthPercentPerSecondBonus removes that share of maximum Health each second, after resists and DoT bonuses.
  const hpPct = parseLinearValue(skill.health_percent_per_second_bonus);
  if (hpPct && hpPct.base_value !== 0) {
    if (hpPct.base_value > 0) {
      parts.push(
        qualify(
          `+${formatLinearPercent(hpPct, options)} hp/s`,
          notes.health_percent_per_second_bonus,
        ),
      );
    } else {
      const share = formatLinearPercent(negated(hpPct), options);
      parts.push(
        qualify(
          debuff ? `${share} max hp dmg/s` : `${share} max hp drain/s`,
          notes.health_percent_per_second_bonus,
        ),
      );
    }
  }

  const mps = parseLinearValue(skill.mana_per_second_bonus);
  if (mps && mps.base_value !== 0) {
    parts.push(
      qualify(
        mps.base_value > 0
          ? `${formatLinearValue(mps, options)} mana/s`
          : `${formatLinearValue(negated(mps), options)} mana drain/s`,
        notes.mana_per_second_bonus,
      ),
    );
  }

  pushPercent("mana_percent_per_second_bonus", "mana/s", true);
  pushValue("energy_per_second_bonus", "rage/s", true);
  pushPercent("energy_percent_per_second_bonus", "rage/s", true);

  // 11. Primary stats
  const statFields: [LinearValue | null | undefined, string][] = [
    [skill.strength_bonus, "STR"],
    [skill.intelligence_bonus, "INT"],
    [skill.dexterity_bonus, "DEX"],
    [skill.constitution_bonus, "CON"],
    [skill.wisdom_bonus, "WIS"],
    [skill.charisma_bonus, "CHA"],
  ];

  for (const [field, label] of statFields) {
    const val = parseLinearValue(field);
    if (val && val.base_value !== 0) {
      parts.push(signedValue(val, label, options));
    }
  }

  // Debuff type tags (if no specific stats shown and is a debuff). A charm's type only matters to cleanses.
  if (parts.length === 0 && debuff && !skill.is_bard_charm) {
    if (skill.is_poison_debuff) parts.push("poison DoT");
    else if (skill.is_fire_debuff) parts.push("fire DoT");
    else if (skill.is_cold_debuff) parts.push("cold DoT");
    else if (skill.is_disease_debuff) parts.push("disease DoT");
    else if (skill.is_melee_debuff) parts.push("melee debuff");
    else if (skill.is_magic_debuff) parts.push("magic debuff");
  }

  // Source: server-scripts/PassiveSkill.cs; Skills.cs:GetCriticalChanceBonus; ScriptableSkill.cs:CheckWeapon — a passive with a weapon requirement adds its bonus only while that weapon is equipped.
  if (skill.skill_type === "passive" && skill.required_weapon_category) {
    parts.push(`with ${weaponCategoryLabel(skill.required_weapon_category)}`);
  }

  // 12. Cleanse Resist, always last. The site uses one name for resisting cleanses on debuffs and dispels on buffs.
  if (skill.prob_ignore_cleanse && skill.prob_ignore_cleanse > 0) {
    parts.push(`${formatPercent(skill.prob_ignore_cleanse)} Cleanse Resist`);
  }

  return parts;
}

/**
 * Format a skill's effect as a concise summary string
 *
 * @param skill - Skill data to format
 * @param options - Optional resolved monster stats for damage calculation
 * @returns Formatted skill effect string (empty if no effects)
 *
 * Category order: Damage > Healing > CC > Summons > Buffs/Debuffs
 */
const HARDCODED_EFFECTS: Record<string, string> = {
  // Source: server-scripts/Combat.cs:DealDamageAt — learned Improved Backstab raises the from-behind bonus from 10% to 25% of the damage.
  improved_backstab: "from-behind bonus dmg 25% instead of 10%",
  // Source: server-scripts/TargetBuffSkill.cs:Apply; Player.cs; TravelItem.cs — binding sets the respawn point that Gate Scroll also returns to.
  bind_affinity: "set bind point (respawn & Gate Scroll destination)",
  binding: "set bind point (respawn & Gate Scroll destination)",
  // Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — every potion but Bandages applies its buff at 1 + rank, and each buff level adds 60s.
  elixir_endurance: "potion buff duration +60s × rank (not bandages)",
  // Source: server-scripts/Monster.cs — minimap marks never show in Temple of Valaark.
  veteran_awareness:
    "reveals nearby monsters on minimap (not in Temple of Valaark)",
  // Source: server-scripts/Combat.cs:DealDamageAt,IsParry — during the cast, your target's single-target physical hits are blocked and 50% of the damage, rounded and clamped to 1-5,000, is dealt back.
  parry:
    "while casting, blocks your target's physical melee hits & counters 50% (max 5,000)",
  // Source: server-scripts/SummonSkill.cs:Apply — on summon, the pet takes rank × 10% of your attributes and adds rank × 10% of your AC and resists.
  symbiosis:
    "pet gets 10% × rank of your attributes, AC & resistances when summoned (max 50%)",
  // Source: server-scripts/SummonSkillMonsters.cs:Apply — a target more than 3 yd and less than the cast range away is warped to the caster and stunned for 2s.
  summon_player: "pulls a target 3-15 yd away to the caster, stun (2s)",
  // Source: server-scripts/Trap.cs:OnInteractServer; Player.cs:HasDetectTraps — disarming needs Detect Traps or Sharp Senses.
  disarm_trap: "disarm traps (needs Detect Traps or Sharp Senses)",
  alchemy: "craft potions and elixirs",
  baking: "craft food and consumables",
  crafting: "craft equipment and items",
  // Source: server-scripts/TableUI.cs; Player.cs — the scribing table cast.
  crafting_scroll: "scribe scrolls",
  digging: "dig for buried treasure",
  // Source: server-scripts/Player.cs:CmdFishing — the fishing cast.
  fishing: "catch fish",
  // Source: server-scripts/GatherItem.cs:TryGatherItem; Player.cs — the gather cast covers every node that is not ore, fish or a chest.
  gathering: "gather plants and Radiant Sparks",
  mining: "mine ore and minerals",
  // Source: server-scripts/GatherItem.cs:TryGatherItem; Player.cs:CmdOpenChest — every chest opens with this cast.
  opening: "open chests",
  // Source: server-scripts/GatherItem.cs:368-376,407-428 — Lockpicking allows opening locked chests
  // using lockpicks instead of the specific key. 80% failure chance, consumes one lockpick per attempt.
  lockpicking:
    "open locked chests with lockpicks, 1 per try (20% success chance)",
  blushburst: "cosmetic visual effect",
  emerald_pop: "cosmetic visual effect",
  golden_whirl: "cosmetic visual effect",
  skyflare: "cosmetic visual effect",
  // Source: server-scripts/PassiveSkill.cs (0.9.18.0+) — Detect Traps is now a passive skill.
  // Source: server-scripts/Player.cs:HasDetectTraps; server-scripts/Trap.cs:142-146,182-194,199-209;
  // server-scripts/TrapDetection.cs:Update — Detect Traps lets Rogue players disarm traps. Active Rogue and Bard mercenaries detect and disarm them.
  detect_traps: "reveal and disarm traps",
  // Source: server-scripts/Player.cs:9019-9036 — Sharp Senses uses the same trap-detection gate.
  sharp_senses: "reveal and disarm traps",
  // Source: server-scripts/TargetBuffSkill.cs:15 (isDoubleExpSpell flag) — lasts for the event duration
  halloween_event:
    "2× XP from kills, gathering, fishing, crafting, alchemy & scribing, event duration",
  winter_festival:
    "2× XP from kills, gathering, fishing, crafting, alchemy & scribing, event duration",
  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — while active, a Rogue's
  // followupDefaultAttack skill, Stab, switches to Poison damage and adds the rounded 250% Dexterity
  // bonus to Attack Power. Duration stored in duration_base (10s).
  master_poisoner:
    "Stab deals poison dmg & adds 250% of DEX, resisted by poison res, 10s",
  // Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — the Ranger's next auto attack deals 10% more per buff rank as Magic damage and consumes the buff.
  wild_strike: "next auto attack deals +10% × rank dmg as magic dmg, 5s",
  // Source: server-scripts/TargetBuffSkill.cs — isCallHeroes teleports all
  // active mercenaries to player position and clears their fear; returns before
  // applying any buff. mana_percent_per_second_bonus in game data is unused.
  call_of_the_heroes:
    "teleport all active mercenaries to you, remove their fear",
  // Source: server-scripts/TargetBuffSkill.cs — Charge navigates caster toward target
  // monster and queues an automatic follow-up attack (pendingSkill=1). Speed/rage-gen
  // stats are in the DB but the gap-closer behavior is hardcoded.
  charge:
    "charge toward target, removes roots, +3.5 speed, +100% accuracy, +5% rage/s, 2s",
  // Source: server-scripts/PlayerInventory.cs; Player.cs — the cast before a travel item takes effect, refused in combat.
  teleport: "use travel items (out of combat)",
  // Source: server-scripts/Combat.cs:138 — isResourceDepending passive: damage_percent_bonus × (energy.current / energy.max)
  razor_of_wrath:
    "+1% × rank attack power, scaled by current rage (full rage = full bonus)",
  // Source: server-scripts/Combat.cs:170 — isResourceDepending passive: magic_damage_percent_bonus × (mana.current / mana.max)
  arcane_edge:
    "+1% × rank spell power, scaled by current mana (full mana = full bonus)",
  // Divine Intervention: +10000 all resists for 3s in area is effectively invulnerability; generic formatter would show confusing +10000 values
  divine_intervention: "grants invulnerability to nearby allies, 3s",
};

/** A passive's required weapon category, as the reader knows the weapon. */
function weaponCategoryLabel(category: string): string {
  switch (category) {
    case "WeaponSword2H":
      return "a two-handed weapon";
    default:
      throw new Error(
        `No summary label for the passive weapon requirement ${category}`,
      );
  }
}

/** How long a buff or debuff lasts, as the reader experiences it. */
function buffDuration(skill: Skill): string {
  const base = skill.duration_base ?? 0;
  const perLevel = skill.duration_per_level ?? 0;
  // Source: server-scripts/BardMercenarySkills.cs:LateUpdate,RefreshAura — a singing Bard mercenary reapplies its song every 2.5s until stunned, feared, asleep or dead.
  if (skill.is_bard_song && skill.is_mercenary_skill) {
    return "renewed every 2.5s while sung";
  }
  // Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — a potion buff applies at the item's level, or at 1 + Elixir Endurance rank once that skill is learned.
  if (skill.potion_buff_level != null && perLevel !== 0) {
    if (skill.potion_buff_level !== 1) {
      throw new Error(
        `Skill ${skill.id}: potion buff level ${skill.potion_buff_level} has no Elixir Endurance duration text`,
      );
    }
    return `${formatDuration(base)} + ${formatDuration(perLevel)} × Elixir Endurance rank`;
  }
  return formatLinearDuration(base, perLevel);
}

/** The debuff types a cleanse spell removes, in display order. */
export function cleanseTypes(
  skill: Pick<
    Skill,
    | "is_poison_debuff"
    | "is_disease_debuff"
    | "is_fire_debuff"
    | "is_cold_debuff"
    | "is_magic_debuff"
  >,
): string[] {
  const types: string[] = [];
  if (skill.is_poison_debuff) types.push("poison");
  if (skill.is_disease_debuff) types.push("disease");
  if (skill.is_fire_debuff) types.push("fire");
  if (skill.is_cold_debuff) types.push("cold");
  if (skill.is_magic_debuff) types.push("magic");
  return types;
}

export function formatSkillEffect(
  skill: Skill,
  options?: SkillEffectFormatOptions,
): string {
  if (
    skill.id &&
    Object.prototype.hasOwnProperty.call(HARDCODED_EFFECTS, skill.id)
  ) {
    return HARDCODED_EFFECTS[skill.id];
  }

  // Source: server-scripts/AreaBuffSkill.cs:Apply — Evacuate sends the caster and every living, visible player within its cast range, party or not, to the city assigned to the caster's zone.
  if (skill.is_teleport) {
    return `teleports you & every player within ${formatNumber(skill.cast_range ?? 0)} yd to this zone's city, stun (1s)`;
  }

  // Source: server-scripts/TargetBuffSkill.cs:Apply — a cooldown-reduction spell shortens each remaining cooldown by its share, at most 30s, and applies no buff.
  const cooldownCut = parseLinearValue(skill.cooldown_reduction_percent);
  if (skill.skill_type === "target_buff" && cooldownCut) {
    return `cuts your remaining cooldowns by ${formatLinearPercent(cooldownCut, options)} (max 30s each)`;
  }

  // A monster's cast owes nothing to the reader's attributes.
  const notes: SummaryNotes = options?.monster ? {} : (skill.notes ?? {});
  const parts: string[] = [];

  // Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive; BardMercenarySkills.cs:CanUseFinalCadence,MaximumCombatSongs — a player Bard needs three active songs, a Bard mercenary level 50 and all three of its combat songs.
  if (skill.is_bard_final_cadence) {
    parts.push(
      skill.is_mercenary_skill
        ? "needs level 50 & 3 active songs"
        : "needs 3+ active songs",
    );
  }

  // 1. Damage and 2. healing
  if (skill.is_bard_final_cadence) {
    // Source: server-scripts/BardFinalCadenceSkill.cs:Apply — one multiplier scales both the damage and the healing, so one note covers both.
    parts.push(
      qualify(
        [
          ...formatDamage(skill, options, {}),
          ...formatHealing(skill, options, {}),
        ].join(" & "),
        notes.damage,
      ),
    );
  } else {
    if (!skill.is_manaburn_skill) {
      parts.push(...formatDamage(skill, options, notes));
    }
    // Source: server-scripts/TargetDamageSkill.cs:245-248 — pulseCount partitions finalDamage across pulses.
    if (skill.channel_pulses && skill.channel_pulses > 0) {
      parts.push(`channeled over ${skill.channel_pulses} pulses`);
    }
    parts.push(...formatHealing(skill, options, notes));
  }

  // 3. Crowd control
  parts.push(...formatCrowdControl(skill, options));

  // 4. Summons
  parts.push(...formatSummons(skill));

  // 5. Passives (special case: enrage)
  // Only monsters enrage from a passive: DealDamageAt scans monster and NPC skill
  // lists alone, and no NPC carries a skill, so a player passive with the flag
  // changes no damage.
  // Source: server-scripts/Combat.cs:783-816 (enrage scan and damage bonus, non-spell hits only)
  if (skill.skill_type === "passive" && skill.is_enrage) {
    parts.push("+50-75% non-spell dmg below 10% hp");
  }
  if (skill.is_bard_song) parts.push(qualify("Bard song", notes.is_bard_song));
  if (skill.is_bard_charm) {
    const charmedDamage = parseLinearValue(skill.charmed_damage_percent);
    // Source: server-scripts/BardCharmSongSkill.cs:IsValidCharmTarget — bosses, elites and training dummies cannot be charmed.
    parts.push(
      charmedDamage
        ? qualify(
            `charms a non-boss, non-elite monster at ${formatLinearPercent(charmedDamage, options)} of its dmg`,
            notes.charmed_damage_percent,
          )
        : "charms a non-boss, non-elite monster",
    );
  }
  if (skill.additional_active_bard_songs) {
    parts.push(`+${skill.additional_active_bard_songs} active Bard song`);
  }
  if (skill.unlimited_active_bard_songs) {
    parts.push("no active Bard song limit");
  }
  if (skill.bard_song_duration_bonus_per_level) {
    parts.push(
      `+${formatPercent(skill.bard_song_duration_bonus_per_level)} song duration per rank`,
    );
  }
  if (skill.extra_gather_item_chance) {
    parts.push(
      `${formatPercent(skill.extra_gather_item_chance)} chance for an extra gathered item`,
    );
  }
  // Source: server-scripts/FoodItem.cs:Use; Pet.cs:2122-2133 — the bonus lengthens a player's Food and Drink buffs and a mercenary's Food buffs. Festive Event Food keeps its duration.
  if (skill.food_and_drink_buff_duration_bonus_per_level) {
    parts.push(
      `+${formatPercent(skill.food_and_drink_buff_duration_bonus_per_level)} duration per rank for your food & drink buffs and your mercenaries' food buffs, not festive food`,
    );
  }

  // Source: server-scripts/NecromancerReaperFormSkill.cs:Apply — RemoveBuff when GetBuffIndexByName(nameSkill) >= 0; otherwise applies the buff.
  if (skill.is_necromancer_reaper_form) parts.push("toggle form");
  // Source: server-scripts/NecromancerPetBuffSkill.cs:HasLivingCombatPet,CheckDistance — only the Necromancer's own living companion within cast range, never a familiar or mercenary.
  if (skill.is_necromancer_pet_buff) {
    parts.push(
      `buffs your companion within ${formatNumber(skill.cast_range ?? 0)} yd`,
    );
  }
  // Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget,CheckDistance — a pet skill buff targets the active pet, companion or familiar, at any distance when it cannot buff others.
  else if (skill.skill_type === "target_buff" && skill.is_pet_skill) {
    parts.push(
      skill.can_buff_self && !skill.can_buff_others
        ? "buffs your companion or familiar"
        : `buffs your companion or familiar within ${formatNumber(skill.cast_range ?? 0)} yd`,
    );
  }
  // Source: server-scripts/AreaBuffSkill.cs:Apply,CheckDistance — a mercenary area buff reaches every active mercenary of the caster at any distance.
  if (
    skill.skill_type === "area_buff" &&
    skill.is_mercenary_skill &&
    !skill.is_bard_song
  ) {
    parts.push("buffs your mercenaries at any distance");
  }
  // Source: server-scripts/TargetBuffSkill.cs:477-482 — alsoBuffActivePet when entity == caster, living owned non-familiar/non-mercenary activePet within castRange.Get(skillLevel).
  if (skill.also_buff_active_pet) {
    parts.push(
      `${skill.can_buff_others ? "when self-cast, " : ""}also buffs your companion within ${formatNumber(skill.cast_range ?? 0)} yd`,
    );
  }
  // Source: server-scripts/BardVirtuositySkill.cs:IsDamageBonusActive,GetAdditionalDamagePercentBonus — the bonus needs three active songs and grows with each song beyond three.
  if (skill.is_bard_virtuosity) parts.push("with 3+ active songs");
  // 6. Buffs/debuffs
  // Always show buff/debuff stats (fixes bug where stats were suppressed if damage was present)
  if (
    skill.skill_type === "area_buff" ||
    skill.skill_type === "area_debuff" ||
    skill.skill_type === "target_buff" ||
    skill.skill_type === "target_debuff" ||
    skill.skill_type === "passive"
  ) {
    const buffStats = formatBuffDebuffStats(skill, options, notes);
    parts.push(...buffStats);
  }
  if (skill.is_bard_virtuosity && skill.additional_damage_percent_per_song) {
    parts.push(
      `+${formatPercent(skill.additional_damage_percent_per_song)} attack and spell power per active song beyond 3`,
    );
  }
  // Source: server-scripts/AreaBuffSkill.cs:Apply — isOnlyForMagicClasses skips Warrior and Rogue players and mercenaries.
  if (skill.skill_type === "area_buff" && skill.is_only_for_magic_classes) {
    parts.push("not Warriors or Rogues");
  }

  // Special mechanics
  // Source: server-scripts/PlayerSkills.cs:TryUse — the cast needs the target at or below RoundToInt(max Health / 4).
  if (skill.is_assassination_skill) {
    parts.push("usable at or below 25% target hp");
  }
  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; Combat.cs:DealDamageAt — Warrior and Rogue melee spends all Rage for 2 damage each, a Wizard projectile all Mana for 3 each, and both skip avoidance and mitigation.
  if (skill.is_manaburn_skill) {
    parts.push(
      skill.skill_type === "target_projectile"
        ? "spends all mana for 3 dmg per mana, ignores avoidance & mitigation"
        : "spends all rage for 2 dmg per rage, ignores avoidance & mitigation",
    );
  }

  // Add duration if present and we have stat effects. A cleanse applies no lasting effect.
  if (
    (skill.duration_base ?? 0) > 0 &&
    parts.length > 0 &&
    !skill.is_permanent &&
    !skill.is_cleanse
  ) {
    // Check if this is a buff/debuff (not damage/heal/summon)
    const hasBuffStats =
      skill.skill_type === "area_buff" ||
      skill.skill_type === "area_debuff" ||
      skill.skill_type === "target_buff" ||
      skill.skill_type === "target_debuff";

    if (hasBuffStats) {
      return `${parts.join(", ")}, ${buffDuration(skill)}`;
    }
  }

  return parts.join(", ");
}
