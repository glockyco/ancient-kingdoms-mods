import { expect, test } from "vitest";
import { load as loadZones } from "./+page.server";
import { load as loadZone } from "./[id]/+page.server";
import type { ZoneDetailData, ZonesPageData } from "$lib/types/zones";

test("zone totals count the bosses and elites each zone page lists, including altar and placeholder spawns", async () => {
  const { zones } = (await loadZones({} as never)) as ZonesPageData;
  for (const zone of zones) {
    const { monsters } = (await loadZone({
      params: { id: zone.id },
    } as never)) as ZoneDetailData;
    expect(
      { id: zone.id, bosses: zone.boss_count, elites: zone.elite_count },
      zone.name,
    ).toEqual({
      id: zone.id,
      bosses: monsters.filter((monster) => monster.is_boss).length,
      elites: monsters.filter((monster) => monster.is_elite && !monster.is_boss)
        .length,
    });
  }
});
