import {
  atRank,
  describeInput,
  describeRankScaling,
  formatNumber as number,
  formatPercent as percent,
  rankWorkingLines,
} from "$lib/calculation/format";
import {
  DAMAGE,
  MAGIC_DAMAGE,
  DEXTERITY,
  CHARISMA,
  rankInput,
  situational,
} from "$lib/calculation/inputs";
import {
  addF32,
  multiplyF32,
  iround,
  ceilToInt,
  clamp,
} from "$lib/calculation/unity-math";
import type {
  Calculation,
  CalculationInput,
  CalculationStep,
} from "$lib/types/calculation";
import type {
  Caster,
  DamageContext,
  DamageDeduction,
  DamageFormulaKind,
  SkillDetailView,
} from "$lib/types/skills";
import { ACTIVE_SONGS, melodyBonus } from "$lib/calculation/bard";
import { bardBonus, bardPower, songValue } from "$lib/calculation/combat";
import { ALL_CLASS_IDS, formatClassName } from "$lib/utils/classes";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";
import { damageFormulaStats } from "$lib/utils/skillMechanics";

/** Attribute a calculation's quantities to a mercenary instead of the reader, so its values are labelled as the mercenary's and never remembered as the reader's. */
export function casterInputs(
  inputs: CalculationInput[],
  mercenary: boolean,
): CalculationInput[] {
  return mercenary
    ? inputs.map((input) =>
        input.options
          ? input
          : {
              ...input,
              label: `Mercenary's ${input.label}`,
              phrase: input.phrase ?? input.label,
              owner: "the mercenary",
              remember: false,
            },
      )
    : inputs;
}

/** Whether a caster group's values belong to a mercenary rather than the reader. */
export function isMercenaryGroup(casters: Caster[]): boolean {
  return casters.some((caster) => caster.kind === "mercenary");
}

/** Share one calculation for identical player contexts, without mixing remembered player values with mercenary values. */
export function calculationCasters(
  casters: Caster[],
  skill?: SkillDetailView,
): Caster[][] {
  const groups = new Map<string, Caster[]>();
  for (const caster of casters) {
    let key: string =
      caster.kind === "player" || caster.kind === "any_player"
        ? "player"
        : caster.kind === "mercenary" || caster.kind === "weapon_effect"
          ? caster.kind
          : "other";
    if (caster.kind === "player" && skill) {
      if (
        caster.classId === "ranger" &&
        ["target_damage", "frontal_damage"].includes(skill.skill_type)
      )
        key = "ranger";
      else if (
        caster.classId === "rogue" &&
        skill.skill_type === "target_damage"
      )
        key = "rogue";
    }
    const group = groups.get(key) ?? [];
    group.push(caster);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function casterName(caster: Caster): string {
  switch (caster.kind) {
    case "player":
      return `${formatClassName(caster.classId)} (player)`;
    case "any_player":
      return "Player";
    case "mercenary":
      return `${caster.className} mercenary`;
    case "weapon_effect":
      return "Player or mercenary (weapon effect on hit)";
    case "monster":
      return "Monster or NPC";
    case "companion":
      return "Companion";
    case "familiar":
      return "Familiar";
  }
}

const CLASS_LIST = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

/** Name a caster group, listing player classes without repeating their caster category on every name. */
export function calculationCasterLabel(casters: Caster[]): string {
  const classIds = casters.flatMap((caster) =>
    caster.kind === "player" ? [caster.classId] : [],
  );
  if (classIds.length < casters.length)
    return casters.map(casterName).join(", ");
  if (ALL_CLASS_IDS.every((id) => classIds.includes(id))) return "Players";
  classIds.sort(
    (first, second) =>
      ALL_CLASS_IDS.indexOf(first as (typeof ALL_CLASS_IDS)[number]) -
      ALL_CLASS_IDS.indexOf(second as (typeof ALL_CLASS_IDS)[number]),
  );
  return CLASS_LIST.format(classIds.map(formatClassName));
}

/** The handler's character-window stats, before its skill-specific additions and deductions. Dexterity shares are separate calculation steps. */
export function damageStatInputs(
  skill: SkillDetailView,
  kind: DamageFormulaKind,
): CalculationInput[] {
  return damageFormulaStats(skill, kind).flatMap((stat) =>
    stat === "spell_power"
      ? [MAGIC_DAMAGE]
      : stat === "attack_power"
        ? [DAMAGE]
        : [],
  );
}

// Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the Mercenary Skill Rank example uses owner level 50 and 20 total veteran points, giving rank 12 before the cap.
function damageRankInputs(
  skill: SkillDetailView,
  mercenary = false,
): CalculationInput[] {
  if (skill.max_level <= 1) return [];
  const input = rankInput(skill.max_level);
  return [
    {
      ...input,
      value: mercenary ? Math.min(skill.max_level, 12) : input.value,
    },
  ];
}

// Source: server-scripts/BardFinalCadenceSkill.cs:67-70 — round Charisma scaling, then round Melody scaling independently.
export function cadenceCalculation(
  skill: SkillDetailView,
  mercenary: boolean,
): Calculation {
  const amounts = [
    {
      field: skill.damage!,
      baseName: "Skill damage",
      scaledName: mercenary ? "Damage before defenses" : "Damage before Melody",
      finalName: "Damage before defenses",
    },
    {
      field: skill.heals_health!,
      baseName: "Skill healing",
      scaledName: mercenary ? "Healing" : "Healing before Melody",
      finalName: "Healing",
    },
  ];
  const inputs = casterInputs(
    [
      ...damageRankInputs(skill, mercenary),
      CHARISMA,
      ...(!mercenary ? [ACTIVE_SONGS] : []),
    ],
    mercenary,
  );
  return {
    steps: [
      ...amounts.map((amount) => ({
        name: amount.baseName,
        expression: describeRankScaling(amount.field, skill.max_level, number),
      })),
      {
        name: "Song power",
        expression: "100% + 0.1% per point of Charisma above 0",
        limit: "at most 300%",
      },
      ...amounts.map((amount) => ({
        name: amount.scaledName,
        expression: `${amount.baseName} × Song power`,
        rounding: "nearest" as const,
      })),
      ...(!mercenary
        ? [
            {
              name: "Melody bonus",
              expression:
                "3 active songs give 0%, 4 give 15%, 5 give 25%, and 6 or more give 30%",
            },
            ...amounts.map((amount) => ({
              name: amount.finalName,
              expression: `${amount.scaledName} × (100% + Melody bonus)`,
              rounding: "nearest" as const,
            })),
          ]
        : []),
    ],
    inputs,
    example(values) {
      const rank = values.rank ?? 1;
      const melody = mercenary ? 0 : melodyBonus(values.songs);
      const evaluated = amounts.map((amount) => ({
        ...amount,
        base: atRank(amount.field, rank),
        value: songValue(atRank(amount.field, rank), values.charisma, melody),
      }));
      const power = evaluated[0].value.power;
      const bonus = bardBonus(values.charisma);
      const working = evaluated.flatMap((amount) =>
        rankWorkingLines(amount.baseName, amount.field, rank, number),
      );
      working.push(
        `Song power: 100% + ${number(Math.max(0, values.charisma))} × 0.1% = ${percent(addF32(1, bonus.raw))}${bonus.raw !== bonus.limited ? `, limited to ${percent(power)}` : ""}`,
      );
      for (const amount of evaluated)
        working.push(
          `${amount.scaledName}: ${number(amount.base)} × ${percent(power)} = ${number(amount.value.scaled)}, rounded`,
        );
      if (!mercenary) {
        working.push(
          `Melody bonus: ${number(values.songs)} active songs = ${percent(melody)}`,
        );
        for (const amount of evaluated)
          working.push(
            `${amount.finalName}: ${number(amount.value.scaled)} × ${percent(addF32(1, melody))} = ${number(amount.value.total)}, rounded`,
          );
      }
      return {
        given: inputs.map((input) => describeInput(input, values[input.key])),
        result: `${number(evaluated[0].value.total)} damage before the target's defenses and ${number(evaluated[1].value.total)} Health restored before critical heals and the missing-Health cap`,
        working,
      };
    },
  };
}

// Source: server-scripts/TargetDamageSkill.cs:223-232; FrontalDamageSkill.cs:60-93; TargetProjectileSkill.cs:Apply — a Ranger's single-target and frontal melee lose the bow's Base Damage, a Rogue's single-target melee half the off-hand's (rounded up), and a player's bow shot the main-hand weapon's while it has durability.
/** The Base Damage deductions a damage formula applies for these casters. */
export function damageDeductions(
  skill: Pick<SkillDetailView, "skill_type" | "is_scroll">,
  casters: Caster[],
  kind: DamageFormulaKind,
): DamageDeduction[] {
  if (skill.is_scroll) return [];
  const playerClass = (classId: string) =>
    casters.some(
      (caster) => caster.kind === "player" && caster.classId === classId,
    );
  return [
    ...(playerClass("ranger") &&
    ["target_damage", "frontal_damage"].includes(skill.skill_type)
      ? (["bow"] as const)
      : []),
    ...(playerClass("rogue") && skill.skill_type === "target_damage"
      ? (["off_hand_half"] as const)
      : []),
    ...(kind === "ranged_player" ? (["main_hand"] as const) : []),
  ];
}

// Source: server-scripts/TargetDamageSkill.cs:156-242; TargetProjectileSkill.cs:181-219; FrontalDamageSkill.cs:60-102; AreaDamageSkill.cs:85-106; FrontalProjectilesSkill.cs:94-114,156 — handler-specific character contribution and skill amount.
export function damageCalculation(
  skill: SkillDetailView,
  context: DamageContext,
  casters: Caster[],
): Calculation {
  const kind = context.formula;
  const mercenary = isMercenaryGroup(casters);
  if (kind === "bard_final_cadence" || kind === "bard_final_cadence_merc")
    return cadenceCalculation(skill, mercenary);
  if (kind === "manaburn") {
    const resource = skill.skill_type === "target_projectile" ? "Mana" : "Rage";
    const factor = resource === "Mana" ? 3 : 2;
    return {
      steps: [
        {
          name: "Damage before defenses",
          expression: `Current ${resource} × ${factor}. Spends all current ${resource}`,
        },
      ],
      inputs: [situational("resource", `Current ${resource}`, 100)],
      example: (values) => ({
        given: [`${number(values.resource)} current ${resource}`],
        result: `${number(values.resource * factor)} damage before the target's defenses`,
        working: [
          `Damage before defenses: ${number(values.resource)} × ${factor} = ${number(values.resource * factor)}`,
        ],
      }),
    };
  }
  const other = kind === "monster_melee" || kind === "monster_magic";
  const statInputs = damageStatInputs(skill, kind);
  const magic = statInputs[0]?.key === MAGIC_DAMAGE.key;
  const weaponMagic = statInputs.length === 2;
  const dexterity = [
    "poison_rogue",
    "ranged_player",
    "ranged_player_frontal",
    "ranged_merc",
  ].includes(kind);
  const dexterityFactor = kind === "poison_rogue" ? 2.5 : 1.5;
  const baseDamageDeductions = damageDeductions(skill, casters, kind);
  const subtractBow = baseDamageDeductions.includes("bow");
  const subtractOffhand = baseDamageDeductions.includes("off_hand_half");
  const subtractMelee = baseDamageDeductions.includes("main_hand");
  const scroll = skill.is_scroll;
  const multiplied =
    skill.skill_type !== "frontal_projectiles" &&
    hasNonZeroField(skill.damage_percent);
  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — the rank multiplier applies only while it is above 0.
  const multiplierCanLapse =
    multiplied &&
    (atRank(skill.damage_percent!, 1) <= 0 ||
      atRank(skill.damage_percent!, skill.max_level) <= 0);
  // Source: server-scripts/PlayerSkills.cs:StartCast,UpdateChannel; TargetDamageSkill.cs:245-248 — only a player channels; each pulse deals the full damage divided by the pulse count, and the first (damage mod pulses) pulses deal 1 more.
  const pulses = casters.every(
    (caster) => caster.kind === "player" || caster.kind === "any_player",
  )
    ? skill.channel_pulses
    : 0;
  const channeled = pulses > 1;
  const totalName = channeled ? "Total damage" : "Damage before defenses";
  const inputs = casterInputs(
    [
      ...damageRankInputs(skill, mercenary),
      ...(!scroll
        ? [
            ...statInputs,
            ...(dexterity ? [DEXTERITY] : []),
            ...(subtractBow
              ? [
                  {
                    ...situational("bowDamage", "Bow's Base Damage", 30),
                    phrase: "bow Base Damage",
                  },
                ]
              : []),
            ...(subtractOffhand
              ? [
                  {
                    ...situational(
                      "offhandDamage",
                      "Off-hand weapon's Base Damage",
                      31,
                    ),
                    phrase: "off-hand weapon Base Damage",
                  },
                ]
              : []),
            ...(subtractMelee
              ? [
                  {
                    ...situational(
                      "meleeDamage",
                      "Main-hand weapon's Base Damage",
                      30,
                    ),
                    phrase: "main-hand weapon Base Damage",
                  },
                ]
              : []),
          ]
        : []),
    ],
    mercenary,
  );
  const terms = [
    ...(!scroll
      ? [
          magic ? "Spell Power" : "Attack Power",
          ...(weaponMagic ? ["Attack Power"] : []),
          ...(dexterity ? ["Dexterity contribution"] : []),
        ]
      : []),
    ...(skill.damage ? ["Skill damage"] : []),
  ];
  const deductions = !scroll
    ? `${subtractBow ? " − bow Base Damage" : ""}${subtractOffhand ? " − Off-hand deduction" : ""}${subtractMelee ? " − main-hand weapon Base Damage" : ""}`
    : "";
  const arithmetic = `${terms.join(" + ") || "0"}${deductions}`;
  const operationCount =
    terms.length +
    (!scroll && subtractBow ? 1 : 0) +
    (!scroll && subtractOffhand ? 1 : 0) +
    (!scroll && subtractMelee ? 1 : 0);
  const combinedStep = multiplied && operationCount > 1;
  const flatOnly = !multiplied && scroll && !!skill.damage;
  const baseName = flatOnly ? totalName : "Skill damage";
  const steps: CalculationStep[] = [
    ...(!scroll && dexterity
      ? [
          {
            name: "Dexterity contribution",
            expression: `${percent(dexterityFactor)} of Dexterity above 0`,
            rounding: "nearest" as const,
          },
        ]
      : []),
    ...(!scroll && subtractOffhand
      ? [
          {
            name: "Off-hand deduction",
            expression: "Off-hand weapon's Base Damage × 50%",
            rounding: "up" as const,
          },
        ]
      : []),
    ...(skill.damage
      ? [
          {
            name: baseName,
            expression: describeRankScaling(
              skill.damage,
              skill.max_level,
              number,
            ),
          },
        ]
      : []),
    ...(combinedStep
      ? [{ name: "Combined damage", expression: arithmetic }]
      : []),
    ...(multiplied
      ? [
          {
            name: "Damage %",
            expression: `${describeRankScaling(skill.damage_percent!, skill.max_level, percent)}${multiplierCanLapse ? ". A Damage % of 0 or less is not applied" : ""}`,
          },
        ]
      : []),
    ...(!flatOnly
      ? [
          {
            name: totalName,
            expression: multiplied
              ? `${combinedStep ? "Combined damage" : arithmetic} × Damage %${multiplierCanLapse ? ` when it is above 0. Otherwise use ${combinedStep ? "Combined damage" : arithmetic}` : ""}`
              : arithmetic,
            ...(multiplied ? { rounding: "nearest" as const } : {}),
          },
        ]
      : []),
    ...(channeled
      ? [
          {
            name: "Damage per pulse",
            expression: `${totalName} ÷ ${pulses}, rounded down, plus 1 on each of the first pulses until the ${pulses} pulses add up to ${totalName}`,
          },
        ]
      : []),
  ];
  return {
    steps,
    ...(!other ? { inputs } : {}),
    example(values) {
      // Source: server-scripts/MonsterSkills.cs:OnStartServer; Skill.cs:Skill — monster and NPC skills start at rank 1 when learnDefault, otherwise rank 0.
      const rank = other ? (skill.learn_default ? 1 : 0) : (values.rank ?? 1);
      const base = atRank(
        skill.damage ?? { base_value: 0, bonus_per_level: 0 },
        rank,
      );
      const multiplier = multiplied ? atRank(skill.damage_percent!, rank) : 0;
      const usesCharacter =
        !scroll &&
        (base > 0 ||
          (skill.skill_type !== "frontal_projectiles" && multiplier > 0));
      const main = usesCharacter
        ? other
          ? 200
          : magic
            ? values.magicDamage
            : values.damage
        : 0;
      const physical =
        usesCharacter && weaponMagic ? (other ? 200 : values.damage) : 0;
      const dex =
        usesCharacter && dexterity
          ? iround(multiplyF32(Math.max(0, values.dexterity), dexterityFactor))
          : 0;
      const offhand =
        usesCharacter && subtractOffhand
          ? ceilToInt(multiplyF32(values.offhandDamage, 0.5))
          : 0;
      const bow = usesCharacter && subtractBow ? values.bowDamage : 0;
      const melee = usesCharacter && subtractMelee ? values.meleeDamage : 0;
      const combined = main + physical + dex + base - offhand - bow - melee;
      const result =
        multiplier > 0 ? iround(multiplyF32(combined, multiplier)) : combined;
      const share = channeled ? Math.trunc(result / pulses) : result;
      const extra = channeled ? result % pulses : 0;
      const pulseDamage = Array.from(
        { length: channeled ? pulses : 0 },
        (_, index) => number(share + (index < extra ? 1 : 0)),
      );
      const numberTerms = [
        ...(!scroll
          ? [
              number(main),
              ...(weaponMagic ? [number(physical)] : []),
              ...(dexterity ? [number(dex)] : []),
            ]
          : []),
        ...(skill.damage ? [number(base)] : []),
      ];
      const numberArithmetic = `${numberTerms.join(" + ") || "0"}${!scroll && subtractBow ? ` − ${number(bow)}` : ""}${!scroll && subtractOffhand ? ` − ${number(offhand)}` : ""}${!scroll && subtractMelee ? ` − ${number(melee)}` : ""}`;
      const working = [
        ...(!scroll && dexterity && usesCharacter
          ? [
              `Dexterity contribution: ${number(Math.max(0, values.dexterity))} × ${percent(dexterityFactor)} = ${number(dex)}, rounded`,
            ]
          : []),
        ...(!scroll && subtractOffhand && usesCharacter
          ? [
              `Off-hand deduction: ${number(values.offhandDamage)} × 50% = ${number(offhand)}, rounded up`,
            ]
          : []),
        ...(skill.damage
          ? rankWorkingLines(baseName, skill.damage, rank, number)
          : []),
        ...(combinedStep
          ? [`Combined damage: ${numberArithmetic} = ${number(combined)}`]
          : []),
        ...(multiplied
          ? rankWorkingLines("Damage %", skill.damage_percent!, rank, percent)
          : []),
        ...(multiplier > 0
          ? [
              `${totalName}: ${number(combined)} × ${percent(multiplier)} = ${number(result)}, rounded`,
            ]
          : !flatOnly && operationCount > 1
            ? [`${totalName}: ${numberArithmetic} = ${number(result)}`]
            : []),
        ...(channeled
          ? [
              extra > 0
                ? `Damage per pulse: ${number(result)} ÷ ${pulses} = ${number(share)}, rounded down, plus 1 on the first ${extra === 1 ? "pulse" : `${extra} pulses`} = ${pulseDamage.join(", ")}`
                : `Damage per pulse: ${number(result)} ÷ ${pulses} = ${number(share)}`,
            ]
          : []),
      ];
      return {
        given: other
          ? [
              `the caster's 200 ${magic ? "Spell Power" : "Attack Power"}${weaponMagic ? " and 200 Attack Power" : ""}`,
              ...((skill.damage?.bonus_per_level ?? 0) !== 0 ||
              (multiplied && skill.damage_percent!.bonus_per_level !== 0)
                ? [`rank ${rank}`]
                : []),
            ]
          : inputs.map((input) => describeInput(input, values[input.key])),
        result: channeled
          ? `Pulses deal ${pulseDamage.slice(0, -1).join(", ")} and ${pulseDamage.at(-1)} damage before the target's defenses`
          : `${number(result)} damage before the target's defenses`,
        working,
      };
    },
  };
}

// Source: server-scripts/BardCharmSongSkill.cs:61-64 — GetCharmedDamageMultiplier clamps the Charisma-scaled charmedDamagePercent to at most 1.
export function charmDamageCalculation(skill: SkillDetailView): Calculation {
  return {
    steps: [
      {
        name: "Base damage share",
        expression: describeRankScaling(
          skill.charmed_damage_percent!,
          skill.max_level,
          percent,
        ),
      },
      {
        name: "Song power",
        expression: "100% + 0.1% per point of Charisma above 0",
        limit: "at most 300%",
      },
      {
        name: "Charmed monster's damage",
        expression: "Base damage share × Song power",
        limit: "at most 100% of its ordinary damage",
      },
    ],
    inputs: [...damageRankInputs(skill), CHARISMA],
    example(values) {
      const rank = values.rank ?? 1;
      const base = atRank(skill.charmed_damage_percent!, rank);
      const power = bardPower(values.charisma);
      const bonus = bardBonus(values.charisma);
      const raw = multiplyF32(base, power);
      const result = clamp(raw, 0, 1);
      return {
        given: [
          ...(skill.max_level > 1 ? [`rank ${rank}`] : []),
          `${number(values.charisma)} Charisma`,
        ],
        result: `The charmed monster deals ${percent(result)} of its ordinary damage`,
        working: [
          ...rankWorkingLines(
            "Base damage share",
            skill.charmed_damage_percent!,
            rank,
            percent,
          ),
          `Song power: 100% + ${number(Math.max(0, values.charisma))} × 0.1% = ${percent(addF32(1, bonus.raw))}${bonus.raw !== bonus.limited ? `, limited to ${percent(power)}` : ""}`,
          `Charmed monster's damage: ${percent(base)} × ${percent(power)} = ${percent(raw)}${raw !== result ? `, limited to ${percent(result)}` : ""}`,
        ],
      };
    },
  };
}
