import type { Calculation } from "$lib/types/calculation";
import { ceilToInt, iround, multiplyF32 } from "$lib/calculation/unity-math";
import {
  charismaDiscount,
  hirePrice,
  resurrectionPrice,
} from "$lib/utils/merc-stats";
import { formatNumber, formatPercent } from "$lib/utils/format";
import {
  CHARISMA,
  situational,
  TOTAL_VETERAN_POINTS,
  TOTAL_VETERAN_POINTS_NOTE,
} from "./inputs";

// Source: server-scripts/UIMercenaries.cs:647-653; server-scripts/Player.cs:8980-8987; server-scripts/UINpcTrading.cs:923-930 — prices use double-precision level curves, nearest-even base rounding, and an upward-rounded float32 discount.
export function mercenaryPrice(resurrection = false): Calculation {
  return {
    steps: [
      {
        name: "Level Progress",
        expression: resurrection
          ? "(Your level − 1) ÷ 49"
          : "(Your level − 10) ÷ 40",
        limit: resurrection
          ? "counting your level as at least 1 and at most 50"
          : "counting your level as at least 10 and at most 50",
      },
      {
        name: resurrection ? "Base Fee" : "Base Price",
        expression: resurrection
          ? "5 gold + 295 gold × Level Progress raised to 2.8 + 10 gold × Total Veteran Points"
          : "20 gold + 400 gold × Level Progress × Level Progress + 15 gold × Total Veteran Points",
        rounding: "nearest",
      },
      {
        name: "Purchase Discount",
        expression: "0.2% per point of Charisma above 0",
        limit: "at most 25%",
      },
      {
        name: "Gold Saved",
        expression: `${resurrection ? "Base Fee" : "Base Price"} × Purchase Discount`,
        rounding: "up",
      },
      {
        name: resurrection ? "Resurrection Fee" : "Hire Price",
        expression: `${resurrection ? "Base Fee" : "Base Price"} − Gold Saved`,
        limit: "at least 1 gold",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your Level", 50),
        min: resurrection ? 1 : 10,
        max: 50,
        remember: true,
      },
      TOTAL_VETERAN_POINTS,
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
          `${veteran} total veteran points`,
          `${formatNumber(charisma)} Charisma`,
        ],
        result: `${formatNumber(total)} gold ${resurrection ? "resurrection fee" : "hire price"}`,
        working: [
          `Level Progress: (${level} − ${resurrection ? 1 : 10}) ÷ ${resurrection ? 49 : 40} = ${formatPercent(progress, { decimals: 2, preserveNonzero: true })}`,
          resurrection
            ? `Base Fee: 5 + 295 × ${formatPercent(progress, { decimals: 2, preserveNonzero: true })} raised to 2.8 + 10 × ${veteran} = ${formatNumber(base)} gold, rounded`
            : `Base Price: 20 + 400 × ${formatPercent(progress, { decimals: 2, preserveNonzero: true })} × ${formatPercent(progress, { decimals: 2, preserveNonzero: true })} + 15 × ${veteran} = ${formatNumber(base)} gold, rounded`,
          `Purchase Discount: 0.2% × ${formatNumber(Math.max(0, charisma))} = ${formatPercent(uncappedDiscount, { decimals: 2, preserveNonzero: true })}${discount < uncappedDiscount ? `, limited to ${formatPercent(discount, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `Gold Saved: ${formatNumber(base)} × ${formatPercent(discount, { decimals: 2, preserveNonzero: true })} = ${formatNumber(saved)} gold, rounded up`,
          `${resurrection ? "Resurrection Fee" : "Hire Price"}: ${formatNumber(base)} − ${formatNumber(saved)} = ${formatNumber(total)} gold`,
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
        name: "Level Contribution",
        expression: "Your Level ÷ 5",
        rounding: "down",
      },
      {
        name: "Veteran Contribution",
        expression: "Total Veteran Points ÷ 10",
        rounding: "down",
      },
      {
        name: "Skill Rank",
        expression: "Level Contribution + Veteran Contribution",
        limit: "at most the skill's maximum rank",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your Level", 50),
        min: 10,
        max: 50,
        remember: true,
      },
      TOTAL_VETERAN_POINTS,
      ...(maxRank === undefined
        ? [
            {
              ...situational(
                "maximumRank",
                "Skill's Maximum Rank (Max. Rank on the Mercenary's Page)",
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
          `${veteran} total veteran points`,
          `maximum rank ${cap}`,
        ],
        result: `Skill rank ${rank}`,
        working: [
          `Level Contribution: ${level} ÷ 5 = ${fromLevel}, rounded down`,
          `Veteran Contribution: ${veteran} ÷ 10 = ${fromVeteran}, rounded down`,
          `Skill Rank: ${fromLevel} + ${fromVeteran} = ${uncappedRank}${rank !== uncappedRank ? `, limited to rank ${rank}` : ""}`,
        ],
      };
    },
  };
}
