import type { Calculation } from "$lib/types/calculation";
import { ceilToInt, iround, multiplyF32 } from "$lib/planner/engine-math";
import {
  charismaDiscount,
  hirePrice,
  resurrectionPrice,
} from "$lib/utils/merc-stats";
import { formatNumber, formatPercent } from "./format";
import {
  CHARISMA,
  situational,
  TOTAL_VETERAN_POINTS,
  TOTAL_VETERAN_POINTS_NOTE,
} from "./inputs";

// Source: server-scripts/UIMercenaries.cs:441-447; server-scripts/Player.cs:8588-8595; server-scripts/UINpcTrading.cs:870-877 — prices use double-precision level curves, nearest-even base rounding, and an upward-rounded float32 discount.
export function mercenaryPrice(resurrection = false): Calculation {
  return {
    steps: [
      {
        name: "Level progress",
        expression: resurrection
          ? "(Your level − 1) ÷ 49"
          : "(Your level − 10) ÷ 40",
        limit: resurrection
          ? "counting your level as at least 1 and at most 50"
          : "counting your level as at least 10 and at most 50",
      },
      {
        name: "Base price",
        expression: resurrection
          ? "5 gold + 295 gold × level progress raised to 2.8 + 10 gold × veteran points (VT)"
          : "20 gold + 400 gold × level progress × level progress + 15 gold × veteran points (VT)",
        rounding: "nearest",
      },
      {
        name: "Purchase discount",
        expression: "0.2% per point of Charisma above 0",
        limit: "at most 25%",
      },
      {
        name: "Gold saved",
        expression: "Base price × purchase discount",
        rounding: "up",
      },
      {
        name: resurrection ? "Resurrection fee" : "Hire price",
        expression: "Base price − gold saved",
        limit: "at least 1 gold",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your level", 50),
        min: resurrection ? 1 : 10,
        max: 50,
        remember: true,
      },
      { ...TOTAL_VETERAN_POINTS, label: "Veteran points (VT)" },
      CHARISMA,
    ],
    example: ({ level, veteran, charisma }) => {
      const progress = resurrection ? (level - 1) / 49 : (level - 10) / 40;
      const base = resurrection
        ? iround(5 + 295 * progress ** 2.8 + 10 * veteran)
        : iround(20 + 400 * progress * progress + 15 * veteran);
      const discount = charismaDiscount(charisma);
      const uncappedDiscount = multiplyF32(Math.max(0, charisma), 0.002);
      const saved = ceilToInt(multiplyF32(base, discount));
      const total = resurrection
        ? resurrectionPrice(level, veteran, discount)
        : hirePrice(level, veteran, discount);
      return {
        given: [
          `Level ${level}`,
          `${veteran} veteran points (VT)`,
          `${charisma} Charisma`,
        ],
        result: `${formatNumber(total)} gold ${resurrection ? "resurrection fee" : "hire price"}`,
        working: [
          `Level progress: (${level} − ${resurrection ? 1 : 10}) ÷ ${resurrection ? 49 : 40} = ${formatPercent(progress)}`,
          resurrection
            ? `Base price: 5 + 295 × ${formatPercent(progress)} raised to 2.8 + 10 × ${veteran} = ${formatNumber(base)} gold, rounded`
            : `Base price: 20 + 400 × ${formatPercent(progress)} × ${formatPercent(progress)} + 15 × ${veteran} = ${formatNumber(base)} gold, rounded`,
          `Purchase discount: 0.2% × ${Math.max(0, charisma)} = ${formatPercent(uncappedDiscount)}${discount < uncappedDiscount ? `, limited to ${formatPercent(discount)}` : ""}`,
          `Gold saved: ${formatNumber(base)} × ${formatPercent(discount)} = ${formatNumber(saved)} gold, rounded up`,
          `${resurrection ? "Resurrection fee" : "Hire price"}: ${formatNumber(base)} − ${formatNumber(saved)} = ${formatNumber(total)} gold`,
        ],
      };
    },
  };
}

// Source: server-scripts/PetSkills.cs:RefreshSkillLevels — rank contributions truncate positive level and veteran divisions independently, and Bard and Necromancer mercenaries keep rank 1 or higher.
export function mercenaryRank(
  maxRank?: number,
  minimumRankOne = false,
): Calculation {
  return {
    note: TOTAL_VETERAN_POINTS_NOTE,
    steps: [
      {
        name: "Level contribution",
        expression: "Your level ÷ 5",
        rounding: "down",
      },
      {
        name: "Veteran contribution",
        expression: "Veteran points (VT) ÷ 10",
        rounding: "down",
      },
      {
        name: "Skill rank",
        expression: "Level contribution + veteran contribution",
        limit: "at most the skill's maximum rank",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your level", 50),
        min: 10,
        max: 50,
        remember: true,
      },
      { ...TOTAL_VETERAN_POINTS, label: "Veteran points (VT)" },
      ...(maxRank === undefined
        ? [
            {
              ...situational(
                "maximumRank",
                "Skill's maximum rank (Max Rank on the mercenary's page)",
                5,
              ),
              min: 1,
              max: 100,
            },
          ]
        : []),
    ],
    example: ({ level, veteran, maximumRank }) => {
      const cap = maxRank ?? maximumRank;
      const fromLevel = Math.floor(level / 5),
        fromVeteran = Math.floor(veteran / 10);
      const uncappedRank = fromLevel + fromVeteran;
      const rank = Math.min(
        cap,
        Math.max(minimumRankOne ? 1 : 0, uncappedRank),
      );
      return {
        given: [
          `Level ${level}`,
          `${veteran} veteran points (VT)`,
          `Maximum rank ${cap}`,
        ],
        result: `Skill rank ${rank}`,
        working: [
          `Level contribution: ${level} ÷ 5 = ${fromLevel}, rounded down`,
          `Veteran contribution: ${veteran} ÷ 10 = ${fromVeteran}, rounded down`,
          `Skill rank: ${fromLevel} + ${fromVeteran} = ${uncappedRank}${rank !== uncappedRank ? `, limited to rank ${rank}` : ""}`,
        ],
      };
    },
  };
}
