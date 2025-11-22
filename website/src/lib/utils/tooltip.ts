import type { Item } from "$lib/queries/items";

/**
 * Parse Unity TextMeshPro markup and replace placeholders with actual item values.
 */
export function parseTooltip(tooltip: string, item: Item): string {
  if (!tooltip) return "";

  let parsed = tooltip;

  // Parse item stats if available
  const stats = item.stats ? (typeof item.stats === "string" ? JSON.parse(item.stats) : item.stats) : {};

  // Add item level if it's > 0 (pre-calculated in database)
  if (item.item_level > 0) {
    parsed += `\n\n<color=#F1D65A>Item Level: ${item.item_level}</color>`;
  }

  // Add sell price if sellable (format with space separator like in-game)
  if (item.sellable && item.sell_price > 0) {
    const formattedPrice = item.sell_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    parsed += `\n\n<align="right">${formattedPrice} <color=#FFD700>●</color></align>`;
  }

  // Replace placeholders with actual values
  const replacements: Record<string, string | number> = {
    // Equipment stats
    DURABILITY: stats.max_durability ? `<color=#DA4ADC>Durability: 100%</color>` : "",
    DEFENSEBONUS: stats.defense || 0,
    HEALTHBONUS: stats.health_bonus || 0,
    MANABONUS: stats.mana_bonus || 0,
    ENERGYBONUS: stats.energy_bonus || 0,

    // Primary attributes
    STRENGTHBONUS: stats.strength || 0,
    CONSTITUTIONBONUS: stats.constitution || 0,
    DEXTERITYBONUS: stats.dexterity || 0,
    INTELLIGENCEBONUS: stats.intelligence || 0,
    WISDOMBONUS: stats.wisdom || 0,
    CHARISMABONUS: stats.charisma || 0,

    // Resistances
    MAGICRESISTBONUS: stats.magic_resist || 0,
    POISONRESISTBONUS: stats.poison_resist || 0,
    FIRERESISTBONUS: stats.fire_resist || 0,
    COLDRESISTBONUS: stats.cold_resist || 0,
    DISEASERESISTBONUS: stats.disease_resist || 0,

    // Weapon stats
    DAMAGEBONUS: stats.damage || 0,
    MAGICDAMAGEBONUS: stats.magic_damage || 0,
    DELAY: item.weapon_delay || 0,

    // Combat mechanics
    HASTEBONUS: stats.haste ? `${stats.haste}%` : 0,
    SPELLHASTEBONUS: stats.spell_haste ? `${stats.spell_haste}%` : 0,
    ACCURACYBONUS: stats.accuracy ? `${stats.accuracy}%` : 0,
    BLOCKCHANCEBONUS: stats.block_chance ? `${stats.block_chance}%` : 0,
    CRITICALCHANCEBONUS: stats.critical_chance ? `${stats.critical_chance}%` : 0,
    HPREGENBONUS: stats.hp_regen_bonus || 0,
    MANAREGENBONUS: stats.mana_regen_bonus || 0,

    // Weapon requirements
    REQUIREDAMMO: item.weapon_required_ammo_id || "",
  };

  // Replace all placeholders (game always replaces, even with 0)
  for (const [key, value] of Object.entries(replacements)) {
    parsed = parsed.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }

  // Remove red color from "Requires Level" (we're not checking player level)
  parsed = parsed.replace(
    /<color=red>(Requires Level \d+)<\/color>/g,
    "$1"
  );

  // Convert Unity TextMeshPro markup to HTML
  parsed = convertUnityMarkupToHtml(parsed);

  return parsed;
}

/**
 * Convert Unity TextMeshPro markup tags to HTML.
 */
function convertUnityMarkupToHtml(text: string): string {
  let html = text;

  // Convert <color=#HEX>text</color> to <span style="color: #HEX">text</span>
  html = html.replace(
    /<color=(#[0-9A-Fa-f]{6})>(.*?)<\/color>/g,
    '<span style="color: $1">$2</span>',
  );

  // Convert <color=red> (named colors) to <span style="color: red">
  html = html.replace(
    /<color=(\w+)>(.*?)<\/color>/g,
    '<span style="color: $1">$2</span>',
  );

  // Convert <b>text</b> (already HTML)
  // No change needed, but ensure it's recognized

  // Convert <size=N>text</size> to <span style="font-size: Npx">
  html = html.replace(
    /<size=(\d+)>(.*?)<\/size>/g,
    '<span style="font-size: $1px">$2</span>',
  );

  // Remove <line-height=N%> tags (CSS line-height in HTML is harder to apply inline)
  html = html.replace(/<line-height=\d+%>/g, "");

  // Convert <align="right">text</align> to <div style="text-align: right">text</div>
  html = html.replace(
    /<align="right">(.*?)<\/align>/g,
    '<div style="text-align: right">$1</div>',
  );

  // Convert <br> to actual line breaks (already valid HTML)

  return html;
}
