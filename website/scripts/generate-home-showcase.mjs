#!/usr/bin/env node
/**
 * Build-time selection of the game art and facts that the home page shows.
 *
 * The home page renders in a Cloudflare Worker and must not touch SQLite at
 * request time, so, like scripts/generate-home-counts.mjs, this snapshots what
 * the page needs into a committed TypeScript module. Every image comes from a
 * recorded `visual_assets` row with its published path and dimensions; a
 * missing row fails the build instead of rendering an empty frame.
 *
 * Run automatically via the "prebuild" npm script. Keep the generated source
 * Prettier-stable so prebuild never dirties an unchanged tree.
 */

import Database from "better-sqlite3";
import sharp from "sharp";
import { format } from "prettier";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const dbPath = resolve(projectRoot, "data/compendium.db");
const staticDir = resolve(projectRoot, "static");
const outDir = resolve(projectRoot, "src/lib/generated");
const outPath = resolve(outDir, "home-showcase.ts");

const db = new Database(dbPath, { readonly: true });

/** The recorded artwork of one entity, or a build failure naming what is missing. */
function artwork(domain, entityId, kind) {
  const row = db
    .prepare(
      `SELECT public_path, width, height FROM visual_assets
       WHERE domain = ? AND entity_id = ? AND kind = ?`,
    )
    .get(domain, entityId, kind);
  if (!row) {
    throw new Error(`No ${domain}/${kind} artwork is recorded for ${entityId}`);
  }
  return { src: `/${row.public_path}`, width: row.width, height: row.height };
}

/** The table URL format read by the overview tables: `{urlKey}.{column}=v1,v2`. */
function listHref(page, urlKey, column, values) {
  const params = new URLSearchParams({
    [`${urlKey}.${column}`]: values.join(","),
  });
  return `${page}?${params.toString()}`;
}

// Armor set bonuses are recorded as augments but are not items a player
// socketed; the item list shows them under their own type (see
// itemListType in src/lib/utils/format.ts), so the Augments group leaves them out.
const NOT_SET_BONUS =
  "NOT (augment_armor_set_name IS NOT NULL AND augment_armor_set_name != '')";

// The weapon slots that hold an actual weapon. Weapon-type items also include
// shields, instruments, and gathering tools.
const WEAPON_SLOTS =
  "slot IN ('WeaponSword', 'WeaponSword2H', 'WeaponDagger', 'WeaponWand', 'Bow')";

/**
 * Item groups on the home page, in the order a character is equipped and then
 * supplied. `types` are the item types the group lists; the item list opens
 * filtered to them. `iconPool` narrows which members may stand for the group,
 * so armor shows a chest piece rather than a ring. Consumables are the types
 * the game uses up on use (PotionItem, FoodItem, ScrollItem, and TravelItem
 * each call DecreaseAmount in Use).
 */
const ITEM_GROUPS = [
  { label: "Weapons", types: ["weapon"], iconPool: WEAPON_SLOTS },
  { label: "Equipment", types: ["equipment"], iconPool: "slot = 'Chest'" },
  { label: "Augments", types: ["augment"], filter: NOT_SET_BONUS },
  { label: "Relics", types: ["relic"] },
  { label: "Consumables", types: ["potion", "food", "scroll", "travel"] },
  { label: "Backpacks", types: ["backpack"] },
  { label: "Mounts", types: ["mount"] },
  { label: "Pets", types: ["pet"] },
];

// The icon pool descends quality tiers until it holds this many distinct
// sprites, so a tier with one dull item cannot decide the group's picture.
const MIN_ICON_POOL = 3;

/**
 * How much a pixel-art icon has to look at: its colourfulness (Hasler and
 * Süsstrunk), weighted by the number of distinct colours and the square root
 * of its drawn area. Large, detailed, saturated sprites score highest. An icon
 * that fills its whole canvas is drawn on an opaque tile, which reads as a
 * square rather than an object, so it scores zero.
 */
async function visualRichness(publicPath) {
  const { data, info } = await sharp(resolve(staticDir, publicPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rg = [];
  const yb = [];
  const colours = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    rg.push(r - g);
    yb.push((r + g) / 2 - b);
    colours.add((r << 16) | (g << 8) | b);
  }
  if (rg.length === 0 || rg.length === info.width * info.height) return 0;
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const std = (values, m) =>
    Math.sqrt(mean(values.map((value) => (value - m) ** 2)));
  const [rgMean, ybMean] = [mean(rg), mean(yb)];
  const colourfulness =
    Math.hypot(std(rg, rgMean), std(yb, ybMean)) +
    0.3 * Math.hypot(rgMean, ybMean);
  return colourfulness * Math.log1p(colours.size) * Math.sqrt(rg.length);
}

/**
 * The icon that stands for a group: among its highest quality tiers, the
 * member whose sprite is the most visually rich. Quality is the game's own
 * measure of how special an item is; richness keeps a plain item of that
 * tier from representing it.
 */
async function groupIcon(condition, params) {
  const members = db
    .prepare(
      `SELECT i.id, i.quality, COALESCE(i.item_level, 0) AS item_level,
              va.public_path, va.source_name
       FROM items i
       JOIN visual_assets va
         ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
       WHERE ${condition}
       ORDER BY i.quality DESC, i.item_level DESC, i.id`,
    )
    .all(...params);
  if (members.length === 0) throw new Error(`No icon for ${condition}`);
  const pool = [];
  const sprites = new Set();
  for (const member of members) {
    const lastQuality = pool.at(-1)?.quality;
    if (sprites.size >= MIN_ICON_POOL && member.quality !== lastQuality) break;
    pool.push(member);
    sprites.add(member.source_name);
  }
  const scored = await Promise.all(
    pool.map(async (member) => ({
      ...member,
      richness: await visualRichness(member.public_path),
    })),
  );
  scored.sort((a, b) => b.richness - a.richness || b.item_level - a.item_level);
  return artwork("item", scored[0].id, "icon");
}

/**
 * The colour a sprite glows with: its dominant hue. Opaque pixels vote for one
 * of twelve hue bins, weighted by saturation times brightness so vivid parts
 * (fire, frost, skin) outweigh grey outlines; the winning bin's pixels are
 * averaged and scaled to full brightness. Averaging every pixel instead would
 * mix complementary colours, such as lava and stone, into an unrelated hue.
 */
async function spriteGlow(publicPath) {
  const { data } = await sharp(resolve(staticDir, publicPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    if (delta === 0) continue;
    const hue =
      max === r
        ? ((g - b) / delta + 6) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    const bin = bins[Math.floor(hue * 2) % 12];
    const weight = (delta / max) * (max / 255);
    bin[0] += r * weight;
    bin[1] += g * weight;
    bin[2] += b * weight;
    bin[3] += weight;
  }
  const [r, g, b, weight] = bins.reduce((best, bin) =>
    bin[3] > best[3] ? bin : best,
  );
  if (weight === 0) throw new Error(`${publicPath} has no coloured pixels`);
  const peak = Math.max(r, g, b);
  const hex = (value) =>
    Math.round((value / peak) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

const itemGroups = await Promise.all(
  ITEM_GROUPS.map(async (group) => {
    const placeholders = group.types.map(() => "?").join(", ");
    const condition = [`item_type IN (${placeholders})`, group.filter]
      .filter(Boolean)
      .join(" AND ");
    const { count } = db
      .prepare(`SELECT COUNT(*) AS count FROM items WHERE ${condition}`)
      .get(...group.types);
    if (count === 0) throw new Error(`Item group ${group.label} is empty`);
    const iconCondition = [condition, group.iconPool]
      .filter(Boolean)
      .join(" AND ");
    return {
      label: group.label,
      href: listHref("/items", "items", "item_type", group.types),
      count,
      icon: await groupIcon(iconCondition, group.types),
    };
  }),
);

// World bosses are the game's own category of boss that roams an overworld
// zone, each shown with its full in-game sprite. The game's boss portraits
// are 64-pixel crops made for the target frame and read poorly at card size.
const worldBosses = await Promise.all(
  db
    .prepare(
      `SELECT m.id, m.name, m.level,
              (SELECT z.name FROM monster_spawns s JOIN zones z ON z.id = s.zone_id
               WHERE s.monster_id = m.id ORDER BY z.name LIMIT 1) AS zone
       FROM monsters m
       WHERE m.is_world_boss = 1
       ORDER BY m.level, m.name`,
    )
    .all()
    .map(async (row) => {
      if (!row.zone) throw new Error(`World boss ${row.id} has no spawn zone`);
      const sprite = artwork("monster", row.id, "primary");
      return {
        id: row.id,
        name: row.name,
        level: row.level,
        zone: row.zone,
        href: `/monsters/${row.id}`,
        sprite,
        glow: await spriteGlow(sprite.src.slice(1)),
      };
    }),
);
if (worldBosses.length === 0) throw new Error("No world bosses");

/**
 * Recipe types as the recipe list names them (routes/recipes/+page.server.ts),
 * each shown with the icon of the game skill that performs the craft.
 */
const recipeCount = (kind) =>
  db
    .prepare(
      "SELECT COUNT(*) AS count FROM acquisition_recipe_details WHERE display_kind = ?",
    )
    .get(kind).count;
const crafting = [
  {
    type: "Crafting",
    skill: "crafting",
    count: recipeCount("crafting"),
  },
  {
    type: "Alchemy",
    skill: "alchemy",
    count: recipeCount("alchemy"),
  },
  {
    type: "Cooking",
    skill: "baking",
    count: recipeCount("cooking"),
  },
  {
    type: "Scribing",
    skill: "crafting_scroll",
    count: recipeCount("scribing"),
  },
].map(({ type, skill, count }) => {
  if (count === 0) throw new Error(`No ${type} recipes`);
  return {
    type,
    href: listHref("/recipes", "recipes", "type", [type]),
    count,
    icon: artwork("skill", skill, "icon"),
  };
});

const classes = db
  .prepare("SELECT id, name, primary_role FROM classes ORDER BY name")
  .all()
  .map((row) => ({
    id: row.id,
    name: row.name,
    role: row.primary_role,
    href: `/classes/${row.id}`,
    icon: artwork("class", row.id, "icon"),
  }));

/**
 * Professions in the categories and order of the profession list
 * (routes/professions/+page.svelte), each with the icon its slot shows in the
 * game's professions window.
 */
const PROFESSION_CATEGORIES = [
  { id: "gathering", label: "Gathering" },
  { id: "crafting", label: "Crafting" },
  { id: "combat", label: "Combat" },
  { id: "exploration", label: "Exploration" },
];
const professionRows = db
  .prepare(
    "SELECT id, name, description, category FROM professions ORDER BY name",
  )
  .all();
const professionGroups = PROFESSION_CATEGORIES.map((category) => ({
  label: category.label,
  professions: professionRows
    .filter((row) => row.category === category.id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      href: `/professions/${row.id}`,
      icon: artwork("profession", row.id, "icon"),
    })),
}));
const listedProfessions = professionGroups.flatMap(
  (group) => group.professions,
);
if (listedProfessions.length !== professionRows.length) {
  throw new Error("A profession has a category the home page does not list");
}

// Zones in the order of the zone list: by median monster level, then name.
// Position-suppressed zones can have shots: their captures use landmark anchors, not published coordinates.
const zones = db
  .prepare(
    `SELECT z.id, z.name, z.level_median, z.is_dungeon
     FROM zones z
     JOIN visual_assets va
       ON va.domain = 'zone' AND va.entity_id = z.id AND va.kind = 'shot'
     ORDER BY z.level_median IS NULL, z.level_median, z.name`,
  )
  .all()
  .map((row) => ({
    id: row.id,
    name: row.name,
    levelMedian: row.level_median,
    isDungeon: row.is_dungeon === 1,
    href: `/zones/${row.id}`,
    shot: artwork("zone", row.id, "shot"),
  }));
if (zones.length === 0) throw new Error("No zone shots are recorded");

const worldMap = artwork("world", "eratiath", "map");

db.close();

const showcase = {
  worldMap,
  itemGroups,
  worldBosses,
  crafting,
  classes,
  professionGroups,
  zones,
};

const raw = `// AUTO-GENERATED by scripts/generate-home-showcase.mjs — do not edit.
// Game art and facts the home page shows, selected at prebuild time. The home
// page renders in a Cloudflare Worker and must not touch SQLite at request
// time, so the selection is baked into the bundle.

export interface ShowcaseImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

interface ShowcaseItemGroup {
  readonly label: string;
  readonly href: string;
  readonly count: number;
  readonly icon: ShowcaseImage;
}

interface ShowcaseWorldBoss {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly zone: string;
  readonly href: string;
  readonly sprite: ShowcaseImage;
  /** CSS colour of the sprite's vivid pixels, for the stage behind it. */
  readonly glow: string;
}

interface ShowcaseCraftingType {
  readonly type: string;
  readonly href: string;
  readonly count: number;
  readonly icon: ShowcaseImage;
}

interface ShowcaseClass {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly href: string;
  readonly icon: ShowcaseImage;
}

interface ShowcaseProfession {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly href: string;
  readonly icon: ShowcaseImage;
}

interface ShowcaseProfessionGroup {
  readonly label: string;
  readonly professions: readonly ShowcaseProfession[];
}

interface ShowcaseZone {
  readonly id: string;
  readonly name: string;
  readonly levelMedian: number | null;
  readonly isDungeon: boolean;
  readonly href: string;
  readonly shot: ShowcaseImage;
}

interface HomeShowcase {
  readonly worldMap: ShowcaseImage;
  readonly itemGroups: readonly ShowcaseItemGroup[];
  readonly worldBosses: readonly ShowcaseWorldBoss[];
  readonly crafting: readonly ShowcaseCraftingType[];
  readonly classes: readonly ShowcaseClass[];
  readonly professionGroups: readonly ShowcaseProfessionGroup[];
  readonly zones: readonly ShowcaseZone[];
}

export const HOME_SHOWCASE: HomeShowcase = ${JSON.stringify(showcase, null, 2)};
`;
const formatted = await format(raw, { filepath: outPath });

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, formatted);

console.log(`Wrote ${outPath}`);
