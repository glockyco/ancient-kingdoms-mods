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
import { CHARISMA, situational } from "./inputs";

// Source: server-scripts/PlayerNpcTrading.cs:45-60; server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:17-25 — repair rounds before subtracting an upward-rounded discount, capped at 50% rather than the merchant's 25%.
export function evaluateRepair(
  value: number,
  current: number,
  maximum: number,
  charisma: number,
) {
  const missing = addF32(1, -divideF32(current, maximum));
  const base = iround(multiplyF32(multiplyF32(value, missing), 0.5));
  const uncappedDiscount = multiplyF32(Math.max(0, charisma), 0.002);
  const discount = Math.min(f32(0.5), uncappedDiscount);
  const saving = ceilToInt(multiplyF32(base, discount));
  const unboundedPrice = base - saving;
  return {
    missing,
    base,
    uncappedDiscount,
    discount,
    saving,
    unboundedPrice,
    total: Math.max(1, unboundedPrice),
  };
}

export function repairCost(): Calculation {
  return {
    steps: [
      {
        name: "Missing durability",
        expression: "100% − current durability ÷ maximum durability",
      },
      {
        name: "Base repair cost",
        expression: "Undamaged sell value × missing durability × 50%",
        rounding: "nearest",
      },
      {
        name: "Repair discount",
        expression: "0.2% per point of Charisma above 0",
        limit: "at most 50%",
      },
      {
        name: "Gold saved",
        expression: "Base repair cost × repair discount",
        rounding: "up",
      },
      {
        name: "Repair price",
        expression: "Base repair cost − gold saved",
        limit: "at least 1 gold",
      },
    ],
    inputs: [
      situational("itemValue", "Undamaged sell value", 1000),
      situational("durability", "Current durability", 30),
      {
        ...situational("maximumDurability", "Maximum durability", 100),
        min: 1,
      },
      CHARISMA,
    ],
    example: ({ itemValue, durability, maximumDurability, charisma }) => {
      const current = Math.min(durability, maximumDurability);
      const result = evaluateRepair(
        itemValue,
        current,
        maximumDurability,
        charisma,
      );
      return {
        given: [
          `${formatNumber(itemValue)} gold undamaged sell value`,
          `${current} of ${maximumDurability} durability`,
          `${charisma} Charisma`,
        ],
        result:
          current === maximumDurability
            ? "No repair needed for undamaged gear"
            : `${formatNumber(result.total)} gold to repair`,
        working:
          current === maximumDurability
            ? [
                `Missing durability: 100% − ${current} ÷ ${maximumDurability} = 0%`,
              ]
            : [
                `Missing durability: 100% − ${current} ÷ ${maximumDurability} = ${formatPercent(result.missing)}`,
                `Base repair cost: ${formatNumber(itemValue)} × ${formatPercent(result.missing)} × 50% = ${formatNumber(result.base)} gold, rounded`,
                `Repair discount: 0.2% × ${Math.max(0, charisma)} = ${formatPercent(result.uncappedDiscount)}${result.discount < result.uncappedDiscount ? `, limited to ${formatPercent(result.discount)}` : ""}`,
                `Gold saved: ${formatNumber(result.base)} × ${formatPercent(result.discount)} = ${formatNumber(result.saving)} gold, rounded up`,
                `Repair price: ${formatNumber(result.base)} − ${formatNumber(result.saving)} = ${formatNumber(result.unboundedPrice)} gold${result.total !== result.unboundedPrice ? `, limited to ${formatNumber(result.total)} gold` : ""}`,
              ],
      };
    },
  };
}

// Source: server-scripts/UINpcTrading.cs:837-855; server-scripts/PlayerNpcTrading.cs:52-60 — purchases and sales use distinct upward-rounded Charisma amounts.
export function merchantPrice(selling: boolean): Calculation {
  return {
    steps: [
      ...(selling
        ? [
            {
              name: "Durability-adjusted value",
              expression:
                "Undamaged sell value × current durability ÷ maximum durability",
              rounding: "nearest" as const,
            },
          ]
        : []),
      {
        name: selling ? "Sale bonus" : "Purchase discount",
        expression: "0.2% per point of Charisma above 0",
        limit: "at most 25%",
      },
      {
        name: selling ? "Extra gold" : "Gold saved",
        expression: `${selling ? "Durability-adjusted value" : "Listed price"} × ${selling ? "sale bonus" : "purchase discount"}`,
        rounding: "up",
      },
      {
        name: selling ? "Sale price" : "Purchase price",
        expression: selling
          ? "Durability-adjusted value + extra gold"
          : "Listed price − gold saved",
        limit: "at least 1 gold. An item worth 1 gold always stays at 1 gold",
      },
    ],
    inputs: [
      situational(
        "itemValue",
        selling ? "Undamaged sell value" : "Listed price",
        1000,
      ),
      ...(selling
        ? [
            situational("durability", "Current durability", 30),
            {
              ...situational("maximumDurability", "Maximum durability", 100),
              min: 1,
            },
          ]
        : []),
      CHARISMA,
    ],
    example: ({ itemValue, durability, maximumDurability, charisma }) => {
      const current = Math.min(durability ?? 1, maximumDurability ?? 1);
      const adjusted = selling
        ? iround(divideF32(multiplyF32(itemValue, current), maximumDurability))
        : itemValue;
      const uncappedDiscount = multiplyF32(Math.max(0, charisma), 0.002);
      const discount = Math.min(f32(0.25), uncappedDiscount);
      const change = ceilToInt(multiplyF32(adjusted, discount));
      const unboundedPrice = adjusted + (selling ? change : -change);
      const total = itemValue === 1 ? 1 : Math.max(1, unboundedPrice);
      return {
        given: [
          `${formatNumber(itemValue)} gold ${selling ? "undamaged sell value" : "listed price"}`,
          ...(selling ? [`${current} of ${maximumDurability} durability`] : []),
          `${charisma} Charisma`,
        ],
        result: `${formatNumber(total)} gold ${selling ? "received" : "paid"}`,
        working: [
          ...(selling
            ? [
                `Durability-adjusted value: ${formatNumber(itemValue)} × ${current} ÷ ${maximumDurability} = ${formatNumber(adjusted)} gold, rounded`,
              ]
            : []),
          `${selling ? "Sale bonus" : "Purchase discount"}: 0.2% × ${Math.max(0, charisma)} = ${formatPercent(uncappedDiscount)}${discount < uncappedDiscount ? `, limited to ${formatPercent(discount)}` : ""}`,
          `${selling ? "Extra gold" : "Gold saved"}: ${formatNumber(adjusted)} × ${formatPercent(discount)} = ${formatNumber(change)} gold, rounded up`,
          `${selling ? "Sale price" : "Purchase price"}: ${formatNumber(adjusted)} ${selling ? "+" : "−"} ${formatNumber(change)} = ${formatNumber(unboundedPrice)} gold${total !== unboundedPrice ? `, limited to ${formatNumber(total)} gold` : ""}`,
        ],
      };
    },
  };
}
