import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type {
  AltarDetailPageData,
  AltarInfo,
  AltarWave,
  AltarReward,
  AltarBoss,
  AltarBossDrop,
} from "$lib/types/altars";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const altars = db.prepare("SELECT id FROM altars").all() as Array<{
    id: string;
  }>;
  db.close();

  return altars.map((altar) => ({ id: altar.id }));
};

export const load: PageServerLoad = ({ params }): AltarDetailPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const altarRaw = db
    .prepare(
      `
      SELECT
        a.*,
        z.name as zone_name,
        zt.name as sub_zone_name
      FROM altars a
      JOIN zones z ON z.id = a.zone_id
      LEFT JOIN zone_triggers zt ON zt.id = a.sub_zone_id
      WHERE a.id = ?
    `,
    )
    .get(params.id) as Record<string, unknown> | undefined;

  if (!altarRaw) {
    db.close();
    throw error(404, `Altar not found: ${params.id}`);
  }

  // Parse waves JSON
  const waves: AltarWave[] = altarRaw.waves
    ? JSON.parse(altarRaw.waves as string)
    : [];

  // Get activation item tooltip
  let activationItemTooltipHtml: string | null = null;
  if (altarRaw.required_activation_item_id) {
    const itemInfo = db
      .prepare("SELECT tooltip_html FROM items WHERE id = ?")
      .get(altarRaw.required_activation_item_id) as
      | {
          tooltip_html: string | null;
        }
      | undefined;
    activationItemTooltipHtml = itemInfo?.tooltip_html ?? null;
  }

  // Build rewards array with tooltip lookups (for forgotten altars)
  const rewards: AltarReward[] = [];
  const rewardTiers = ["common", "magic", "epic", "legendary"] as const;

  // Extract boss monster IDs from final wave for drop rate lookup
  const bossMonsterDrops: Map<string, number> = new Map();
  const bosses: AltarBoss[] = [];

  if (waves.length > 0) {
    const finalWave = waves[waves.length - 1];
    // Include both bosses and elites - forgotten altars use elites as final wave bosses
    const bossIds = [
      ...new Set(
        finalWave.monsters
          .filter((m) => m.is_boss || m.is_elite)
          .map((m) => m.monster_id),
      ),
    ];

    for (const monsterId of bossIds) {
      // Get monster info including combat stats
      const monsterInfo = db
        .prepare(
          "SELECT name, level, health, damage, magic_damage FROM monsters WHERE id = ?",
        )
        .get(monsterId) as
        | {
            name: string;
            level: number;
            health: number;
            damage: number;
            magic_damage: number;
          }
        | undefined;

      // Get drop rates for reward items and full drops list
      const dropsRaw = db
        .prepare(
          `
          SELECT
            json_extract(d.value, '$.item_id') as item_id,
            json_extract(d.value, '$.rate') as rate,
            json_extract(d.value, '$.quantity') as quantity
          FROM monsters m, json_each(m.drops) d
          WHERE m.id = ?
        `,
        )
        .all(monsterId) as Array<{
        item_id: string;
        rate: number;
        quantity: number;
      }>;

      // Build boss drops with item info
      const bossDrops: AltarBossDrop[] = [];
      for (const drop of dropsRaw) {
        const itemInfo = db
          .prepare("SELECT name, tooltip_html FROM items WHERE id = ?")
          .get(drop.item_id) as
          | {
              name: string;
              tooltip_html: string | null;
            }
          | undefined;

        if (itemInfo) {
          bossDrops.push({
            itemId: drop.item_id,
            itemName: itemInfo.name,
            rate: drop.rate,
            quantity: drop.quantity,
            tooltipHtml: itemInfo.tooltip_html,
          });
        }

        // Track for reward tier drop rates
        const existing = bossMonsterDrops.get(drop.item_id);
        if (!existing || drop.rate > existing) {
          bossMonsterDrops.set(drop.item_id, drop.rate);
        }
      }

      if (monsterInfo) {
        bosses.push({
          monsterId,
          monsterName: monsterInfo.name,
          level: monsterInfo.level,
          health: monsterInfo.health,
          damage: monsterInfo.damage,
          magicDamage: monsterInfo.magic_damage,
          drops: bossDrops,
        });
      }
    }
  }

  for (const tier of rewardTiers) {
    const itemId = altarRaw[`reward_${tier}_id`] as string | null;
    const itemName = altarRaw[`reward_${tier}_name`] as string | null;

    if (itemId && itemName) {
      const itemInfo = db
        .prepare("SELECT quality, tooltip_html FROM items WHERE id = ?")
        .get(itemId) as
        | { quality: number; tooltip_html: string | null }
        | undefined;

      const dropRate = bossMonsterDrops.get(itemId) ?? null;

      rewards.push({
        tier,
        itemId,
        itemName,
        quality: itemInfo?.quality ?? 0,
        tooltipHtml: itemInfo?.tooltip_html ?? null,
        dropRate,
      });
    }
  }

  const altar: AltarInfo = {
    id: altarRaw.id as string,
    name: altarRaw.name as string,
    type: altarRaw.type as string,
    zoneId: altarRaw.zone_id as string,
    zoneName: altarRaw.zone_name as string,
    subZoneId: altarRaw.sub_zone_id as string | null,
    subZoneName: altarRaw.sub_zone_name as string | null,
    positionX: altarRaw.position_x as number,
    positionY: altarRaw.position_y as number,
    positionZ: altarRaw.position_z as number,
    minLevelRequired: altarRaw.min_level_required as number,
    requiredActivationItemId: altarRaw.required_activation_item_id as
      | string
      | null,
    requiredActivationItemName: altarRaw.required_activation_item_name as
      | string
      | null,
    activationItemTooltipHtml,
    initEventMessage: altarRaw.init_event_message as string | null,
    radiusEvent: altarRaw.radius_event as number,
    usesVeteranScaling: Boolean(altarRaw.uses_veteran_scaling),
    totalWaves: altarRaw.total_waves as number,
    estimatedDurationSeconds: altarRaw.estimated_duration_seconds as number,
  };

  db.close();

  // Generate meta description
  const durationMinutes = Math.round(altar.estimatedDurationSeconds / 60);
  const description =
    altar.type === "forgotten"
      ? `${altar.name} is a Forgotten Altar in ${altar.zoneName} requiring level ${altar.minLevelRequired}+. Features ${altar.totalWaves} waves over ~${durationMinutes} minutes with tiered rewards based on effective level.`
      : `${altar.name} is an Avatar Altar in ${altar.zoneName}. Features ${altar.totalWaves} waves over ~${durationMinutes} minutes.`;

  return {
    altar,
    description,
    rewards,
    waves,
    bosses,
  };
};
