import type { Calculation, CalculationInput } from "$lib/types/calculation";
import {
  addF32,
  clamp,
  f32,
  iround,
  multiplyF32,
} from "$lib/calculation/unity-math";
import { formatNumber, formatPercent } from "$lib/utils/format";
import {
  DEFENSE_RATES,
  LEVEL_TERM_PER_LEVEL,
  MAX_AVOIDANCE,
  RESIST_CHANCE_PER_POINT,
  levelTerm,
} from "./combat";
import { CHARISMA, situational } from "./inputs";

// Source: server-scripts/BardFinalCadenceSkill.cs:67-70; server-scripts/PlayerSkills.cs:1642-1659 — Melody multiplies each already rounded Charisma-scaled amount and rounds again.
export function melodyBonus(songs: number): number {
  return songs >= 6 ? 0.3 : songs === 5 ? 0.25 : songs === 4 ? 0.15 : 0;
}

// Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive — Final Cadence needs at least three active songs.
export const ACTIVE_SONGS: CalculationInput = {
  ...situational("songs", "Active songs", 4),
  phrase: "active songs",
  min: 3,
  max: 30,
};

// Source: server-scripts/BardFinalCadenceSkill.cs:Apply,FormatScaledValue — the tooltip separates the rounded Charisma bonus from the base amount, and Melody multiplies their sum.
export function finalCadenceMelody(): Calculation {
  return {
    steps: [
      {
        name: "Melody bonus",
        expression: "The bonus for your active songs from the table",
      },
      {
        name: "Damage or healing",
        expression:
          "Tooltip damage or healing (base plus bonus) × (100% + Melody bonus)",
        rounding: "nearest",
      },
    ],
    inputs: [
      situational(
        "scaledAmount",
        "Tooltip damage or healing, including the Charisma bonus",
        100,
      ),
      ACTIVE_SONGS,
    ],
    example: ({ scaledAmount, songs }) => {
      const multiplier = addF32(1, melodyBonus(songs));
      const total = iround(multiplyF32(scaledAmount, multiplier));
      return {
        given: [
          `${formatNumber(scaledAmount)} tooltip damage or healing, including the bonus`,
          `${songs} active songs`,
        ],
        // Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies; Combat.cs:DealDamageAt — defenses modify damage and heals can crit before being capped by missing Health.
        result: `${formatNumber(total)} damage before defenses, or ${formatNumber(total)} healing before critical heals. Healing cannot exceed the target's missing Hit Points.`,
        working: [
          `Melody bonus: ${formatPercent(melodyBonus(songs), { decimals: 2, preserveNonzero: true })} for ${songs} active songs`,
          `Damage or healing: ${formatNumber(scaledAmount)} × ${formatPercent(multiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(total)}, rounded`,
        ],
      };
    },
  };
}

// Source: server-scripts/BardCharmSongSkill.cs:GetCharmResistChance — a monster above the Bard adds 0.025 per level, each nonnegative Charisma point subtracts 0.0002, and the result stays within 0–0.95.
const CHARM_RESIST_PER_HIGHER_LEVEL = 0.025;
const CHARM_RESIST_PER_CHARISMA = 0.0002;
const MAX_CHARM_RESIST = 0.95;

// Source: server-scripts/Combat.cs:GetProbResistMagic; BardCharmSongSkill.cs:GetCharmResistChance — the level term is inside the base cap, before charm-specific modifiers.
function charmResistTerms(
  monsterLevel: number,
  playerLevel: number,
  magicResist: number,
  charisma: number,
) {
  const difference = monsterLevel - playerLevel;
  const rawAdjustment = multiplyF32(difference, LEVEL_TERM_PER_LEVEL);
  const adjustment = levelTerm(difference);
  const rawBase = addF32(
    multiplyF32(magicResist, RESIST_CHANCE_PER_POINT),
    adjustment,
  );
  const base = clamp(rawBase, 0, f32(MAX_AVOIDANCE));
  const rawChance = f32(
    addF32(
      base,
      multiplyF32(Math.max(0, difference), CHARM_RESIST_PER_HIGHER_LEVEL),
    ) - multiplyF32(Math.max(0, charisma), CHARM_RESIST_PER_CHARISMA),
  );
  const chance = clamp(rawChance, 0, f32(MAX_CHARM_RESIST));
  return {
    difference,
    rawAdjustment,
    adjustment,
    rawBase,
    base,
    rawChance,
    chance,
  };
}

export function charmResistChance(
  monsterLevel: number,
  playerLevel: number,
  magicResist: number,
  charisma: number,
): number {
  return charmResistTerms(monsterLevel, playerLevel, magicResist, charisma)
    .chance;
}

export function bardCharmResistance(): Calculation {
  const percent = (value: number) => formatPercent(value, { decimals: 2 });
  const perLevel = percent(CHARM_RESIST_PER_HIGHER_LEVEL);
  const perCharisma = percent(CHARM_RESIST_PER_CHARISMA);
  return {
    steps: [
      {
        name: "Level adjustment",
        expression: `(Monster level − your level) × ${DEFENSE_RATES.levelTermPerLevel}`,
        limit: `between −${DEFENSE_RATES.maxLevelTerm} and +${DEFENSE_RATES.maxLevelTerm}`,
      },
      {
        name: "Base resist chance",
        expression: `Monster's Magic Resist × ${DEFENSE_RATES.resistChancePerPoint} + level adjustment`,
        limit: `between 0% and ${DEFENSE_RATES.maxAvoidance}`,
      },
      {
        name: "Charm resist chance",
        expression: `Base resist chance + ${perLevel} per level the monster is above you − ${perCharisma} per point of Charisma above 0`,
        limit: `between 0% and ${percent(MAX_CHARM_RESIST)}`,
      },
    ],
    inputs: [
      {
        ...situational("level", "Your level (character window)", 50),
        min: 1,
        max: 50,
        remember: true,
      },
      CHARISMA,
      {
        ...situational(
          "monsterLevel",
          "Monster level (target frame or monster page)",
          52,
        ),
        min: 1,
        max: 100,
      },
      situational("magicResist", "Monster's Magic Resist (monster page)", 300),
    ],
    example: ({ level, charisma, monsterLevel, magicResist }) => {
      const terms = charmResistTerms(
        monsterLevel,
        level,
        magicResist,
        charisma,
      );
      const { difference, rawAdjustment, adjustment, rawBase, base } = terms;
      const { rawChance, chance } = terms;
      const limited = (raw: number, value: number) =>
        value !== raw ? `, limited to ${percent(value)}` : "";
      return {
        given: [
          `Level ${level}, ${charisma} Charisma`,
          `Level ${monsterLevel} monster, ${magicResist} Magic Resist`,
        ],
        result: `${percent(chance)} chance to resist Charm`,
        working: [
          `Level adjustment: (${monsterLevel} − ${level}) × ${DEFENSE_RATES.levelTermPerLevel} = ${percent(rawAdjustment)}${limited(rawAdjustment, adjustment)}`,
          `Base resist chance: ${magicResist} × ${DEFENSE_RATES.resistChancePerPoint} ${adjustment < 0 ? "−" : "+"} ${percent(Math.abs(adjustment))} = ${percent(rawBase)}${limited(rawBase, base)}`,
          `Charm resist chance: ${percent(base)} + ${Math.max(0, difference)} × ${perLevel} − ${Math.max(0, charisma)} × ${perCharisma} = ${percent(rawChance)}${limited(rawChance, chance)}`,
        ],
      };
    },
  };
}
