import { query } from "$lib/db";

/**
 * Drop item for popup display
 */
export interface PopupDropItem {
  itemId: string;
  itemName: string;
  quality: number;
  dropRate: number;
  dropRateMax?: number;
  tooltipHtml: string | null;
  isBestiary?: boolean;
  isRandomItem?: boolean;
  randomItemOutcomes?: Array<{
    itemId: string;
    itemName: string;
  }>;
}

/**
 * Quest info for NPC popup
 */
export interface PopupQuestInfo {
  id: string;
  name: string;
  levelRecommended: number;
}

/**
 * Item sold info for NPC popup
 */
export interface PopupItemSoldInfo {
  itemId: string;
  itemName: string;
  quality: number;
  price: number;
  tooltipHtml: string | null;
}

/**
 * Altar reward info for popup
 */
export interface PopupAltarReward {
  tier: "normal" | "magic" | "epic" | "legendary";
  minEffectiveLevel: number;
  itemId: string;
  itemName: string;
  quality: number;
  dropRate: number | null;
  tooltipHtml: string | null;
}

/**
 * Monster popup details (lazy-loaded)
 */
export interface MonsterPopupDetails {
  drops: PopupDropItem[];
}

/**
 * NPC popup details (lazy-loaded)
 */
export interface NpcPopupDetails {
  quests: PopupQuestInfo[];
  itemsSold: PopupItemSoldInfo[];
}

/**
 * Chest popup details (lazy-loaded)
 */
export interface ChestPopupDetails {
  drops: PopupDropItem[];
}

/**
 * Gathering popup details (lazy-loaded)
 */
export interface GatheringPopupDetails {
  drops: PopupDropItem[];
}

/**
 * Altar popup details (lazy-loaded)
 */
export interface AltarPopupDetails {
  rewards: PopupAltarReward[];
}

interface MonsterDropRow {
  item_id: string;
  item_name: string;
  quality: number;
  rate: number;
  is_bestiary_drop: number;
  tooltip_html: string | null;
}

/**
 * Load monster drops for popup
 * @param showBestiaryOnly - If true, show only bestiary drops (for bosses/elites). If false, show all drops (for hunts).
 */
export async function loadMonsterPopupDetails(
  monsterId: string,
  showBestiaryOnly: boolean,
): Promise<MonsterPopupDetails> {
  // Query drops from JSON and join with items to get is_bestiary_drop flag and tooltip
  const drops = await query<MonsterDropRow>(
    `
    SELECT
      json_extract(d.value, '$.item_id') as item_id,
      json_extract(d.value, '$.item_name') as item_name,
      COALESCE(i.quality, json_extract(d.value, '$.quality')) as quality,
      json_extract(d.value, '$.rate') as rate,
      COALESCE(i.is_bestiary_drop, 0) as is_bestiary_drop,
      i.tooltip_html
    FROM monsters m, json_each(m.drops) d
    LEFT JOIN items i ON i.id = json_extract(d.value, '$.item_id')
    WHERE m.id = ?
    ORDER BY rate DESC
    `,
    [monsterId],
  );

  if (drops.length === 0) {
    return { drops: [] };
  }

  let filteredDrops: MonsterDropRow[];
  if (showBestiaryOnly) {
    // For bosses/elites: show bestiary drops only
    const bestiaryDrops = drops.filter((d) => d.is_bestiary_drop);
    // If no bestiary drops, fall back to top 5
    filteredDrops =
      bestiaryDrops.length > 0 ? bestiaryDrops : drops.slice(0, 5);
  } else {
    // For hunts: show all drops
    filteredDrops = drops;
  }

  return {
    drops: filteredDrops.map((d) => ({
      itemId: d.item_id,
      itemName: d.item_name,
      quality: d.quality,
      dropRate: d.rate,
      tooltipHtml: d.tooltip_html,
      isBestiary: Boolean(d.is_bestiary_drop),
    })),
  };
}

interface NpcQuestRow {
  id: string;
  name: string;
  level_recommended: number;
}

interface NpcItemSoldRow {
  item_id: string;
  item_name: string;
  quality: number;
  price: number;
}

/**
 * Load NPC details for popup (all quests and items sold)
 */
export async function loadNpcPopupDetails(
  npcId: string,
): Promise<NpcPopupDetails> {
  const [npc] = await query<{
    quests_offered: string | null;
    items_sold: string | null;
  }>(`SELECT quests_offered, items_sold FROM npcs WHERE id = ?`, [npcId]);

  if (!npc) {
    return { quests: [], itemsSold: [] };
  }

  let quests: PopupQuestInfo[] = [];
  let itemsSold: PopupItemSoldInfo[] = [];

  try {
    if (npc.quests_offered) {
      const questsData = JSON.parse(npc.quests_offered) as NpcQuestRow[];
      quests = questsData
        .map((q) => ({
          id: q.id,
          name: q.name,
          levelRecommended: q.level_recommended,
        }))
        .sort((a, b) => {
          // Sort by level ascending, then by name alphabetically
          if (a.levelRecommended !== b.levelRecommended) {
            return a.levelRecommended - b.levelRecommended;
          }
          return a.name.localeCompare(b.name);
        });
    }
  } catch {
    /* empty */
  }

  try {
    if (npc.items_sold) {
      const itemsData = JSON.parse(npc.items_sold) as NpcItemSoldRow[];
      // Fetch tooltips for all items in one query
      const itemIds = itemsData.map((i) => i.item_id);
      const tooltips = await query<{ id: string; tooltip_html: string | null }>(
        `SELECT id, tooltip_html FROM items WHERE id IN (${itemIds.map(() => "?").join(",")})`,
        itemIds,
      );
      const tooltipMap = new Map(tooltips.map((t) => [t.id, t.tooltip_html]));

      itemsSold = itemsData
        .map((i) => ({
          itemId: i.item_id,
          itemName: i.item_name,
          quality: i.quality,
          price: i.price,
          tooltipHtml: tooltipMap.get(i.item_id) ?? null,
        }))
        .sort((a, b) => {
          // Sort by quality descending, then by name alphabetically
          if (a.quality !== b.quality) {
            return b.quality - a.quality;
          }
          return a.itemName.localeCompare(b.itemName);
        });
    }
  } catch {
    /* empty */
  }

  return { quests, itemsSold };
}

interface ChestDropRow {
  item_id: string;
  item_name: string;
  quality: number;
  drop_rate: number;
  random_items_with_names: string | null;
  tooltip_html: string | null;
}

/**
 * Load chest drops for popup, including the main item reward and additional drops
 */
export async function loadChestPopupDetails(
  chestId: string,
): Promise<ChestPopupDetails> {
  // Get main item reward from chest + additional drops from chest_drops
  const rows = await query<ChestDropRow>(
    `
    -- Main item reward from chest
    SELECT
      c.item_reward_id as item_id,
      i.name as item_name,
      i.quality,
      c.chest_reward_probability as drop_rate,
      i.random_items_with_names,
      i.tooltip_html
    FROM chests c
    JOIN items i ON i.id = c.item_reward_id
    WHERE c.id = ? AND c.item_reward_id IS NOT NULL

    UNION ALL

    -- Additional drops from chest_drops
    SELECT
      cd.item_id,
      i.name as item_name,
      i.quality,
      cd.drop_rate,
      i.random_items_with_names,
      i.tooltip_html
    FROM chest_drops cd
    JOIN items i ON i.id = cd.item_id
    WHERE cd.chest_id = ?

    ORDER BY drop_rate DESC
  `,
    [chestId, chestId],
  );

  return {
    drops: rows.map((r) => {
      const drop: PopupDropItem = {
        itemId: r.item_id,
        itemName: r.item_name,
        quality: r.quality,
        dropRate: r.drop_rate,
        tooltipHtml: r.tooltip_html,
      };

      // Check if this is a random item
      if (r.random_items_with_names) {
        try {
          const outcomes = JSON.parse(r.random_items_with_names) as Array<{
            item_id: string;
            item_name: string;
          }>;
          drop.isRandomItem = true;
          drop.randomItemOutcomes = outcomes.map((o) => ({
            itemId: o.item_id,
            itemName: o.item_name,
          }));
        } catch {
          /* empty */
        }
      }

      return drop;
    }),
  };
}

interface GatheringDropRow {
  item_id: string;
  item_name: string;
  quality: number;
  drop_rate: number;
  drop_rate_max: number | null;
  tooltip_html: string | null;
}

/**
 * Load gathering resource drops for popup.
 * Includes the primary (guaranteed) drop and secondary random drops.
 * For secondary drops, uses actual_drop_chance = (1/N) * drop_rate.
 * For radiant sparks, radiant aether drop is 0-5% based on skill, not guaranteed.
 */
export async function loadGatheringPopupDetails(
  resourceId: string,
): Promise<GatheringPopupDetails> {
  const rows = await query<GatheringDropRow>(
    `
    -- Primary drop from gathering_resources
    -- For radiant sparks, radiant aether is 0-5% based on skill
    -- For plants/minerals, it's guaranteed (100%)
    SELECT
      gr.item_reward_id as item_id,
      i.name as item_name,
      i.quality,
      CASE WHEN gr.is_radiant_spark = 1 THEN 0.0 ELSE 1.0 END as drop_rate,
      CASE WHEN gr.is_radiant_spark = 1 THEN 0.05 ELSE NULL END as drop_rate_max,
      i.tooltip_html
    FROM gathering_resources gr
    JOIN items i ON i.id = gr.item_reward_id
    WHERE gr.id = ? AND gr.item_reward_id IS NOT NULL

    UNION ALL

    -- Secondary random drops with actual drop chance
    SELECT
      grd.item_id,
      i.name as item_name,
      i.quality,
      COALESCE(grd.actual_drop_chance, grd.drop_rate) as drop_rate,
      NULL as drop_rate_max,
      i.tooltip_html
    FROM gathering_resource_drops grd
    JOIN items i ON i.id = grd.item_id
    WHERE grd.resource_id = ?

    ORDER BY drop_rate DESC
  `,
    [resourceId, resourceId],
  );

  return {
    drops: rows.map((r) => ({
      itemId: r.item_id,
      itemName: r.item_name,
      quality: r.quality,
      dropRate: r.drop_rate,
      dropRateMax: r.drop_rate_max ?? undefined,
      tooltipHtml: r.tooltip_html,
    })),
  };
}

/**
 * Load altar rewards for popup with level scaling info and drop rates
 */
export async function loadAltarPopupDetails(
  altarId: string,
): Promise<AltarPopupDetails> {
  const [altar] = await query<{
    reward_normal_id: string | null;
    reward_normal_name: string | null;
    reward_magic_id: string | null;
    reward_magic_name: string | null;
    reward_epic_id: string | null;
    reward_epic_name: string | null;
    reward_legendary_id: string | null;
    reward_legendary_name: string | null;
    waves: string | null;
  }>(
    `
    SELECT
      reward_normal_id, reward_normal_name,
      reward_magic_id, reward_magic_name,
      reward_epic_id, reward_epic_name,
      reward_legendary_id, reward_legendary_name,
      waves
    FROM altars
    WHERE id = ?
  `,
    [altarId],
  );

  if (!altar) {
    return { rewards: [] };
  }

  // Extract boss monster ID from final wave
  const bossMonsterDrops: Map<string, number> = new Map();
  if (altar.waves) {
    try {
      const waves = JSON.parse(altar.waves) as Array<{
        monsters: Array<{ monster_id: string }>;
      }>;
      if (waves.length > 0) {
        const finalWave = waves[waves.length - 1];
        // Get unique boss monster IDs from final wave
        const bossIds = [
          ...new Set(finalWave.monsters.map((m) => m.monster_id)),
        ];
        // Look up each boss's drops
        for (const bossId of bossIds) {
          const [boss] = await query<{ drops: string | null }>(
            `SELECT drops FROM monsters WHERE id = ?`,
            [bossId],
          );
          if (boss?.drops) {
            try {
              const drops = JSON.parse(boss.drops) as Array<{
                item_id: string;
                rate: number;
              }>;
              for (const drop of drops) {
                // Keep the highest rate if item appears in multiple boss drops
                const existing = bossMonsterDrops.get(drop.item_id);
                if (!existing || drop.rate > existing) {
                  bossMonsterDrops.set(drop.item_id, drop.rate);
                }
              }
            } catch {
              // Invalid drops JSON
            }
          }
        }
      }
    } catch {
      // Invalid waves JSON
    }
  }

  const rewards: PopupAltarReward[] = [];

  // Add rewards in order with level thresholds
  const tiers: Array<{
    tier: "normal" | "magic" | "epic" | "legendary";
    minLevel: number;
    idKey: keyof typeof altar;
    nameKey: keyof typeof altar;
  }> = [
    {
      tier: "normal",
      minLevel: 0,
      idKey: "reward_normal_id",
      nameKey: "reward_normal_name",
    },
    {
      tier: "magic",
      minLevel: 35,
      idKey: "reward_magic_id",
      nameKey: "reward_magic_name",
    },
    {
      tier: "epic",
      minLevel: 45,
      idKey: "reward_epic_id",
      nameKey: "reward_epic_name",
    },
    {
      tier: "legendary",
      minLevel: 55,
      idKey: "reward_legendary_id",
      nameKey: "reward_legendary_name",
    },
  ];

  for (const { tier, minLevel, idKey, nameKey } of tiers) {
    const itemId = altar[idKey];
    const itemName = altar[nameKey];
    if (itemId && itemName) {
      // Get item quality and tooltip
      const [item] = await query<{
        quality: number;
        tooltip_html: string | null;
      }>(`SELECT quality, tooltip_html FROM items WHERE id = ?`, [itemId]);
      // Get drop rate from boss monster drops
      const dropRate = bossMonsterDrops.get(itemId as string) ?? null;
      rewards.push({
        tier,
        minEffectiveLevel: minLevel,
        itemId: itemId as string,
        itemName: itemName as string,
        quality: item?.quality ?? 0,
        dropRate,
        tooltipHtml: item?.tooltip_html ?? null,
      });
    }
  }

  return { rewards };
}
