import type { PageServerLoad } from "./$types";
import { getDb, query } from "$lib/db.server";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { getSeasonalEvents } from "$lib/queries/seasonal-events.server";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";

export const prerender = true;

export const load = (async () => {
  const data = await getSeasonalEvents(async (sql, params) =>
    query(sql, [...params]),
  );
  const treats = Object.values(data.items).filter((item) => item.food_buff_id);
  const effects = skillEffectInputs(
    treats.map((item) => ({
      id: item.food_buff_id!,
      runtimeLevel: item.food_buff_level,
    })),
  );
  treats.forEach((item, index) => {
    item.effect = formatSkillEffect(effects[index]);
  });
  return {
    ...data,
    itemIconPaths: getItemIconPaths(getDb(), Object.keys(data.items)),
  };
}) satisfies PageServerLoad;
