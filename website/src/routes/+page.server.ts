import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface HomePageData {
  counts: {
    items: number;
    zones: number;
    monsters: number;
    npcs: number;
    quests: number;
    recipes: number;
    professions: number;
  };
}

export const load: PageServerLoad = (): HomePageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const itemCount = (
    db.prepare("SELECT COUNT(*) as count FROM items").get() as { count: number }
  ).count;

  const zoneCount = (
    db.prepare("SELECT COUNT(*) as count FROM zones").get() as { count: number }
  ).count;

  const monsterCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM monsters WHERE is_dummy = 0")
      .get() as { count: number }
  ).count;

  const npcCount = (
    db.prepare("SELECT COUNT(*) as count FROM npcs").get() as { count: number }
  ).count;

  const questCount = (
    db.prepare("SELECT COUNT(*) as count FROM quests").get() as {
      count: number;
    }
  ).count;

  const alchemyCount = (
    db.prepare("SELECT COUNT(*) as count FROM alchemy_recipes").get() as {
      count: number;
    }
  ).count;

  const craftingCount = (
    db.prepare("SELECT COUNT(*) as count FROM crafting_recipes").get() as {
      count: number;
    }
  ).count;

  const professionCount = (
    db.prepare("SELECT COUNT(*) as count FROM professions").get() as {
      count: number;
    }
  ).count;

  db.close();

  return {
    counts: {
      items: itemCount,
      zones: zoneCount,
      monsters: monsterCount,
      npcs: npcCount,
      quests: questCount,
      recipes: alchemyCount + craftingCount,
      professions: professionCount,
    },
  };
};
