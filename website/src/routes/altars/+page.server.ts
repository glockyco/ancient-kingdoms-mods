import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
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

export const load: PageServerLoad = (): AltarsPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

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

    // Get boss from final wave (first monster in last wave for most altars)
    let bossId: string | null = null;
    let bossName: string | null = null;
    if (waves.length > 0) {
      const finalWave = waves[waves.length - 1];
      if (finalWave.monsters.length > 0) {
        bossId = finalWave.monsters[0].monster_id;
        bossName = finalWave.monsters[0].monster_name;
      }
    }

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
      bossId,
      bossName,
    };
  });

  db.close();

  return {
    altars,
  };
};
