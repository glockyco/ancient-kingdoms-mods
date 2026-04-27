import Database from "better-sqlite3";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import { SITE_URL } from "$lib/seo/site";

export const prerender = true;

interface EntityDef {
  table: string;
  route: string;
}

const ENTITIES: EntityDef[] = [
  { table: "items", route: "items" },
  { table: "monsters", route: "monsters" },
  { table: "npcs", route: "npcs" },
  { table: "zones", route: "zones" },
  { table: "quests", route: "quests" },
  { table: "chests", route: "chests" },
  { table: "gathering_resources", route: "gather-items" },
  { table: "skills", route: "skills" },
  { table: "classes", route: "classes" },
  { table: "altars", route: "altars" },
];

const STATIC_ROUTES = [
  "/",
  "/map",
  "/items",
  "/monsters",
  "/npcs",
  "/zones",
  "/quests",
  "/recipes",
  "/chests",
  "/gather-items",
  "/skills",
  "/classes",
  "/altars",
  "/pets",
  "/professions",
  "/professions/adventuring",
  "/professions/alchemy",
  "/professions/cooking",
  "/professions/exploring",
  "/professions/herbalism",
  "/professions/hunter",
  "/professions/lore_keeping",
  "/professions/mining",
  "/professions/radiant_seeker",
  "/professions/scroll_mastery",
  "/professions/slayer",
  "/professions/treasure_hunter",
];

export function GET() {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const urls: string[] = [];

  // Add static routes
  for (const route of STATIC_ROUTES) {
    urls.push(`${SITE_URL}${route}`);
  }

  // Add dynamic entity routes
  for (const { table, route } of ENTITIES) {
    const rows = db.prepare(`SELECT id FROM ${table}`).all() as {
      id: string;
    }[];
    for (const row of rows) {
      urls.push(`${SITE_URL}/${route}/${row.id}`);
    }
  }

  // Add pets (named mercenaries excluded)
  const petIds = db
    .prepare(
      `SELECT id FROM pets WHERE id NOT IN ('rolim', 'nieven', 'bemere', 'ciliren')`,
    )
    .all() as { id: string }[];
  for (const row of petIds) {
    urls.push(`${SITE_URL}/pets/${row.id}`);
  }

  // Add recipes (two tables)
  const craftingRecipes = db
    .prepare("SELECT id FROM crafting_recipes")
    .all() as { id: string }[];
  const alchemyRecipes = db.prepare("SELECT id FROM alchemy_recipes").all() as {
    id: string;
  }[];
  const scribingRecipes = db
    .prepare("SELECT id FROM scribing_recipes")
    .all() as { id: string }[];
  for (const row of [
    ...craftingRecipes,
    ...alchemyRecipes,
    ...scribingRecipes,
  ]) {
    urls.push(`${SITE_URL}/recipes/${row.id}`);
  }

  db.close();

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
