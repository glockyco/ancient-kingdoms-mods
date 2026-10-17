import {
  atRank,
  describeInput,
  describeRankScaling,
  formatSeconds as seconds,
  rankWorkingLines,
} from "$lib/calculation/format";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";
import {
  WISDOM,
  CONSTITUTION,
  CHARISMA,
  INTELLIGENCE,
  STRENGTH,
  DEXTERITY,
  MAX_HEALTH,
  rankInput,
  situational,
} from "$lib/calculation/inputs";
import { multiplyF32, iround } from "$lib/calculation/unity-math";
import type {
  Calculation,
  CalculationInput,
  CalculationStep,
} from "$lib/types/calculation";
import type {
  SkillDetailView,
  BuffBonusAttrSource,
  DebuffBonusAttrKind,
  HealBonusKind,
  LinearSkillField,
  LinearValue,
} from "$lib/types/skills";
import { casterInputs } from "./damage-calculations";
import {
  RANGER_ATTRIBUTE_MULTIPLIER,
  WISDOM_HEAL_CAP,
  WISDOM_HEAL_SHARE,
  attributeBuff,
  bardBonus,
  bardPower,
  songValue,
  wisdomHeal,
} from "$lib/calculation/combat";
import { hitThreat } from "$lib/calculation/combat-rules";

const zero = { base_value: 0, bonus_per_level: 0 };
function linear(skill: SkillDetailView, key: LinearSkillField): LinearValue {
  return skill[key] ?? zero;
}

/** The share of a heal each point of the caster's Wisdom adds, or null when Wisdom does not apply. */
// Source: server-scripts/TargetHealSkill.cs:137-144,273-280; AreaHealSkill.cs:101-117; Wisdom.cs:107-114 — players add 0.4% per point of Wisdom, Rangers three times that, and mercenaries 0.4% of their own. Scroll heals skip it unless a player restores a pet.
export function healWisdomShare(
  skill: SkillDetailView,
  kind: HealBonusKind,
): number | null {
  if (!skill.heals_health || kind === "none") return null;
  // Source: server-scripts/TargetHealSkill.cs:Apply,GetHealingAmount; AreaHealSkill.cs:Apply — only player-cast target pet/mercenary restoration bypasses the scroll Wisdom exclusion.
  const petRestoration =
    skill.skill_type === "target_heal" &&
    (skill.is_pet_skill || skill.is_mercenary_skill) &&
    (kind === "player_other" || kind === "player_ranger");
  if (skill.is_scroll && !petRestoration) return null;
  return kind === "player_ranger"
    ? WISDOM_HEAL_SHARE * RANGER_ATTRIBUTE_MULTIPLIER
    : WISDOM_HEAL_SHARE;
}

// Source: server-scripts/TargetHealSkill.cs:137-144,273-280; AreaHealSkill.cs:101-117; Wisdom.cs:107-114 — round the capped Wisdom bonus separately, then add the base.
// Source: server-scripts/TargetHealSkill.cs:153-174; AreaHealSkill.cs:125-150 — resource restoration uses the rank's amount without Wisdom. A critical player-cast pet restoration rolls its resource multiplier separately.
export function healingCalculation(
  skill: SkillDetailView,
  kind: HealBonusKind,
): Calculation {
  const health = !!skill.heals_health;
  const share = healWisdomShare(skill, kind);
  const wisdom = share !== null;
  const resource = health ? skill.heals_mana : null;
  const criticalResource =
    skill.skill_type === "target_heal" &&
    (skill.is_pet_skill || skill.is_mercenary_skill);
  const ranger = kind === "player_ranger";
  const inputs = casterInputs(
    [rankInput(skill.max_level), ...(wisdom ? [WISDOM] : [])],
    kind === "merc",
  );
  return {
    steps: [
      {
        name: wisdom
          ? "Skill healing"
          : health
            ? "Health restored"
            : "Mana or Rage restored",
        expression: describeRankScaling(
          (health ? skill.heals_health : skill.heals_mana) ?? zero,
          skill.max_level,
          number,
        ),
        ...(!wisdom
          ? {
              limit: `at most the recipient's missing ${health ? "Health" : "Mana or Rage"}`,
            }
          : {}),
      },
      ...(share !== null
        ? [
            {
              name: "Wisdom percentage",
              expression: `${percent(share, { decimals: 2, preserveNonzero: true })} per point of Wisdom above 0`,
              limit: `at most ${percent(WISDOM_HEAL_CAP, { decimals: 2, preserveNonzero: true })}`,
            },
            {
              name: "Wisdom healing",
              expression: "Skill healing × Wisdom percentage",
              rounding: "nearest" as const,
            },
          ]
        : []),
      ...(wisdom
        ? [
            {
              name: "Health restored",
              expression: "Skill healing + Wisdom healing",
              limit: "at most the recipient's missing Health",
            },
          ]
        : []),
      ...(resource
        ? [
            {
              name: "Mana or Rage restored",
              expression: describeRankScaling(
                resource,
                skill.max_level,
                number,
              ),
              limit: "at most the recipient's missing Mana or Rage",
            },
          ]
        : []),
    ],
    ...(kind !== "none" ? { inputs } : {}),
    example(values) {
      const rank = values.rank ?? 1;
      const base = atRank(
        (health ? skill.heals_health : skill.heals_mana) ?? zero,
        rank,
      );
      const scaled = wisdom
        ? wisdomHeal(base, values.wisdom, ranger)
        : { rawShare: 0, share: 0, bonus: 0, total: base };
      return {
        given: [
          `rank ${rank}`,
          ...(wisdom ? [`${number(values.wisdom)} Wisdom`] : []),
        ],
        result: `${number(scaled.total)} ${health ? "Health before critical heals and the missing-Health cap" : "Mana (Rage for Warrior and Rogue mercenaries), capped at what is missing"}${resource ? `, and ${number(atRank(resource, rank))} Mana (Rage for Warrior and Rogue mercenaries)${criticalResource ? " before critical pet restoration" : ""}, capped at what is missing` : ""}`,
        working: [
          ...rankWorkingLines(
            wisdom
              ? "Skill healing"
              : health
                ? "Health restored"
                : "Mana or Rage restored",
            (health ? skill.heals_health : skill.heals_mana) ?? zero,
            rank,
            number,
          ),
          ...(share !== null
            ? [
                `Wisdom percentage: ${number(Math.max(0, values.wisdom))} × ${percent(share, { decimals: 2, preserveNonzero: true })} = ${percent(scaled.rawShare, { decimals: 2, preserveNonzero: true })}${scaled.rawShare !== scaled.share ? `, limited to ${percent(scaled.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
                `Wisdom healing: ${number(base)} × ${percent(scaled.share, { decimals: 2, preserveNonzero: true })} = ${number(scaled.bonus)}, rounded`,
                `Health restored: ${number(base)} + ${number(scaled.bonus)} = ${number(scaled.total)}`,
              ]
            : []),
          ...(resource
            ? rankWorkingLines("Mana or Rage restored", resource, rank, number)
            : []),
        ],
      };
    },
  };
}

/** A listed effect an attribute can scale. */
export type Effect = {
  key: LinearSkillField;
  name: string;
  percentage?: boolean;
  chance?: boolean;
  factor?: number;
};
const resistEffects: Effect[] = [
  { key: "defense_bonus", name: "Armor Class", factor: 0.15 },
  { key: "magic_resist_bonus", name: "Magic Resist", factor: 0.15 },
  { key: "poison_resist_bonus", name: "Poison Resist", factor: 0.15 },
  { key: "fire_resist_bonus", name: "Fire Resist", factor: 0.15 },
  { key: "cold_resist_bonus", name: "Cold Resist", factor: 0.15 },
  { key: "disease_resist_bonus", name: "Disease Resist", factor: 0.15 },
];
const ordinaryEffects: Effect[] = [
  { key: "health_max_bonus", name: "Maximum Health", factor: 2 },
  ...resistEffects,
  { key: "ward_bonus", name: "Ward", factor: 2 },
  { key: "damage_shield", name: "Damage Shield", factor: 0.75 },
  { key: "healing_per_second_bonus", name: "Health per second" },
  { key: "damage_bonus", name: "Attack Power", factor: 1 },
  { key: "magic_damage_bonus", name: "Spell Power", factor: 1 },
];
const songEffects: Effect[] = [
  ...ordinaryEffects.filter((effect) => effect.key !== "damage_shield"),
  { key: "mana_max_bonus", name: "Maximum Mana" },
  { key: "energy_max_bonus", name: "Maximum Rage" },
  { key: "mana_per_second_bonus", name: "Mana per second" },
  { key: "energy_per_second_bonus", name: "Rage per second" },
  ...(
    [
      ["health_max_percent_bonus", "Maximum Health percentage"],
      ["damage_percent_bonus", "Attack Power percentage"],
      ["magic_damage_percent_bonus", "Spell Power percentage"],
      ["block_chance_bonus", "Block Chance"],
      ["fear_resist_chance_bonus", "Fear Resist"],
      ["critical_resist_bonus", "Critical Resist"],
      ["accuracy_bonus", "Accuracy"],
      ["critical_chance_bonus", "Critical Strike"],
      ["haste_bonus", "Haste"],
      ["spell_haste_bonus", "Spell Casting Haste"],
      ["health_percent_per_second_bonus", "Health percentage per second"],
      ["mana_percent_per_second_bonus", "Mana percentage per second"],
      ["energy_percent_per_second_bonus", "Rage percentage per second"],
      ["cooldown_reduction_percent", "Cooldown reduction"],
    ] satisfies [LinearSkillField, string][]
  ).map(([key, name]) => ({
    key,
    name,
    percentage: true,
    chance: [
      "block_chance_bonus",
      "fear_resist_chance_bonus",
      "critical_chance_bonus",
      // Source: server-scripts/Combat.cs:accuracy,GetProbResistMagic — Accuracy is an additive percentage-point modifier.
      "accuracy_bonus",
    ].includes(key),
  })),
];

function effectFormat(effect: Effect, value: number): string {
  if (effect.chance) {
    const points = Number((value * 100).toFixed(2));
    return `${String(points).replace(/^-/, "−")} percentage ${Math.abs(points) === 1 ? "point" : "points"}`;
  }
  return (
    effect.percentage
      ? percent(value, { decimals: 2, preserveNonzero: true })
      : number(value)
  ).replace(/^-/, "−");
}

function attributeInputs(
  source: BuffBonusAttrSource | DebuffBonusAttrKind,
): CalculationInput[] {
  if (source === "player_wis_con_cha_half")
    return [WISDOM, CONSTITUTION, CHARISMA];
  if (source === "player_wis_con_avg") return [WISDOM, CONSTITUTION];
  if (source === "player_level")
    return [
      {
        ...situational("level", "Character level", 50),
        max: 100,
        remember: true,
      },
    ];
  if (source.includes("cha")) return [CHARISMA];
  if (source.includes("int")) return [INTELLIGENCE];
  if (source === "dex") return [DEXTERITY];
  if (source === "str") return [STRENGTH];
  if (source === "none") return [];
  return [WISDOM];
}

function attributeExpression(
  source: BuffBonusAttrSource | DebuffBonusAttrKind,
): string {
  if (source === "player_wis_con_cha_half")
    return "Half of Wisdom, Constitution, and Charisma added together";
  if (source === "player_wis_con_avg")
    return "Half of Wisdom and Constitution added together";
  if (source === "player_level") return "Character level × 10";
  const name = attributeInputs(source)[0]?.label ?? "0";
  return source.startsWith("player_ranger") ? `${name} × 3` : name;
}

function attributeValue(
  source: BuffBonusAttrSource | DebuffBonusAttrKind,
  values: Record<string, number>,
): number {
  if (source === "player_wis_con_cha_half")
    return iround(
      multiplyF32(values.wisdom + values.constitution + values.charisma, 0.5),
    );
  if (source === "player_wis_con_avg")
    return iround(multiplyF32(values.wisdom + values.constitution, 0.5));
  if (source === "player_level") return values.level * 10;
  const input = attributeInputs(source)[0];
  return input
    ? values[input.key] * (source.startsWith("player_ranger") ? 3 : 1)
    : 0;
}

/** How the caster's attribute changes one listed effect of a buff or debuff. */
export interface EffectScaling {
  effect: Effect;
  /**
   * `song` multiplies by song power, `flat` adds `factor` per attribute point,
   * `healing` adds Wisdom healing (a share of the heal below 60s, `factor` per point
   * from 60s), `dot` adds `factor` per point of damage over time, and `ward`
   * adds 2 per point.
   */
  mode: "song" | "flat" | "healing" | "dot" | "ward";
  factor: number;
}

// Source: server-scripts/Buff.cs:47-258; BuffSkill.cs:230-247,464-527; Wisdom.cs:116-128; AreaBuffSkill.cs:16-18,33-58; TargetBuffSkill.cs:434-445 — which listed effects an attribute scales, and how.
/** The listed effects of a buff or debuff that its caster's attribute scales. */
export function effectScalings(
  skill: SkillDetailView,
  debuff: boolean,
): EffectScaling[] {
  const song = skill.scales_with_charisma;
  return (song ? songEffects : ordinaryEffects)
    .filter((effect) => {
      const field = linear(skill, effect.key);
      if (field.base_value === 0 && field.bonus_per_level === 0) return false;
      if (
        !song &&
        !debuff &&
        ["damage_bonus", "magic_damage_bonus"].includes(effect.key)
      )
        return skill.id === "leadership";
      if (
        !song &&
        debuff &&
        ["health_max_bonus", "ward_bonus", "damage_shield"].includes(effect.key)
      )
        return false;
      return true;
    })
    .map((effect) => {
      const field = linear(skill, effect.key);
      let mode: EffectScaling["mode"] = song ? "song" : "flat";
      let factor = effect.factor ?? 0;
      if (effect.key === "ward_bonus") mode = "ward";
      else if (effect.key === "healing_per_second_bonus") {
        if (field.base_value < 0) {
          mode = "dot";
          factor = song
            ? skill.damage_over_time_bonus_per_charisma_point
            : debuff
              ? skill.is_melee_debuff
                ? 0.5
                : (skill.is_poison_debuff || skill.is_disease_debuff) &&
                    !skill.poison_disease_scales_with_intelligence
                  ? 1.5
                  : skill.damage_over_time_bonus_per_intelligence_point
              : 0;
        } else if (!song) {
          mode = "healing";
          factor = skill.duration_base >= 60 ? 0.3 : WISDOM_HEAL_SHARE;
        }
      } else if (!song && debuff) {
        factor =
          effect.key === "damage_bonus" || effect.key === "magic_damage_bonus"
            ? 0.5
            : effect.key === "defense_bonus" && skill.is_melee_debuff
              ? 0.5
              : 0.4;
      }
      return { effect, mode, factor };
    });
}

// Source: server-scripts/Buff.cs:47-258; BuffSkill.cs:230-247,464-527; Wisdom.cs:116-128; AreaBuffSkill.cs:16-18,33-58; TargetBuffSkill.cs:434-445 — signed stat getters, separate rounded attribute bonuses, and ward contribution transformation.
export function effectScalingCalculation(
  skill: SkillDetailView,
  source: BuffBonusAttrSource | DebuffBonusAttrKind,
  debuff = false,
  mercenary = false,
): Calculation {
  const song = skill.scales_with_charisma;
  const scalings = effectScalings(skill, debuff);
  const fields = scalings.map(({ effect }) => effect);
  const average =
    source === "player_wis_con_avg" || source === "player_wis_con_cha_half";
  const ward =
    !song &&
    !debuff &&
    !!skill.ward_bonus &&
    (skill.ward_bonus.base_value !== 0 ||
      skill.ward_bonus.bonus_per_level !== 0);
  const derivedAttribute =
    average || source === "player_level" || source.startsWith("player_ranger");
  const attributeName = source.startsWith("player_ranger")
    ? `Tripled ${attributeInputs(source)[0].label}`
    : source === "player_level"
      ? "Level contribution"
      : derivedAttribute
        ? "Attribute contribution"
        : (attributeInputs(source)[0]?.label ?? "Attribute contribution");
  const contributionName = ward ? "Ward" : attributeName;
  const sourceName = ward
    ? "Ward"
    : source === "player_level"
      ? "Level"
      : attributeInputs(source)
          .map((input) => input.label)
          .join(" / ") || attributeName;
  const descriptions = scalings.map(({ effect, mode, factor }) => {
    const field = linear(skill, effect.key);
    const name =
      effect.key === "healing_per_second_bonus" && field.base_value < 0
        ? debuff
          ? "Damage per second"
          : "Health lost per second"
        : `${effect.name}${debuff && field.base_value < 0 ? " reduction" : ""}`;
    const magnitude = mode === "dot" || (debuff && field.base_value < 0);
    const displayField =
      magnitude && field.base_value < 0
        ? {
            base_value: -field.base_value,
            bonus_per_level: -field.bonus_per_level,
          }
        : field;
    const baseName =
      mode === "ward" && ward
        ? "Skill Ward"
        : mode === "dot" && factor === 0 && !song
          ? name
          : fields.length === 1
            ? "Skill amount"
            : `Skill ${name}`;
    const bonusName = `${song ? "Charisma" : sourceName} ${
      mode === "dot" ? "damage" : mode === "healing" ? "healing" : name
    }`;
    return { effect, displayField, mode, factor, name, baseName, bonusName };
  });
  // Source: server-scripts/BuffSkill.cs:ScaleHealingPerSecondBonus; Skills.cs:GetFinalDamageDoT — flat buff drains use no attribute, and additive Charisma DoT uses no song multiplier.
  const usesAttribute = descriptions.some(
    ({ mode, factor }) => song || mode !== "dot" || factor !== 0,
  );
  const usesSongMultiplier =
    song &&
    descriptions.some(
      ({ mode, factor }) =>
        mode === "song" || mode === "ward" || (mode === "dot" && factor === 0),
    );
  const inputs = casterInputs(
    [
      rankInput(skill.max_level),
      ...(usesAttribute ? attributeInputs(source) : []),
    ],
    mercenary,
  );
  const healingPercentageName = `${sourceName} percentage`;
  const steps: CalculationStep[] = [
    ...(derivedAttribute && usesAttribute
      ? [
          {
            name: attributeName,
            expression: attributeExpression(source),
            ...(average ? { rounding: "nearest" as const } : {}),
          },
        ]
      : []),
    ...(usesSongMultiplier
      ? [
          {
            name: "Charisma bonus",
            expression: "0.1% per point of Charisma above 0",
            limit: "at most 200%",
          },
        ]
      : []),
    ...(ward
      ? [
          {
            name: "Skill Ward",
            expression: describeRankScaling(
              skill.ward_bonus!,
              skill.max_level,
              number,
            ),
          },
          { name: "Ward", expression: `Skill Ward + ${attributeName} × 2` },
        ]
      : []),
  ];
  for (const {
    effect,
    displayField,
    mode,
    factor,
    name,
    baseName,
    bonusName,
  } of descriptions) {
    if (!(mode === "ward" && ward))
      steps.push({
        name: baseName,
        expression: describeRankScaling(
          displayField,
          skill.max_level,
          (value) => effectFormat(effect, value),
        ),
      });
    if (!song && (mode === "ward" || (mode === "dot" && factor === 0)))
      continue;
    if (
      mode === "song" ||
      (song && mode === "ward") ||
      (song && mode === "dot" && factor === 0)
    ) {
      steps.push({
        name,
        expression: `${baseName} × (100% + Charisma bonus)`,
        ...(!effect.percentage ? { rounding: "nearest" as const } : {}),
        ...(effect.key === "fear_resist_chance_bonus" &&
        skill.fear_resist_chance_bonus_cap > 0
          ? {
              limit: `at most ${effectFormat(effect, skill.fear_resist_chance_bonus_cap)}`,
            }
          : {}),
      });
    } else if (mode === "healing" && skill.duration_base < 60) {
      steps.push({
        name: healingPercentageName,
        expression: `0.4% per point of ${contributionName} above 0`,
        limit: "at most 500%",
      });
      steps.push({
        name: bonusName,
        expression: `${baseName} × ${healingPercentageName}`,
        rounding: "nearest",
      });
      steps.push({ name, expression: `${baseName} + ${bonusName}` });
    } else if (factor === 1 || factor === 2) {
      steps.push({
        name,
        expression: `${baseName} + ${contributionName}${factor === 2 ? " × 2" : ""}`,
      });
    } else {
      steps.push({
        name: bonusName,
        expression:
          song && mode === "dot"
            ? `${percent(factor, { decimals: 2, preserveNonzero: true })} of Charisma above 0`
            : mode === "healing"
              ? `${percent(factor, { decimals: 2, preserveNonzero: true })} of ${contributionName} above 0`
              : `${contributionName} × ${percent(factor, { decimals: 2, preserveNonzero: true })}`,
        rounding: "nearest",
      });
      steps.push({ name, expression: `${baseName} + ${bonusName}` });
    }
  }
  return {
    steps,
    inputs,
    example(values) {
      let attribute = usesAttribute ? attributeValue(source, values) : 0;
      const working: string[] = [];
      if (derivedAttribute && usesAttribute) {
        const rawInput = attributeInputs(source)[0];
        const arithmetic = average
          ? `(${number(values.wisdom)} + ${number(values.constitution)}${source === "player_wis_con_cha_half" ? ` + ${number(values.charisma)}` : ""}) ÷ 2`
          : source === "player_level"
            ? `${number(values.level)} × 10`
            : `${number(values[rawInput.key])} × 3`;
        working.push(
          `${attributeName}: ${arithmetic} = ${number(attribute)}${average ? ", rounded" : ""}`,
        );
      }
      const power = song ? bardPower(attribute) : 1;
      if (usesSongMultiplier) {
        const bonus = bardBonus(attribute);
        working.push(
          `Charisma bonus: ${number(Math.max(0, attribute))} × 0.1% = ${percent(bonus.raw, { decimals: 2, preserveNonzero: true })}${bonus.raw !== bonus.limited ? `, limited to ${percent(bonus.limited, { decimals: 2, preserveNonzero: true })}` : ""}`,
        );
      }
      if (ward) {
        const baseWard = atRank(skill.ward_bonus!, values.rank);
        working.push(
          ...rankWorkingLines(
            "Skill Ward",
            skill.ward_bonus!,
            values.rank,
            number,
          ),
        );
        const originalAttribute = attribute;
        attribute = attributeBuff(baseWard, attribute, 2).total;
        working.push(
          `Ward: ${number(baseWard)} + ${number(originalAttribute)} × 2 = ${number(attribute)}`,
        );
      }
      const results = descriptions.map(
        ({ effect, displayField, mode, factor, name, baseName, bonusName }) => {
          const base = atRank(displayField, values.rank);
          if (!(mode === "ward" && ward))
            working.push(
              ...rankWorkingLines(
                baseName,
                displayField,
                values.rank,
                (value) => effectFormat(effect, value),
              ),
            );
          let result: number;
          if (
            mode === "song" ||
            (song && mode === "ward") ||
            (song && mode === "dot" && factor === 0)
          ) {
            const raw = effect.percentage
              ? multiplyF32(base, power)
              : songValue(base, attribute).scaled;
            result =
              effect.key === "fear_resist_chance_bonus" &&
              skill.fear_resist_chance_bonus_cap > 0
                ? Math.min(raw, skill.fear_resist_chance_bonus_cap)
                : raw;
            working.push(
              `${name}: ${effectFormat(effect, base)} × ${percent(power, { decimals: 2, preserveNonzero: true })} = ${effectFormat(effect, raw)}${effect.percentage ? "" : ", rounded"}${raw !== result ? `, limited to ${effectFormat(effect, result)}` : ""}`,
            );
          } else if (mode === "ward") {
            result = attribute;
          } else if (mode === "dot" && factor === 0) {
            result = base;
          } else {
            const effectiveAttribute =
              song || mode === "healing" ? Math.max(0, attribute) : attribute;
            const shortHeal = mode === "healing" && skill.duration_base < 60;
            const healing = shortHeal
              ? wisdomHeal(base, effectiveAttribute)
              : null;
            const scaled =
              healing ?? attributeBuff(base, effectiveAttribute, factor);
            result = scaled.total;
            if (healing) {
              working.push(
                `${healingPercentageName}: ${number(effectiveAttribute)} × 0.4% = ${percent(healing.rawShare, { decimals: 2, preserveNonzero: true })}${healing.rawShare !== healing.share ? `, limited to ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
              );
              working.push(
                `${bonusName}: ${number(base)} × ${percent(healing.share, { decimals: 2, preserveNonzero: true })} = ${number(scaled.bonus)}, rounded`,
              );
            } else if (factor !== 1 && factor !== 2) {
              working.push(
                `${bonusName}: ${number(effectiveAttribute)} × ${percent(factor, { decimals: 2, preserveNonzero: true })} = ${number(scaled.bonus)}, rounded`,
              );
            }
            const addition =
              factor === 1 || factor === 2
                ? `${number(effectiveAttribute)}${factor === 2 ? " × 2" : ""}`
                : number(scaled.bonus);
            working.push(
              `${name}: ${number(base)} + ${addition} = ${number(result)}`,
            );
          }
          return `${effectFormat(effect, result)} ${mode === "dot" && debuff ? "Damage per second before the target's resistance" : name}`;
        },
      );
      return {
        given: inputs.map((input) => describeInput(input, values[input.key])),
        result: results.join(", "),
        working,
      };
    },
  };
}

/** The hit the threat example adds, standing in for the skill's damage before defenses. */
const EXAMPLE_HIT_DAMAGE = 200;

// Source: server-scripts/Combat.cs:DealDamageAt; TargetDamageSkill.cs:ApplyDamage — positive explicit threat adds the caster's maximum Health, hit damage and separately rounded control terms, capped at target current Health.
// Source: server-scripts/AreaDamageSkill.cs:Apply — projectile delivery omits the Health contribution.
export function aggroCalculation(
  skill: SkillDetailView,
  caster: "player" | "mercenary" | "other" = skill.player_classes.length > 0
    ? "player"
    : "other",
): Calculation {
  const direct =
    skill.skill_type === "target_damage" ||
    (skill.skill_type === "area_damage" &&
      !skill.is_bard_final_cadence &&
      !skill.area_projectile);
  const dealsDamage = !!(
    hasNonZeroField(skill.damage) ||
    hasNonZeroField(skill.damage_percent) ||
    skill.is_manaburn_skill ||
    skill.is_assassination_skill
  );
  const stuns = hasNonZeroField(skill.stun_chance);
  const fears = hasNonZeroField(skill.fear_chance);
  const owner =
    caster === "player"
      ? "Your"
      : caster === "mercenary"
        ? "The mercenary's"
        : "The caster's";
  const inputs = casterInputs(
    [
      // Source: server-scripts/PetSkills.cs:RefreshSkillLevels — level 50 and 20 veteran points give rank 12; the skill page's Mercenary Ranks section exposes the full rule.
      ...(skill.max_level > 1
        ? [
            {
              ...rankInput(skill.max_level),
              ...(caster === "mercenary"
                ? { value: Math.min(skill.max_level, 12) }
                : {}),
            },
          ]
        : []),
      // The hit's damage before defenses is the Skill Damage result, so the example states one
      // fixed hit instead of asking for a number the reader cannot see.
      ...(direct ? [MAX_HEALTH] : []),
    ],
    caster === "mercenary",
  );
  const terms = [
    "Skill threat",
    ...(direct ? ["Health contribution"] : []),
    ...(dealsDamage ? ["damage before defenses"] : []),
    ...(stuns ? ["Stun threat"] : []),
    ...(fears ? ["Fear threat"] : []),
  ];
  return {
    steps: [
      {
        name: "Skill threat",
        expression: describeRankScaling(skill.aggro!, skill.max_level, number),
      },
      ...(stuns
        ? [
            {
              name: "Stun threat",
              expression: "Stun chance × stun duration in seconds × 10",
              rounding: "nearest" as const,
            },
          ]
        : []),
      ...(fears
        ? [
            {
              name: "Fear threat",
              expression: "Fear chance × fear duration in seconds × 10",
              rounding: "nearest" as const,
            },
          ]
        : []),
      ...(direct
        ? [
            {
              name: "Health contribution",
              expression: `${owner} maximum Health`,
            },
          ]
        : []),
      {
        name: "Threat added",
        expression: terms.join(" + "),
        limit: "at most the target's current Health",
      },
    ],
    note:
      [
        ...(caster === "mercenary" && skill.max_level > 1
          ? [
              "Use the rank from Mercenary Skill Rank on this page. The examples use the same owner level and veteran points.",
            ]
          : []),
        ...(dealsDamage && caster !== "other"
          ? [
              `Damage before defenses is the result of Skill Damage above. The example uses a ${number(EXAMPLE_HIT_DAMAGE)}-damage hit.`,
            ]
          : []),
        ...(skill.skill_type === "area_damage" && skill.area_projectile
          ? [
              "This skill's hits travel as projectiles, which add no Health contribution.",
            ]
          : []),
      ].join(" ") || undefined,
    ...(caster !== "other" ? { inputs } : {}),
    example(values) {
      if (caster === "other")
        values = {
          rank: skill.max_level,
          maxHealth: MAX_HEALTH.value,
        };
      const rank = values.rank ?? 1;
      const aggro = atRank(skill.aggro!, rank);
      const stunChance = atRank(skill.stun_chance ?? zero, rank);
      const stunTime = atRank(skill.stun_time ?? zero, rank);
      const fearChance = atRank(skill.fear_chance ?? zero, rank);
      const fearTime = atRank(skill.fear_time ?? zero, rank);
      const health = direct && aggro > 0 ? values.maxHealth : 0;
      const damage = dealsDamage ? EXAMPLE_HIT_DAMAGE : 0;
      const threat = hitThreat(
        aggro,
        health,
        damage,
        stunChance,
        stunTime,
        fearChance,
        fearTime,
        Infinity,
      );
      const amounts = [
        aggro,
        ...(direct ? [health] : []),
        ...(dealsDamage ? [damage] : []),
        ...(stuns ? [threat.stun] : []),
        ...(fears ? [threat.fear] : []),
      ];
      return {
        given:
          caster === "other"
            ? [
                ...(skill.max_level > 1 ? [`rank ${rank}`] : []),
                ...(dealsDamage
                  ? [`a ${number(damage)}-damage hit before defenses`]
                  : []),
                ...(direct
                  ? [`the caster's ${number(values.maxHealth)} maximum Health`]
                  : []),
              ]
            : [
                ...inputs.map((input) =>
                  describeInput(input, values[input.key] ?? rank),
                ),
                ...(dealsDamage
                  ? [`a ${number(damage)}-damage hit before defenses`]
                  : []),
              ],
        result: `${number(threat.total)} threat before the target's current-Health cap`,
        working: [
          ...rankWorkingLines("Skill threat", skill.aggro!, rank, number),
          ...(stuns
            ? [
                `Stun threat: ${percent(stunChance, { decimals: 2, preserveNonzero: true })} × ${seconds(stunTime)} × 10 = ${number(threat.stun)}, rounded`,
              ]
            : []),
          ...(fears
            ? [
                `Fear threat: ${percent(fearChance, { decimals: 2, preserveNonzero: true })} × ${seconds(fearTime)} × 10 = ${number(threat.fear)}, rounded`,
              ]
            : []),
          ...(direct && health === 0
            ? [`Health contribution: 0, because Skill threat is not above 0`]
            : []),
          `Threat added: ${amounts.map((value) => number(value)).join(" + ")} = ${number(threat.total)}`,
        ],
      };
    },
  };
}
