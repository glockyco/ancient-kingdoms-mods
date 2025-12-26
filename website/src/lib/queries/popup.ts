import { query } from "$lib/db";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";

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
 * Boss drop info for altar popup
 */
export interface PopupAltarBossDrop {
  monsterId: string;
  monsterName: string;
  drops: PopupDropItem[];
}

/**
 * Altar popup details (lazy-loaded)
 */
export interface AltarPopupDetails {
  rewards: PopupAltarReward[];
  bossDrops: PopupAltarBossDrop[];
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
 * Load monster drops for popup - all drops, bestiary items first
 */
export async function loadMonsterPopupDetails(
  monsterId: string,
): Promise<MonsterPopupDetails> {
  // Query all drops, ordered with bestiary items first, then by drop rate
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
    ORDER BY is_bestiary_drop DESC, rate DESC
    `,
    [monsterId],
  );

  return {
    drops: drops.map((d) => ({
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
 * Altar info with name (for monster popup altar links)
 */
export interface AltarBasicInfo {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
}

/**
 * Load basic altar info (id, name, zone)
 */
export async function loadAltarBasicInfo(
  altarId: string,
): Promise<AltarBasicInfo | null> {
  const [altar] = await query<{
    id: string;
    name: string;
    zone_id: string;
    zone_name: string;
  }>(
    `SELECT a.id, a.name, a.zone_id, z.name as zone_name FROM altars a JOIN zones z ON z.id = a.zone_id WHERE a.id = ?`,
    [altarId],
  );
  return altar
    ? {
        id: altar.id,
        name: altar.name,
        zoneId: altar.zone_id,
        zoneName: altar.zone_name,
      }
    : null;
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
    return { rewards: [], bossDrops: [] };
  }

  // Collect altar reward item IDs to exclude from boss drops
  const altarRewardIds = new Set<string>(
    [
      altar.reward_normal_id,
      altar.reward_magic_id,
      altar.reward_epic_id,
      altar.reward_legendary_id,
    ].filter((id): id is string => id !== null),
  );

  // Extract boss monster ID from final wave and get drop rates
  const bossMonsterDrops: Map<string, number> = new Map();
  const bossDrops: PopupAltarBossDrop[] = [];
  let bossIds: string[] = [];

  if (altar.waves) {
    try {
      const waves = JSON.parse(altar.waves) as Array<{
        monsters: Array<{ monster_id: string }>;
      }>;
      if (waves.length > 0) {
        const finalWave = waves[waves.length - 1];
        bossIds = [...new Set(finalWave.monsters.map((m) => m.monster_id))];

        // Look up each boss monster's bestiary drops
        for (const monsterId of bossIds) {
          const drops = await query<{
            monster_name: string;
            item_id: string;
            item_name: string;
            quality: number;
            rate: number;
            tooltip_html: string | null;
          }>(
            `
            SELECT
              m.name as monster_name,
              json_extract(d.value, '$.item_id') as item_id,
              json_extract(d.value, '$.item_name') as item_name,
              COALESCE(i.quality, json_extract(d.value, '$.quality')) as quality,
              json_extract(d.value, '$.rate') as rate,
              i.tooltip_html
            FROM monsters m, json_each(m.drops) d
            LEFT JOIN items i ON i.id = json_extract(d.value, '$.item_id')
            WHERE m.id = ?
              AND (m.is_boss = 1 OR m.is_elite = 1)
              AND i.is_bestiary_drop = 1
            ORDER BY rate DESC
            `,
            [monsterId],
          );

          if (drops.length > 0) {
            // Track max rates for bestiary drops
            for (const drop of drops) {
              const existing = bossMonsterDrops.get(drop.item_id);
              if (!existing || drop.rate > existing) {
                bossMonsterDrops.set(drop.item_id, drop.rate);
              }
            }

            // Filter out altar rewards for display (they're shown in the Rewards section)
            const filteredDrops = drops.filter(
              (d) => !altarRewardIds.has(d.item_id),
            );

            if (filteredDrops.length > 0) {
              bossDrops.push({
                monsterId,
                monsterName: drops[0].monster_name,
                drops: filteredDrops.map((d) => ({
                  itemId: d.item_id,
                  itemName: d.item_name,
                  quality: d.quality,
                  dropRate: d.rate,
                  tooltipHtml: d.tooltip_html,
                  isBestiary: true,
                })),
              });
            }
          }
        }
      }
    } catch {
      // Invalid waves JSON
    }
  }

  // Get drop rates for altar reward items from boss drops (not bestiary-restricted)
  if (bossIds.length > 0 && altarRewardIds.size > 0) {
    const rewardIdList = [...altarRewardIds];
    for (const monsterId of bossIds) {
      const rewardDrops = await query<{ item_id: string; rate: number }>(
        `
        SELECT
          json_extract(d.value, '$.item_id') as item_id,
          json_extract(d.value, '$.rate') as rate
        FROM monsters m, json_each(m.drops) d
        WHERE m.id = ?
          AND json_extract(d.value, '$.item_id') IN (${rewardIdList.map(() => "?").join(",")})
        `,
        [monsterId, ...rewardIdList],
      );
      for (const drop of rewardDrops) {
        const existing = bossMonsterDrops.get(drop.item_id);
        if (!existing || drop.rate > existing) {
          bossMonsterDrops.set(drop.item_id, drop.rate);
        }
      }
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

  return { rewards, bossDrops };
}

/**
 * Virtual monster popup details (for altar-only monsters)
 */
export interface VirtualMonsterPopupDetails {
  id: string;
  name: string;
  level: number;
  isBoss: boolean;
  isElite: boolean;
  altars: Array<{
    id: string;
    name: string;
    zoneName: string;
  }>;
  drops: PopupDropItem[];
}

interface VirtualMonsterRow {
  id: string;
  name: string;
  level: number;
  is_boss: number;
  is_elite: number;
}

interface VirtualMonsterAltarRow {
  altar_id: string;
  altar_name: string;
  zone_name: string;
}

/**
 * Load details for an altar-only monster (virtual entity).
 * These monsters don't have regular spawns - they only appear in altar events.
 */
export async function loadVirtualMonsterPopupDetails(
  monsterId: string,
): Promise<VirtualMonsterPopupDetails | null> {
  // Get basic monster info
  const [monster] = await query<VirtualMonsterRow>(
    `SELECT id, name, level, is_boss, is_elite FROM monsters WHERE id = ?`,
    [monsterId],
  );

  if (!monster) {
    return null;
  }

  // Get altars that spawn this monster (from altar spawns)
  const altars = await query<VirtualMonsterAltarRow>(
    `
    SELECT DISTINCT
      a.id as altar_id,
      a.name as altar_name,
      z.name as zone_name
    FROM monster_spawns ms
    JOIN altars a ON a.id = ms.source_altar_id
    JOIN zones z ON z.id = a.zone_id
    WHERE ms.monster_id = ? AND ms.spawn_type = 'altar'
    ORDER BY z.name, a.name
    `,
    [monsterId],
  );

  // Get all drops (bestiary items ordered first)
  const dropsResult = await loadMonsterPopupDetails(monsterId);

  return {
    id: monster.id,
    name: monster.name,
    level: monster.level,
    isBoss: Boolean(monster.is_boss),
    isElite: Boolean(monster.is_elite),
    altars: altars.map((a) => ({
      id: a.altar_id,
      name: a.altar_name,
      zoneName: a.zone_name,
    })),
    drops: dropsResult.drops,
  };
}

// ============================================================================
// Item Popup (virtual entity)
// ============================================================================

/**
 * Monster that drops an item
 */
export interface ItemPopupDropper {
  monsterId: string;
  monsterName: string;
  level: number;
  isBoss: boolean;
  isElite: boolean;
  dropRate: number;
  zoneName: string | null;
}

/**
 * Item popup details (virtual entity - no map position)
 */
export interface ItemPopupDetails {
  id: string;
  name: string;
  quality: number;
  tooltipHtml: string | null;
  droppers: ItemPopupDropper[];
}

interface ItemPopupRow {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
}

interface ItemDropperRow {
  monster_id: string;
  monster_name: string;
  level: number;
  is_boss: number;
  is_elite: number;
  drop_rate: number;
  zone_name: string | null;
}

/**
 * Load item details for popup (virtual entity).
 * Shows item info and monsters that drop it.
 */
export async function loadItemPopupDetails(
  itemId: string,
): Promise<ItemPopupDetails | null> {
  // Get item info
  const [item] = await query<ItemPopupRow>(
    `SELECT id, name, quality, tooltip_html FROM items WHERE id = ?`,
    [itemId],
  );

  if (!item) {
    return null;
  }

  // Get monsters that drop this item (from monsters.drops JSON column)
  const droppers = await query<ItemDropperRow>(
    `
    SELECT DISTINCT
      m.id as monster_id,
      m.name as monster_name,
      COALESCE(MIN(ms.level), m.level) as level,
      m.is_boss,
      m.is_elite,
      json_extract(d.value, '$.rate') as drop_rate,
      z.name as zone_name
    FROM monsters m, json_each(m.drops) d
    LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
      AND ms.spawn_type IN ('regular', 'summon', 'placeholder')
    LEFT JOIN zones z ON z.id = ms.zone_id
    WHERE json_extract(d.value, '$.item_id') = ?
    GROUP BY m.id
    ORDER BY drop_rate DESC, m.level ASC
    `,
    [itemId],
  );

  return {
    id: item.id,
    name: item.name,
    quality: item.quality,
    tooltipHtml: item.tooltip_html,
    droppers: droppers.map((d) => ({
      monsterId: d.monster_id,
      monsterName: d.monster_name,
      level: d.level,
      isBoss: Boolean(d.is_boss),
      isElite: Boolean(d.is_elite),
      dropRate: d.drop_rate,
      zoneName: d.zone_name,
    })),
  };
}

// ============================================================================
// Quest Popup (virtual entity)
// ============================================================================

/**
 * NPC associated with a quest
 */
export interface QuestPopupNpc {
  npcId: string;
  npcName: string;
  zoneName: string | null;
  isGiver: boolean;
  isTurnIn: boolean;
}

/**
 * Quest popup details (virtual entity - no map position)
 */
export interface QuestRewardItem {
  itemId: string;
  itemName: string;
  quality: number;
  classSpecific: string | null;
  tooltipHtml: string | null;
}

export interface QuestObjective {
  type: "kill" | "gather" | "have" | "deliver" | "equip" | "find" | "discover";
  targetId: string | null;
  targetName: string;
  amount: number;
  quality?: number;
  tooltipHtml?: string | null;
}

export interface QuestPopupDetails {
  id: string;
  name: string;
  levelRecommended: number;
  displayType: string;
  isMainQuest: boolean;
  isEpicQuest: boolean;
  isAdventurerQuest: boolean;
  isRepeatable: boolean;
  gold: number;
  exp: number;
  rewardItems: QuestRewardItem[];
  objectives: QuestObjective[];
  npcs: QuestPopupNpc[];
}

interface QuestPopupRow {
  id: string;
  name: string;
  level_recommended: number;
  display_type: string;
  is_main_quest: number;
  is_epic_quest: number;
  is_adventurer_quest: number;
  is_repeatable: number;
  rewards: string | null;
  kill_target_1_id: string | null;
  kill_target_1_name: string | null;
  kill_amount_1: number;
  kill_target_2_id: string | null;
  kill_target_2_name: string | null;
  kill_amount_2: number;
  gather_item_1_id: string | null;
  gather_item_1_name: string | null;
  gather_item_1_quality: number | null;
  gather_item_1_tooltip: string | null;
  gather_amount_1: number;
  gather_item_2_id: string | null;
  gather_item_2_name: string | null;
  gather_item_2_quality: number | null;
  gather_item_2_tooltip: string | null;
  gather_amount_2: number;
  gather_item_3_id: string | null;
  gather_item_3_name: string | null;
  gather_item_3_quality: number | null;
  gather_item_3_tooltip: string | null;
  gather_amount_3: number;
  gather_items: string | null;
  objectives: string | null;
  equip_items: string | null;
  remove_items_on_complete: number;
  start_npc_id: string | null;
  end_npc_id: string | null;
  is_find_npc_quest: number;
  end_npc_name: string | null;
  discovered_location: string | null;
  discovered_location_zone_name: string | null;
}

/**
 * Load quest details for popup (virtual entity).
 * Shows quest info and NPCs that give/accept it.
 */
export async function loadQuestPopupDetails(
  questId: string,
): Promise<QuestPopupDetails | null> {
  // Get quest info with objectives and rewards
  const [quest] = await query<QuestPopupRow>(
    `
    SELECT
      q.id, q.name, q.level_recommended, q.display_type,
      q.is_main_quest, q.is_epic_quest, q.is_adventurer_quest, q.is_repeatable,
      q.rewards,
      q.kill_target_1_id, m1.name as kill_target_1_name, q.kill_amount_1,
      q.kill_target_2_id, m2.name as kill_target_2_name, q.kill_amount_2,
      q.gather_item_1_id, i1.name as gather_item_1_name, i1.quality as gather_item_1_quality, i1.tooltip_html as gather_item_1_tooltip, q.gather_amount_1,
      q.gather_item_2_id, i2.name as gather_item_2_name, i2.quality as gather_item_2_quality, i2.tooltip_html as gather_item_2_tooltip, q.gather_amount_2,
      q.gather_item_3_id, i3.name as gather_item_3_name, i3.quality as gather_item_3_quality, i3.tooltip_html as gather_item_3_tooltip, q.gather_amount_3,
      q.gather_items, q.objectives, q.equip_items, q.remove_items_on_complete,
      q.start_npc_id, q.end_npc_id,
      q.is_find_npc_quest, end_npc.name as end_npc_name,
      q.discovered_location, dlz.name as discovered_location_zone_name
    FROM quests q
    LEFT JOIN monsters m1 ON m1.id = q.kill_target_1_id
    LEFT JOIN monsters m2 ON m2.id = q.kill_target_2_id
    LEFT JOIN items i1 ON i1.id = q.gather_item_1_id
    LEFT JOIN items i2 ON i2.id = q.gather_item_2_id
    LEFT JOIN items i3 ON i3.id = q.gather_item_3_id
    LEFT JOIN npcs end_npc ON end_npc.id = q.end_npc_id
    LEFT JOIN zones dlz ON dlz.id = q.discovered_location_zone_id
    WHERE q.id = ?
    `,
    [questId],
  );

  if (!quest) {
    return null;
  }

  // Parse rewards JSON
  let gold = 0;
  let exp = 0;
  let rewardItems: QuestRewardItem[] = [];
  if (quest.rewards) {
    try {
      const rewards = JSON.parse(quest.rewards) as {
        gold?: number;
        exp?: number;
        items?: Array<{ item_id: string; class_specific: string | null }>;
      };
      gold = rewards.gold ?? 0;
      exp = rewards.exp ?? 0;
      if (rewards.items && rewards.items.length > 0) {
        // Fetch item names and qualities
        const itemIds = rewards.items.map((i) => i.item_id);
        const itemRows = await query<{
          id: string;
          name: string;
          quality: number;
          tooltip_html: string | null;
        }>(
          `SELECT id, name, quality, tooltip_html FROM items WHERE id IN (${itemIds.map(() => "?").join(",")})`,
          itemIds,
        );
        const itemMap = new Map(itemRows.map((i) => [i.id, i]));
        rewardItems = rewards.items.map((ri) => {
          const item = itemMap.get(ri.item_id);
          return {
            itemId: ri.item_id,
            itemName: item?.name ?? ri.item_id,
            quality: item?.quality ?? 0,
            classSpecific: ri.class_specific,
            tooltipHtml: item?.tooltip_html ?? null,
          };
        });
      }
    } catch {
      // Invalid JSON
    }
  }

  // Build objectives array
  const objectives: QuestObjective[] = [];

  // Kill objectives from legacy columns
  if (quest.kill_target_1_id && quest.kill_amount_1 > 0) {
    objectives.push({
      type: "kill",
      targetId: quest.kill_target_1_id,
      targetName: quest.kill_target_1_name ?? quest.kill_target_1_id,
      amount: quest.kill_amount_1,
    });
  }
  if (quest.kill_target_2_id && quest.kill_amount_2 > 0) {
    objectives.push({
      type: "kill",
      targetId: quest.kill_target_2_id,
      targetName: quest.kill_target_2_name ?? quest.kill_target_2_id,
      amount: quest.kill_amount_2,
    });
  }

  // Gather objectives from legacy columns
  if (quest.gather_item_1_id && quest.gather_amount_1 > 0) {
    objectives.push({
      type: "gather",
      targetId: quest.gather_item_1_id,
      targetName: quest.gather_item_1_name ?? quest.gather_item_1_id,
      amount: quest.gather_amount_1,
      quality: quest.gather_item_1_quality ?? undefined,
      tooltipHtml: quest.gather_item_1_tooltip,
    });
  }
  if (quest.gather_item_2_id && quest.gather_amount_2 > 0) {
    objectives.push({
      type: "gather",
      targetId: quest.gather_item_2_id,
      targetName: quest.gather_item_2_name ?? quest.gather_item_2_id,
      amount: quest.gather_amount_2,
      quality: quest.gather_item_2_quality ?? undefined,
      tooltipHtml: quest.gather_item_2_tooltip,
    });
  }
  if (quest.gather_item_3_id && quest.gather_amount_3 > 0) {
    objectives.push({
      type: "gather",
      targetId: quest.gather_item_3_id,
      targetName: quest.gather_item_3_name ?? quest.gather_item_3_id,
      amount: quest.gather_amount_3,
      quality: quest.gather_item_3_quality ?? undefined,
      tooltipHtml: quest.gather_item_3_tooltip,
    });
  }

  // Gather inventory items from JSON column (Have/Deliver based on remove_items_on_complete)
  if (quest.gather_items) {
    try {
      const gatherItems = JSON.parse(quest.gather_items) as Array<{
        item_id: string;
        amount: number;
      }>;
      if (gatherItems.length > 0) {
        // Fetch item details
        const itemIds = gatherItems.map((g) => g.item_id);
        const itemRows = await query<{
          id: string;
          name: string;
          quality: number;
          tooltip_html: string | null;
        }>(
          `SELECT id, name, quality, tooltip_html FROM items WHERE id IN (${itemIds.map(() => "?").join(",")})`,
          itemIds,
        );
        const itemMap = new Map(
          itemRows.map((i) => [
            i.id,
            { name: i.name, quality: i.quality, tooltipHtml: i.tooltip_html },
          ]),
        );

        // Use "deliver" if items are removed on complete, "have" otherwise
        const objectiveType = quest.remove_items_on_complete
          ? "deliver"
          : "have";

        for (const gi of gatherItems) {
          // Skip if already added from gather columns
          if (
            objectives.some(
              (o) => o.type === "gather" && o.targetId === gi.item_id,
            )
          ) {
            continue;
          }
          const item = itemMap.get(gi.item_id);
          objectives.push({
            type: objectiveType,
            targetId: gi.item_id,
            targetName: item?.name ?? gi.item_id,
            amount: gi.amount,
            quality: item?.quality,
            tooltipHtml: item?.tooltipHtml,
          });
        }
      }
    } catch {
      // Invalid JSON
    }
  }

  // Note: quest.objectives contains location waypoints for in-game navigation.
  // We don't display these in the popup since the map shows everything already.

  // Find NPC objective
  if (quest.is_find_npc_quest && quest.end_npc_id && quest.end_npc_name) {
    objectives.push({
      type: "find",
      targetId: quest.end_npc_id,
      targetName: quest.end_npc_name,
      amount: 1,
    });
  }

  // Discover location objective
  if (quest.discovered_location) {
    objectives.push({
      type: "discover",
      targetId: null,
      targetName: quest.discovered_location_zone_name
        ? `${quest.discovered_location} in ${quest.discovered_location_zone_name}`
        : quest.discovered_location,
      amount: 1,
    });
  }

  // Equip objectives from JSON column
  if (quest.equip_items) {
    try {
      const equipItemIds = JSON.parse(quest.equip_items) as string[];
      if (equipItemIds.length > 0) {
        // Fetch item details
        const itemRows = await query<{
          id: string;
          name: string;
          quality: number;
          tooltip_html: string | null;
        }>(
          `SELECT id, name, quality, tooltip_html FROM items WHERE id IN (${equipItemIds.map(() => "?").join(",")})`,
          equipItemIds,
        );
        const itemMap = new Map(
          itemRows.map((i) => [
            i.id,
            { name: i.name, quality: i.quality, tooltipHtml: i.tooltip_html },
          ]),
        );

        for (const itemId of equipItemIds) {
          const item = itemMap.get(itemId);
          objectives.push({
            type: "equip",
            targetId: itemId,
            targetName: item?.name ?? itemId,
            amount: 1,
            quality: item?.quality,
            tooltipHtml: item?.tooltipHtml,
          });
        }
      }
    } catch {
      // Invalid JSON
    }
  }

  // Get NPCs from authoritative start_npc_id and end_npc_id columns
  const npcs: QuestPopupNpc[] = [];

  // Get start NPC (quest giver)
  if (quest.start_npc_id) {
    const [startNpc] = await query<{
      npc_id: string;
      npc_name: string;
      zone_name: string | null;
    }>(
      `
      SELECT n.id as npc_id, n.name as npc_name, z.name as zone_name
      FROM npcs n
      LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      LEFT JOIN zones z ON z.id = ns.zone_id
      WHERE n.id = ?
      LIMIT 1
      `,
      [quest.start_npc_id],
    );
    if (startNpc) {
      npcs.push({
        npcId: startNpc.npc_id,
        npcName: startNpc.npc_name,
        zoneName: startNpc.zone_name,
        isGiver: true,
        isTurnIn: quest.end_npc_id === quest.start_npc_id || !quest.end_npc_id,
      });
    }
  }

  // Get end NPC (turn-in) if different from start
  if (quest.end_npc_id && quest.end_npc_id !== quest.start_npc_id) {
    const [endNpc] = await query<{
      npc_id: string;
      npc_name: string;
      zone_name: string | null;
    }>(
      `
      SELECT n.id as npc_id, n.name as npc_name, z.name as zone_name
      FROM npcs n
      LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      LEFT JOIN zones z ON z.id = ns.zone_id
      WHERE n.id = ?
      LIMIT 1
      `,
      [quest.end_npc_id],
    );
    if (endNpc) {
      npcs.push({
        npcId: endNpc.npc_id,
        npcName: endNpc.npc_name,
        zoneName: endNpc.zone_name,
        isGiver: false,
        isTurnIn: true,
      });
    }
  }

  return {
    id: quest.id,
    name: quest.name,
    levelRecommended: quest.level_recommended,
    displayType: quest.display_type,
    isMainQuest: Boolean(quest.is_main_quest),
    isEpicQuest: Boolean(quest.is_epic_quest),
    isAdventurerQuest: Boolean(quest.is_adventurer_quest),
    isRepeatable: Boolean(quest.is_repeatable),
    gold,
    exp,
    rewardItems,
    objectives,
    npcs,
  };
}

// ============================================================================
// Zone Popup
// ============================================================================

/**
 * Monster info for zone popup (bosses/elites)
 */
export interface ZonePopupMonster {
  id: string;
  name: string;
  level: number;
}

/**
 * Altar info for zone popup
 */
export interface ZonePopupAltar {
  id: string;
  name: string;
}

/**
 * Renewal sage info for zone popup (dungeons only)
 */
export interface ZonePopupRenewalSage {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  goldCost: number;
}

/**
 * Zone popup details (lazy-loaded)
 */
export interface ZonePopupDetails {
  bosses: ZonePopupMonster[];
  elites: ZonePopupMonster[];
  altars: ZonePopupAltar[];
  renewalSage: ZonePopupRenewalSage | null;
}

/**
 * Load zone details for popup
 */
export async function loadZonePopupDetails(
  zoneId: string,
): Promise<ZonePopupDetails> {
  // Query bosses in zone (deduplicated by monster_id, show lowest level)
  // Fall back to monster's base level if spawn level is null
  const bosses = await query<{ id: string; name: string; level: number }>(
    `
    SELECT m.id, m.name, COALESCE(MIN(ms.level), m.level) as level
    FROM monster_spawns ms
    JOIN monsters m ON m.id = ms.monster_id
    WHERE ms.zone_id = ? AND m.is_boss = 1
    GROUP BY m.id
    ORDER BY level, m.name
    `,
    [zoneId],
  );

  // Query elites in zone (deduplicated by monster_id, show lowest level)
  // Fall back to monster's base level if spawn level is null
  const elites = await query<{ id: string; name: string; level: number }>(
    `
    SELECT m.id, m.name, COALESCE(MIN(ms.level), m.level) as level
    FROM monster_spawns ms
    JOIN monsters m ON m.id = ms.monster_id
    WHERE ms.zone_id = ? AND m.is_elite = 1 AND m.is_boss = 0
    GROUP BY m.id
    ORDER BY level, m.name
    `,
    [zoneId],
  );

  // Query altars in zone
  const altars = await query<{ id: string; name: string }>(
    `
    SELECT id, name FROM altars WHERE zone_id = ? ORDER BY name
    `,
    [zoneId],
  );

  // Query renewal sage for this dungeon (if applicable)
  // Find NPCs whose respawn_dungeon_id points to this zone
  const sages = await query<{
    id: string;
    name: string;
    zone_id: string;
    zone_name: string;
    gold_cost: number;
  }>(
    `
    SELECT n.id, n.name, ns.zone_id, z.name as zone_name, n.gold_required_respawn_dungeon as gold_cost
    FROM npcs n
    JOIN npc_spawns ns ON ns.npc_id = n.id
    JOIN zones z ON z.id = ns.zone_id
    JOIN zones dz ON dz.zone_id = n.respawn_dungeon_id
    WHERE dz.id = ?
      AND n.respawn_dungeon_id != ?
    LIMIT 1
    `,
    [zoneId, WORLD_BOSS_DUNGEON_ID],
  );

  return {
    bosses: bosses.map((b) => ({ id: b.id, name: b.name, level: b.level })),
    elites: elites.map((e) => ({ id: e.id, name: e.name, level: e.level })),
    altars: altars.map((a) => ({ id: a.id, name: a.name })),
    renewalSage: sages[0]
      ? {
          id: sages[0].id,
          name: sages[0].name,
          zoneId: sages[0].zone_id,
          zoneName: sages[0].zone_name,
          goldCost: sages[0].gold_cost,
        }
      : null,
  };
}
