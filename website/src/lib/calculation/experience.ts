import type { Calculation } from "$lib/types/calculation";
import {
  addF32,
  ceilToInt,
  divideF32,
  f32,
  iround,
  multiplyF32,
} from "$lib/planner/engine-math";
import { formatNumber, formatPercent } from "./format";
import {
  situational,
  TOTAL_VETERAN_POINTS,
  TOTAL_VETERAN_POINTS_NOTE,
} from "./inputs";

// Source: server-scripts/Experience.cs:26-36,466-472; server-scripts/ExponentialLong.cs:11-14 — level costs use float powers and nearest-even rounding.
export function levelExperience(costs: readonly number[]): Calculation {
  return {
    steps: [
      {
        name: "Through level 40",
        expression:
          "78 XP × 125.8% raised to the number of levels after level 1",
        rounding: "nearest",
      },
      {
        name: "After level 40",
        expression:
          "Level 40 requirement × 118% raised to the number of levels after level 40",
        rounding: "nearest",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your level", 20),
        min: 1,
        max: 49,
        remember: true,
      },
    ],
    example: ({ level }) => ({
      given: [`Level ${level}`],
      result: `${formatNumber(costs[level - 1])} XP to level ${level + 1}`,
      working: [
        level <= 40
          ? `Through level 40: 78 × 125.8% raised to ${level - 1} = ${formatNumber(costs[level - 1])} XP, rounded`
          : `After level 40: ${formatNumber(costs[39])} × 118% raised to ${level - 40} = ${formatNumber(costs[level - 1])} XP, rounded`,
      ],
    }),
  };
}

// Source: server-scripts/Experience.cs:45-53; server-scripts/PlayerSkills.cs:1762-1772 — the maximum-level bar grows with unspent veteran points plus learned base ranks.
export function veteranExperience(): Calculation {
  return {
    note: TOTAL_VETERAN_POINTS_NOTE,
    steps: [
      {
        name: "Next Veteran Point",
        expression: "1,000,000 XP + 20,000 XP × total veteran points",
      },
    ],
    inputs: [
      {
        ...TOTAL_VETERAN_POINTS,
        max: 199,
      },
    ],
    example: ({ veteran }) => ({
      given: [`${veteran} total veteran points`],
      result: `${formatNumber(1_000_000 + veteran * 20_000)} XP for the next point`,
      working: [
        `Next Veteran Point: 1,000,000 + 20,000 × ${veteran} = ${formatNumber(1_000_000 + veteran * 20_000)} XP`,
      ],
    }),
  };
}

const LOWER_LEVEL_REWARDS = [
  1, 0.99, 0.97, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.14,
  0.13, 0.12, 0.11, 0.1, 0.08, 0.05,
];
// Source: server-scripts/Experience.cs:542-585 — divide and round up before balancing, then round the party bonus separately.
export function evaluateKillExperience(
  base: number,
  level: number,
  monsterLevel: number,
  members: number,
  dungeon: boolean,
) {
  const gap = level - monsterLevel;
  const multiplier =
    gap > 20
      ? 0
      : gap < 0
        ? addF32(1, multiplyF32(Math.min(-gap, 10), 0.05))
        : f32(LOWER_LEVEL_REWARDS[gap]);
  const share = ceilToInt(divideF32(base, members));
  const adjustedMultiplier = dungeon ? addF32(multiplier, 0.1) : multiplier;
  const roundedShare = iround(multiplyF32(share, adjustedMultiplier));
  const balanced = gap > 20 ? 0 : Math.max(1, roundedShare);
  const bonus =
    members > 1
      ? iround(multiplyF32(balanced, multiplyF32(members - 1, 1.25)))
      : 0;
  return {
    share,
    multiplier: adjustedMultiplier,
    roundedShare,
    balanced,
    bonus,
    total: balanced + bonus,
  };
}

export function killExperience(): Calculation {
  return {
    steps: [
      {
        name: "Base share",
        expression:
          "Monster's base XP ÷ nearby party players, including dead players",
        rounding: "up",
      },
      {
        name: "Level adjustment",
        expression:
          "Use the level-difference percentage below, comparing the monster with the highest-level nearby player. A dungeon adds 10 percentage points to that percentage",
      },
      {
        name: "Adjusted share",
        expression: "Base share × level adjustment",
        rounding: "nearest",
        limit:
          "at least 1 XP, unless the monster is more than 20 levels lower, which gives no XP",
      },
      {
        name: "Party bonus",
        expression: "Adjusted share × 125% × other nearby party players",
        rounding: "nearest",
      },
      {
        name: "XP per living player",
        expression: "Adjusted share + party bonus",
      },
    ],
    inputs: [
      situational("baseXp", "Monster's base XP", 1000),
      {
        ...situational(
          "level",
          "Your level or highest nearby player level",
          20,
        ),
        min: 1,
        max: 50,
      },
      { ...situational("monsterLevel", "Monster level", 20), min: 1, max: 100 },
      { ...situational("members", "Nearby party players", 3), min: 1, max: 5 },
      { ...situational("dungeon", "Dungeon (0 = no, 1 = yes)", 0), max: 1 },
    ],
    example: ({ baseXp, level, monsterLevel, members, dungeon }) => {
      const result = evaluateKillExperience(
        baseXp,
        level,
        monsterLevel,
        members,
        dungeon === 1,
      );
      return {
        given: [
          `${formatNumber(baseXp)} base XP`,
          `Player level ${level}, monster level ${monsterLevel}`,
          `${members} nearby players`,
          dungeon ? "Dungeon" : "Outside a dungeon",
        ],
        result: `${formatNumber(result.total)} XP per living player before XP buffs and events`,
        working: [
          `Base share: ${formatNumber(baseXp)} ÷ ${members} = ${formatNumber(result.share)} XP, rounded up`,
          `Level adjustment: percentage for level ${level} against monster level ${monsterLevel}${dungeon ? " + 10 percentage points for a dungeon" : ""} = ${formatPercent(result.multiplier)}`,
          `Adjusted share: ${formatNumber(result.share)} × ${formatPercent(result.multiplier)} = ${formatNumber(result.roundedShare)} XP, rounded${result.balanced !== result.roundedShare ? (level - monsterLevel > 20 ? ", limited to 0 XP by the 20-level cutoff" : ", limited to 1 XP") : ""}`,
          `Party bonus: ${formatNumber(result.balanced)} × 125% × ${members - 1} = ${formatNumber(result.bonus)} XP, rounded`,
          `XP per living player: ${formatNumber(result.balanced)} + ${formatNumber(result.bonus)} = ${formatNumber(result.total)} XP`,
        ],
      };
    },
  };
}

// Source: server-scripts/Experience.cs:588-597; server-scripts/Player.cs:4089-4090 — round 10% of the bar requirement, then cap by current XP.
export function deathExperience(): Calculation {
  return {
    steps: [
      {
        name: "Death penalty",
        expression: "10% of your current experience bar's requirement",
        rounding: "nearest",
      },
      {
        name: "XP lost",
        expression: "Death penalty",
        limit: "at most your current XP progress",
      },
    ],
    inputs: [
      situational("requiredXp", "Current bar's XP requirement", 60650),
      situational("currentXp", "Current XP progress", 10000),
    ],
    example: ({ requiredXp, currentXp }) => {
      const penalty = iround(multiplyF32(requiredXp, 0.1));
      const lost = Math.min(penalty, currentXp);
      return {
        given: [
          `${formatNumber(requiredXp)} XP bar`,
          `${formatNumber(currentXp)} current XP`,
        ],
        result: `${formatNumber(lost)} XP lost`,
        working: [
          `Death penalty: 10% × ${formatNumber(requiredXp)} = ${formatNumber(penalty)} XP, rounded`,
          `XP lost: smaller of ${formatNumber(penalty)} and ${formatNumber(currentXp)} = ${formatNumber(lost)} XP`,
        ],
      };
    },
  };
}
