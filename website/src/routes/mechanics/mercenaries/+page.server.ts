import { query, queryOne } from "$lib/db.server";
import type { LinearValue } from "$lib/types/skills";
import { requireLinearValue } from "$lib/utils/linear-value";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export interface DeathSaveSkill {
  id: string;
  name: string;
  energyCost: LinearValue;
  /** Seconds. Combat uses the cooldown base value at every rank. */
  cooldown: number;
}

export interface MercenaryRulesData {
  mercenaries: { id: string; type_monster: string }[];
  /** Mercenary classes that have the death save. */
  deathSaveClasses: string[];
  deathSave: DeathSaveSkill;
}

/**
 * The exporter marks GameManager.invulWarriorSkill as the only innate skill of
 * the mercenaries that Combat saves from a lethal hit.
 * Source: mods/DataExporter/Exporters/PetExporter.cs
 */
export const load: PageServerLoad = (): MercenaryRulesData => {
  const skill = queryOne<{
    id: string;
    name: string;
    energy_cost: string | null;
    cooldown: string | null;
  }>(
    `SELECT DISTINCT s.id, s.name, s.energy_cost, s.cooldown
     FROM pet_skills ps
     JOIN pets p ON p.id = ps.pet_id
     JOIN skills s ON s.id = ps.skill_id
     WHERE p.is_mercenary = 1 AND ps.is_innate = 1`,
  );
  if (!skill) throw new Error("No mercenary death save skill exported");

  return {
    mercenaries: query<{ id: string; type_monster: string }>(
      `SELECT id, type_monster FROM pets WHERE is_mercenary = 1
       ORDER BY type_monster`,
    ),
    deathSaveClasses: query<{ type_monster: string }>(
      `SELECT p.type_monster FROM pet_skills ps
       JOIN pets p ON p.id = ps.pet_id
       WHERE p.is_mercenary = 1 AND ps.is_innate = 1
       ORDER BY p.type_monster`,
    ).map((r) => r.type_monster),
    deathSave: {
      id: skill.id,
      name: skill.name,
      energyCost: requireLinearValue(
        skill.energy_cost,
        `${skill.id} energy_cost`,
      ),
      cooldown: requireLinearValue(skill.cooldown, `${skill.id} cooldown`)
        .base_value,
    },
  };
};
