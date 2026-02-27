import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface HomePageData {
  counts: {
    items: number;
    monsters: number;
    npcs: number;
    classes: number;
    skills: number;
    pets: number;
    zones: number;
    quests: number;
    altars: number;
    professions: number;
    gatheringResources: number;
    recipes: number;
    chests: number;
  };
}

export const load: PageServerLoad = (): HomePageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

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

  const gatheringResourceCount = (
    db.prepare("SELECT COUNT(*) as count FROM gathering_resources").get() as {
      count: number;
    }
  ).count;

  const chestCount = (
    db.prepare("SELECT COUNT(*) as count FROM chests").get() as {
      count: number;
    }
  ).count;

  const professionCount = (
    db.prepare("SELECT COUNT(*) as count FROM professions").get() as {
      count: number;
    }
  ).count;

  const altarCount = (
    db.prepare("SELECT COUNT(*) as count FROM altars").get() as {
      count: number;
    }
  ).count;

  const classCount = (
    db.prepare("SELECT COUNT(*) as count FROM classes").get() as {
      count: number;
    }
  ).count;

  const skillCount = (
    db.prepare("SELECT COUNT(*) as count FROM skills").get() as {
      count: number;
    }
  ).count;

  const petCount = (
    db.prepare("SELECT COUNT(*) as count FROM pets").get() as {
      count: number;
    }
  ).count;

  db.close();

  return {
    counts: {
      items: itemCount,
      monsters: monsterCount,
      npcs: npcCount,
      classes: classCount,
      skills: skillCount,
      pets: petCount,
      zones: zoneCount,
      quests: questCount,
      altars: altarCount,
      professions: professionCount,
      gatheringResources: gatheringResourceCount,
      recipes: alchemyCount + craftingCount,
      chests: chestCount,
    },
  };
};
