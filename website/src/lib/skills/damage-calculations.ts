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
} from "$lib/planner/engine-math";
import type {
  Calculation,
  CalculationInput,
  CalculationStep,
} from "$lib/types/calculation";
import type {
  Caster,
  DamageContext,
  DamageFormulaKind,
  SkillDetailView,
} from "$lib/types/skills";
import { melodyBonus } from "$lib/calculation/bard";
import { bardBonus, bardPower, songValue } from "$lib/calculation/combat";
import { ALL_CLASS_IDS, formatClassName } from "$lib/utils/classes";
import { hasNonZeroField } from "$lib/utils/formatSkillEffect";

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

const MAGIC_KINDS: Partial<Record<DamageFormulaKind, true>> = {
  magic_spell: true,
  magic_weapon: true,
  magic_weapon_ranger: true,
  monster_magic: true,
};

/** The handler's character-window stats, before its skill-specific additions and deductions. */
export function damageStatInputs(
  skill: SkillDetailView,
  kind: DamageFormulaKind,
): CalculationInput[] {
  if (
    skill.is_scroll ||
    kind === "manaburn" ||
    kind === "bard_final_cadence" ||
    kind === "bard_final_cadence_merc"
  )
    return [];
  const magic = !!MAGIC_KINDS[kind];
  const weaponMagic =
    kind === "magic_weapon" ||
    kind === "magic_weapon_ranger" ||
    (kind === "monster_magic" &&
      skill.damage_type === "Magic" &&
      !skill.is_spell &&
      !!skill.required_weapon_category?.startsWith("Weapon") &&
      ["target_damage", "target_projectile", "frontal_damage"].includes(
        skill.skill_type,
      ));
  return [magic ? MAGIC_DAMAGE : DAMAGE, ...(weaponMagic ? [DAMAGE] : [])];
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
      rankInput(skill.max_level),
      CHARISMA,
      ...(!mercenary
        ? [
            situational(
              "songs",
              "Distinct manual songs in the last 40 seconds",
              4,
            ),
          ]
        : []),
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
        name: "Charisma bonus",
        expression: "0.1% per point of Charisma above 0",
        limit: "at most 200%",
      },
      ...amounts.map((amount) => ({
        name: amount.scaledName,
        expression: `${amount.baseName} × (100% + Charisma bonus)`,
        rounding: "nearest" as const,
      })),
      ...(!mercenary
        ? [
            {
              name: "Melody bonus",
              expression:
                "0–3 distinct manual songs give 0%, 4 give 15%, 5 give 25%, and 6 or more give 30%",
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
      const melody = mercenary ? 0 : melodyBonus(values.songs);
      const evaluated = amounts.map((amount) => ({
        ...amount,
        base: atRank(amount.field, values.rank),
        value: songValue(
          atRank(amount.field, values.rank),
          values.charisma,
          melody,
        ),
      }));
      const power = evaluated[0].value.power;
      const bonus = bardBonus(values.charisma);
      const working = evaluated.flatMap((amount) =>
        rankWorkingLines(amount.baseName, amount.field, values.rank, number),
      );
      working.push(
        `Charisma bonus: ${number(Math.max(0, values.charisma))} × 0.1% = ${percent(bonus.raw)}${bonus.raw !== bonus.limited ? `, limited to ${percent(bonus.limited)}` : ""}`,
      );
      for (const amount of evaluated)
        working.push(
          `${amount.scaledName}: ${number(amount.base)} × ${percent(power)} = ${number(amount.value.scaled)}, rounded`,
        );
      if (!mercenary) {
        working.push(
          `Melody bonus: ${number(values.songs)} distinct manual songs = ${percent(melody)}`,
        );
        for (const amount of evaluated)
          working.push(
            `${amount.finalName}: ${number(amount.value.scaled)} × ${percent(addF32(1, melody))} = ${number(amount.value.total)}, rounded`,
          );
      }
      return {
        given: inputs.map((input) => describeInput(input, values[input.key])),
        result: `${number(evaluated[0].value.total)} damage before the target's defenses and ${number(evaluated[1].value.total)} Health restored before critical healing and missing-Health limits`,
        working,
      };
    },
  };
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
  const playerClass = (classId: string) =>
    casters.some(
      (caster) => caster.kind === "player" && caster.classId === classId,
    );
  const subtractBow =
    playerClass("ranger") &&
    ["target_damage", "frontal_damage"].includes(skill.skill_type);
  const subtractOffhand =
    playerClass("rogue") && skill.skill_type === "target_damage";
  const subtractMelee = kind === "ranged_player";
  const scroll = skill.is_scroll;
  const multiplied =
    skill.skill_type !== "frontal_projectiles" &&
    hasNonZeroField(skill.damage_percent);
  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — the rank multiplier applies only while it is above 0.
  const multiplierCanLapse =
    multiplied &&
    (atRank(skill.damage_percent!, 1) <= 0 ||
      atRank(skill.damage_percent!, skill.max_level) <= 0);
  const inputs = casterInputs(
    [
      rankInput(skill.max_level),
      ...(!scroll
        ? [
            ...statInputs,
            ...(dexterity ? [DEXTERITY] : []),
            ...(subtractBow
              ? [
                  {
                    ...situational("bowDamage", "Bow weapon damage", 30),
                    phrase: "bow weapon damage",
                  },
                ]
              : []),
            ...(subtractOffhand
              ? [
                  {
                    ...situational(
                      "offhandDamage",
                      "Off-hand weapon damage",
                      31,
                    ),
                    phrase: "off-hand weapon damage",
                  },
                ]
              : []),
            ...(subtractMelee
              ? [
                  {
                    ...situational(
                      "meleeDamage",
                      "Equipped melee weapon damage",
                      30,
                    ),
                    phrase: "equipped melee weapon damage",
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
          magic ? "Magic Damage" : "Damage",
          ...(weaponMagic ? ["Damage"] : []),
          ...(dexterity ? ["Dexterity contribution"] : []),
        ]
      : []),
    ...(skill.damage ? ["Skill damage"] : []),
  ];
  const deductions = !scroll
    ? `${subtractBow ? " − bow weapon damage" : ""}${subtractOffhand ? " − Off-hand deduction" : ""}${subtractMelee ? " − equipped melee weapon damage" : ""}`
    : "";
  const arithmetic = `${terms.join(" + ") || "0"}${deductions}`;
  const operationCount =
    terms.length +
    (!scroll && subtractBow ? 1 : 0) +
    (!scroll && subtractOffhand ? 1 : 0) +
    (!scroll && subtractMelee ? 1 : 0);
  const combinedStep = multiplied && operationCount > 1;
  const flatOnly = !multiplied && scroll && !!skill.damage;
  const baseName = flatOnly ? "Damage before defenses" : "Skill damage";
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
            expression: "Off-hand weapon damage × 50%",
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
            name: "Rank multiplier",
            expression: `${describeRankScaling(skill.damage_percent!, skill.max_level, percent)}${multiplierCanLapse ? ". A multiplier of 0 or less is not applied" : ""}`,
          },
        ]
      : []),
    ...(!flatOnly
      ? [
          {
            name: "Damage before defenses",
            expression: multiplied
              ? `${combinedStep ? "Combined damage" : arithmetic} × Rank multiplier${multiplierCanLapse ? ` when it is above 0. Otherwise use ${combinedStep ? "Combined damage" : arithmetic}` : ""}`
              : arithmetic,
            ...(multiplied ? { rounding: "nearest" as const } : {}),
          },
        ]
      : []),
  ];
  return {
    steps,
    ...(!other ? { inputs } : {}),
    example(values) {
      const rank = other ? skill.max_level : values.rank;
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
          ? rankWorkingLines(
              "Rank multiplier",
              skill.damage_percent!,
              rank,
              percent,
            )
          : []),
        ...(multiplier > 0
          ? [
              `Damage before defenses: ${number(combined)} × ${percent(multiplier)} = ${number(result)}, rounded`,
            ]
          : !flatOnly && operationCount > 1
            ? [
                `Damage before defenses: ${numberArithmetic} = ${number(result)}`,
              ]
            : []),
      ];
      return {
        given: other
          ? [
              `example caster with 200 ${magic ? "Magic Damage" : "Damage"}${weaponMagic ? " and 200 Damage" : ""} at its level`,
              `skill rank ${skill.max_level}`,
            ]
          : inputs.map((input) => describeInput(input, values[input.key])),
        result: `${number(result)} damage before the target's defenses`,
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
        name: "Skill damage percentage",
        expression: describeRankScaling(
          skill.charmed_damage_percent!,
          skill.max_level,
          percent,
        ),
      },
      {
        name: "Charisma bonus",
        expression: "0.1% per point of Charisma above 0",
        limit: "at most 200%",
      },
      {
        name: "Charmed monster's damage",
        expression: "Skill damage percentage × (100% + Charisma bonus)",
        limit: "at most 100% of its ordinary damage",
      },
    ],
    inputs: [rankInput(skill.max_level), CHARISMA],
    example(values) {
      const base = atRank(skill.charmed_damage_percent!, values.rank);
      const power = bardPower(values.charisma);
      const bonus = bardBonus(values.charisma);
      const raw = multiplyF32(base, power);
      const result = clamp(raw, 0, 1);
      return {
        given: [`rank ${values.rank}`, `${number(values.charisma)} Charisma`],
        result: `The charmed monster deals ${percent(result)} of its ordinary damage`,
        working: [
          ...rankWorkingLines(
            "Skill damage percentage",
            skill.charmed_damage_percent!,
            values.rank,
            percent,
          ),
          `Charisma bonus: ${number(Math.max(0, values.charisma))} × 0.1% = ${percent(bonus.raw)}${bonus.raw !== bonus.limited ? `, limited to ${percent(bonus.limited)}` : ""}`,
          `Charmed monster's damage: ${percent(base)} × ${percent(power)} = ${percent(raw)}${raw !== result ? `, limited to ${percent(result)}` : ""}`,
        ],
      };
    },
  };
}
