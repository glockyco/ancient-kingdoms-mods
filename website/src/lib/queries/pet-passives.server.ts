import { query } from "$lib/db.server";

export interface PetHealthPassive {
  id: string;
  name: string;
}

// Source: server-scripts/Skills.cs:174-185 — learned pet passives add maximum-health percentages to non-familiar companions.
export function getPetHealthPassives(petId?: string): PetHealthPassive[] {
  return query<PetHealthPassive>(
    `SELECT DISTINCT passive.id, passive.name
     FROM skills AS summon
     JOIN json_each(summon.player_classes) AS summoning_class
     JOIN skills AS passive ON passive.is_pet_skill = 1
       AND passive.skill_type = 'passive'
     JOIN json_each(passive.player_classes) AS passive_class
       ON passive_class.value = summoning_class.value
     JOIN pets ON pets.id = summon.pet_id
     WHERE pets.is_mercenary = 0 AND pets.is_familiar = 0
       AND (? IS NULL OR pets.id = ?)
       AND (COALESCE(json_extract(passive.health_max_percent_bonus, '$.base_value'), 0) > 0
         OR COALESCE(json_extract(passive.health_max_percent_bonus, '$.bonus_per_level'), 0) > 0)
     ORDER BY passive.name`,
    [petId ?? null, petId ?? null],
  );
}
