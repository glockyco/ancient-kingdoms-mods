import { getDb } from "$lib/db.server";
import { createListPagination } from "$lib/server/list-pagination";
import type { PageServerLoad } from "./$types";
import type {
  AltarsPageData,
  AltarListView,
  AltarWave,
} from "$lib/types/altars";

export const prerender = true;

interface AltarRaw {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  zoneName: string;
  minLevelRequired: number;
  totalWaves: number;
  usesVeteranScaling: number;
  waves: string | null;
}

const loadData = (): AltarsPageData => {
  const db = getDb();

  const altarsRaw = db
    .prepare(
      `
      SELECT
        a.id,
        a.name,
        a.type,
        a.zone_id as zoneId,
        z.name as zoneName,
        a.min_level_required as minLevelRequired,
        a.total_waves as totalWaves,
        a.uses_veteran_scaling as usesVeteranScaling,
        a.waves
      FROM altars a
      JOIN zones z ON z.id = a.zone_id
      ORDER BY a.min_level_required, a.name
    `,
    )
    .all() as AltarRaw[];

  const altars: AltarListView[] = altarsRaw.map((raw) => {
    const waves: AltarWave[] = raw.waves ? JSON.parse(raw.waves) : [];

    // Count total enemies across all waves
    let totalEnemies = 0;
    for (const wave of waves) {
      totalEnemies += wave.monsters.length;
    }

    // Get bosses/elites from final wave
    const bosses =
      waves.length > 0
        ? waves[waves.length - 1].monsters.filter(
            (m) => m.is_boss || m.is_elite,
          )
        : [];

    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      zoneId: raw.zoneId,
      zoneName: raw.zoneName,
      minLevelRequired: raw.minLevelRequired,
      totalWaves: raw.totalWaves,
      usesVeteranScaling: Boolean(raw.usesVeteranScaling),
      totalEnemies,
      bossIds: bosses.map((b) => b.monster_id),
      bossNames: bosses.map((b) => b.monster_name),
    };
  });

  return {
    altars,
  };
};

export const _pagination = createListPagination(
  "/altars",
  20,
  loadData,
  (data) => data.altars.length,
);
export const load = _pagination.load satisfies PageServerLoad;
