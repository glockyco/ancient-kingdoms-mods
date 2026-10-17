import type { Calculation } from "$lib/types/calculation";
import {
  addF32,
  ceilToInt,
  f32,
  iround,
  multiplyF32,
} from "$lib/calculation/unity-math";
import { formatNumber, formatPercent } from "$lib/utils/format";
import { CHARISMA, situational } from "./inputs";

// Source: server-scripts/PlayerNpcTrading.cs:CalculateRepairItemPrice; ItemSlot.cs:ToolTip — repair uses the missing fraction; the tooltip exposes a rounded durability percentage.
export function evaluateRepair(
  value: number,
  durability: number,
  charisma: number,
) {
  const missing = addF32(1, -f32(durability));
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

// Source: server-scripts/ItemSlot.cs:ToolTip — durability is the item's rounded percentage, not its hidden point count.
const DURABILITY = {
  ...situational("durability", "Durability (item tooltip)", 0.3),
  max: 1,
  unit: "%" as const,
};

// Source: server-scripts/EquipmentItem.cs:ToolTip; server-scripts/ItemSlot.cs:ToolTip; server-scripts/UICharacterInfo.cs:Update; server-scripts/PlayerNpcTrading.cs:CalculateRepairItemPrice — tooltip gold and rounded durability are visible inputs, and repairs use the exact durability fraction.
// Source: server-scripts/ScriptableItem.cs:SellPriceInGold; PlayerNpcTrading.cs:UserCode_CmdRepairItem__Int32__Int64__Boolean — token gear's tooltip multiplies its 1–5 token sell value by the token's gold value, but repairs use the token sell value, so they cost 1 or 2 gold.
export function repairCost(): Calculation {
  return {
    note: "Read the sell price beside the gold icon and the Durability percentage in the item tooltip. Read Charisma in the character window. This is an estimate because the tooltip rounds durability to a whole percent. Gear bought with tokens always costs 1 or 2 gold to repair.",
    steps: [
      {
        name: "Missing durability",
        expression: "100% − durability %",
      },
      {
        name: "Base repair cost",
        expression: "Sell price × missing durability × 50%",
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
      situational(
        "itemValue",
        "Sell price (gold amount in item tooltip)",
        1000,
      ),
      DURABILITY,
      CHARISMA,
    ],
    example: ({ itemValue, durability, charisma }) => {
      const result = evaluateRepair(itemValue, durability, charisma);
      return {
        given: [
          `${formatNumber(itemValue)} gold sell price`,
          `${formatPercent(durability, { decimals: 2, preserveNonzero: true })} durability`,
          `${charisma} Charisma`,
        ],
        result:
          durability === 1
            ? "No repair needed unless the tooltip rounded up to 100%"
            : `${formatNumber(result.total)} gold to repair`,
        working:
          durability === 1
            ? [
                `Missing durability: 100% − ${formatPercent(durability, { decimals: 2, preserveNonzero: true })} = 0%`,
              ]
            : [
                `Missing durability: 100% − ${formatPercent(durability, { decimals: 2, preserveNonzero: true })} = ${formatPercent(result.missing, { decimals: 2, preserveNonzero: true })}`,
                `Base repair cost: ${formatNumber(itemValue)} × ${formatPercent(result.missing, { decimals: 2, preserveNonzero: true })} × 50% = ${formatNumber(result.base)} gold, rounded`,
                `Repair discount: 0.2% × ${Math.max(0, charisma)} = ${formatPercent(result.uncappedDiscount, { decimals: 2, preserveNonzero: true })}${result.discount < result.uncappedDiscount ? `, limited to ${formatPercent(result.discount, { decimals: 2, preserveNonzero: true })}` : ""}`,
                `Gold saved: ${formatNumber(result.base)} × ${formatPercent(result.discount, { decimals: 2, preserveNonzero: true })} = ${formatNumber(result.saving)} gold, rounded up`,
                `Repair price: ${formatNumber(result.base)} − ${formatNumber(result.saving)} = ${formatNumber(result.unboundedPrice)} gold${result.total !== result.unboundedPrice ? `, limited to ${formatNumber(result.total)} gold` : ""}`,
              ],
      };
    },
  };
}

// Source: server-scripts/UINpcTrading.cs:CalculatePurchaseItemPrice; server-scripts/PlayerNpcTrading.cs:CalculateSellItemPrice; server-scripts/UINpcTrading.cs:Update; server-scripts/ItemSlot.cs:ToolTip; server-scripts/UICharacterInfo.cs:Update — gold purchases receive a Charisma discount, token purchases do not, and tooltip durability is rounded.
export function merchantPrice(selling: boolean): Calculation {
  return {
    note: selling
      ? "Read the sell price beside the gold icon and the Durability percentage in the item tooltip. Read Charisma in the character window. Use 100% for items without durability. This is an estimate because the tooltip rounds durability to a whole percent."
      : "For purchases paid in gold, use Buy Price on this site's item page and Charisma in the character window. The merchant window shows the discounted price. Purchases paid in tokens receive no Charisma discount.",
    steps: [
      ...(selling
        ? [
            {
              name: "Durability-adjusted value",
              expression: "Sell price × durability %",
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
        expression: `${selling ? "Durability-adjusted value" : "Buy Price"} × ${selling ? "sale bonus" : "purchase discount"}`,
        rounding: "up",
      },
      {
        name: selling ? "Sale price" : "Purchase price",
        expression: selling
          ? "Durability-adjusted value + extra gold"
          : "Buy Price − gold saved",
        limit: "at least 1 gold. An item worth 1 gold always stays at 1 gold",
      },
    ],
    inputs: [
      situational(
        "itemValue",
        selling
          ? "Sell price (gold amount in item tooltip)"
          : "Buy Price (item page)",
        1000,
      ),
      ...(selling ? [DURABILITY] : []),
      CHARISMA,
    ],
    example: ({ itemValue, durability = 1, charisma }) => {
      const adjusted = selling
        ? iround(multiplyF32(itemValue, durability))
        : itemValue;
      const uncappedDiscount = multiplyF32(Math.max(0, charisma), 0.002);
      const discount = Math.min(f32(0.25), uncappedDiscount);
      const change = ceilToInt(multiplyF32(adjusted, discount));
      const unboundedPrice = adjusted + (selling ? change : -change);
      const total = itemValue === 1 ? 1 : Math.max(1, unboundedPrice);
      return {
        given: [
          `${formatNumber(itemValue)} gold ${selling ? "sell price" : "Buy Price"}`,
          ...(selling
            ? [
                `${formatPercent(durability, { decimals: 2, preserveNonzero: true })} durability`,
              ]
            : []),
          `${charisma} Charisma`,
        ],
        result: `${formatNumber(total)} gold ${selling ? "received" : "paid"}`,
        working: [
          ...(selling
            ? [
                `Durability-adjusted value: ${formatNumber(itemValue)} × ${formatPercent(durability, { decimals: 2, preserveNonzero: true })} = ${formatNumber(adjusted)} gold, rounded`,
              ]
            : []),
          `${selling ? "Sale bonus" : "Purchase discount"}: 0.2% × ${Math.max(0, charisma)} = ${formatPercent(uncappedDiscount, { decimals: 2, preserveNonzero: true })}${discount < uncappedDiscount ? `, limited to ${formatPercent(discount, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `${selling ? "Extra gold" : "Gold saved"}: ${formatNumber(adjusted)} × ${formatPercent(discount, { decimals: 2, preserveNonzero: true })} = ${formatNumber(change)} gold, rounded up`,
          `${selling ? "Sale price" : "Purchase price"}: ${formatNumber(adjusted)} ${selling ? "+" : "−"} ${formatNumber(change)} = ${formatNumber(unboundedPrice)} gold${total !== unboundedPrice ? `, limited to ${formatNumber(total)} gold` : ""}`,
        ],
      };
    },
  };
}
