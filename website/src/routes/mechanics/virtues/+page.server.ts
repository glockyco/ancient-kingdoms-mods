import type { PageServerLoad } from "./$types";
import { queryOne } from "$lib/db.server";
import {
  loadDungeonEscorts,
  loadOfferableItems,
  loadShrines,
  loadValorQuarries,
  loadVirtueRules,
  loadVirtues,
} from "$lib/queries/virtues.server";

export const prerender = true;

export const load: PageServerLoad = () => {
  const progression = queryOne<{ max_level: number }>(
    "SELECT max_level FROM progression_rules",
  );
  if (!progression) throw new Error("Missing progression_rules.max_level");
  return {
    virtues: loadVirtues(),
    rules: loadVirtueRules(),
    shrines: loadShrines(),
    quarries: loadValorQuarries(),
    escorts: loadDungeonEscorts(),
    offerable: loadOfferableItems(),
    maxLevel: progression.max_level,
  };
};
