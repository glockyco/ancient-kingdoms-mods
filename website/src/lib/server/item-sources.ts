/**
 * Item source query helpers
 *
 * Functions for querying item sources from normalized junction tables.
 * All queries use better-sqlite3 prepared statements for type safety and performance.
 */

import type Database from "better-sqlite3";
import type {
  MonsterSource,
  VendorSource,
  QuestSource,
  AltarSource,
  RecipeSource,
  GatherSource,
  ChestSource,
  PackSource,
  RandomSource,
  MergeSource,
  TreasureMapSource,
  ItemSources,
} from "$lib/types/item-sources";

/**
 * Get all sources for an item, grouped by type
 */
export function getItemSources(
  db: Database.Database,
  itemId: string,
): ItemSources {
  return {
    monsters: getMonsterSources(db, itemId),
    vendors: getVendorSources(db, itemId),
    quests: getQuestSources(db, itemId),
    altars: getAltarSources(db, itemId),
    recipes: getRecipeSources(db, itemId),
    gathers: getGatherSources(db, itemId),
    chests: getChestSources(db, itemId),
    packs: getPackSources(db, itemId),
    randoms: getRandomSources(db, itemId),
    merges: getMergeSources(db, itemId),
    treasureMaps: getTreasureMapSources(db, itemId),
  };
}

/**
 * Get items dropped by monsters
 */
export function getMonsterSources(
  db: Database.Database,
  itemId: string,
): MonsterSource[] {
  const stmt = db.prepare(`
		SELECT
			ism.item_id,
			ism.monster_id,
			m.name as monster_name,
			m.level as monster_level,
			m.level_min as monster_level_min,
			m.level_max as monster_level_max,
			COALESCE(m.is_boss, 0) as is_boss,
			COALESCE(m.is_elite, 0) as is_elite,
			ism.drop_rate
		FROM item_sources_monster ism
		JOIN monsters m ON ism.monster_id = m.id
		WHERE ism.item_id = ?
		ORDER BY ism.drop_rate DESC, m.name ASC
	`);

  return stmt.all(itemId) as MonsterSource[];
}

/**
 * Get items sold by NPC vendors
 */
export function getVendorSources(
  db: Database.Database,
  itemId: string,
): VendorSource[] {
  const stmt = db.prepare(`
		SELECT
			isv.item_id,
			isv.npc_id,
			n.name as npc_name,
			isv.required_faction as npc_faction,
			isv.required_faction IS NOT NULL as is_faction_vendor,
			isv.price,
			isv.currency_item_id,
			i.name as currency_item_name,
			isv.required_faction,
			isv.required_reputation_tier
		FROM item_sources_vendor isv
		JOIN npcs n ON isv.npc_id = n.id
		LEFT JOIN items i ON isv.currency_item_id = i.id
		WHERE isv.item_id = ?
		ORDER BY n.name ASC
	`);

  return stmt.all(itemId) as VendorSource[];
}

/**
 * Get items obtained from quests (rewards and provided items)
 */
export function getQuestSources(
  db: Database.Database,
  itemId: string,
): QuestSource[] {
  const stmt = db.prepare(`
		SELECT
			isq.item_id,
			isq.quest_id,
			q.name as quest_name,
			q.level_required as quest_level_required,
			q.level_recommended as quest_level_recommended,
			isq.source_type,
			isq.class_restriction,
			COALESCE(q.is_repeatable, 0) as is_repeatable
		FROM item_sources_quest isq
		JOIN quests q ON isq.quest_id = q.id
		WHERE isq.item_id = ?
		ORDER BY q.name ASC
	`);

  return stmt.all(itemId) as QuestSource[];
}

/**
 * Get items rewarded by altars
 */
export function getAltarSources(
  db: Database.Database,
  itemId: string,
): AltarSource[] {
  const stmt = db.prepare(`
		SELECT
			isa.item_id,
			isa.altar_id,
			a.name as altar_name,
			a.type as altar_type,
			a.zone_id,
			z.name as zone_name,
			isa.reward_tier,
			isa.drop_rate,
			isa.min_effective_level,
			-- Extract boss from final wave in waves JSON
			(SELECT json_extract(value, '$.monsters[0].monster_id')
			 FROM json_each(a.waves)
			 WHERE json_extract(value, '$.wave_number') = a.total_waves - 1
			 LIMIT 1) as final_wave_boss_id,
			(SELECT json_extract(value, '$.monsters[0].monster_name')
			 FROM json_each(a.waves)
			 WHERE json_extract(value, '$.wave_number') = a.total_waves - 1
			 LIMIT 1) as final_wave_boss_name
		FROM item_sources_altar isa
		JOIN altars a ON isa.altar_id = a.id
		JOIN zones z ON a.zone_id = z.id
		WHERE isa.item_id = ?
		ORDER BY a.name ASC, isa.reward_tier ASC
	`);

  return stmt.all(itemId) as AltarSource[];
}

/**
 * Get items created from recipes (crafting or alchemy)
 */
export function getRecipeSources(
  db: Database.Database,
  itemId: string,
): RecipeSource[] {
  const stmt = db.prepare(`
		SELECT
			isr.item_id,
			isr.recipe_id,
			isr.recipe_type,
			isr.result_amount,
			CASE
				WHEN isr.recipe_type = 'alchemy' THEN (
					SELECT ar.level_required FROM alchemy_recipes ar WHERE ar.id = isr.recipe_id
				)
				ELSE NULL
			END as tier,
			CASE
				WHEN isr.recipe_type = 'crafting' THEN (
					SELECT cr.station_type FROM crafting_recipes cr WHERE cr.id = isr.recipe_id
				)
				ELSE NULL
			END as station_type
		FROM item_sources_recipe isr
		WHERE isr.item_id = ?
		ORDER BY isr.recipe_type ASC, COALESCE(tier, 0) ASC
	`);

  return stmt.all(itemId) as RecipeSource[];
}

/**
 * Get items gathered from resources or found in chests.
 * Amount calculation based on game logic:
 * - Plants/Minerals: Random.Range(1, item_reward_amount + 1) -> min=1, max=item_reward_amount
 * - Radiant Sparks: 0 or 1 based on skill -> min=0, max=1
 */
export function getGatherSources(
  db: Database.Database,
  itemId: string,
): GatherSource[] {
  const stmt = db.prepare(`
		SELECT
			isg.item_id,
			isg.resource_id,
			gr.name as resource_name,
			isg.drop_rate,
			COALESCE(isg.actual_drop_chance, isg.drop_rate) as actual_drop_chance,
			0 as is_guaranteed,
			COALESCE(gr.is_radiant_spark, 0) as is_radiant_spark,
			CASE
				WHEN gr.is_radiant_spark = 1 THEN 0
				ELSE 1
			END as amount_min,
			CASE
				WHEN gr.is_radiant_spark = 1 THEN 1
				ELSE gr.item_reward_amount
			END as amount_max
		FROM item_sources_gather isg
		JOIN gathering_resources gr ON isg.resource_id = gr.id
		WHERE isg.item_id = ?
		ORDER BY isg.actual_drop_chance DESC, gr.name ASC
	`);

  return stmt.all(itemId) as GatherSource[];
}

/**
 * Get items found in chests
 */
export function getChestSources(
  db: Database.Database,
  itemId: string,
): ChestSource[] {
  const stmt = db.prepare(`
		SELECT
			isc.item_id,
			isc.chest_id,
			c.name as chest_name,
			isc.drop_rate,
			COALESCE(isc.actual_drop_chance, isc.drop_rate) as actual_drop_chance,
			c.zone_id,
			z.name as zone_name,
			c.key_required_id,
			i.name as key_name,
			c.position_x,
			c.position_y
		FROM item_sources_chest isc
		JOIN chests c ON isc.chest_id = c.id
		JOIN zones z ON c.zone_id = z.id
		LEFT JOIN items i ON c.key_required_id = i.id
		WHERE isc.item_id = ?
		ORDER BY z.name ASC, c.name ASC
	`);

  return stmt.all(itemId) as ChestSource[];
}

/**
 * Get items found in packs (container items)
 */
export function getPackSources(
  db: Database.Database,
  itemId: string,
): PackSource[] {
  const stmt = db.prepare(`
		SELECT
			isp.item_id,
			isp.pack_item_id,
			pi.name as pack_item_name,
			pi.quality as pack_quality,
			isp.amount
		FROM item_sources_pack isp
		JOIN items pi ON isp.pack_item_id = pi.id
		WHERE isp.item_id = ?
		ORDER BY pi.name ASC
	`);

  return stmt.all(itemId) as PackSource[];
}

/**
 * Get items found in random item containers
 */
export function getRandomSources(
  db: Database.Database,
  itemId: string,
): RandomSource[] {
  const stmt = db.prepare(`
		SELECT
			isr.item_id,
			isr.random_item_id,
			ri.name as random_item_name,
			ri.quality as random_quality,
			isr.probability
		FROM item_sources_random isr
		JOIN items ri ON isr.random_item_id = ri.id
		WHERE isr.item_id = ?
		ORDER BY isr.probability DESC, ri.name ASC
	`);

  return stmt.all(itemId) as RandomSource[];
}

/**
 * Get items created from merge recipes
 */
export function getMergeSources(
  db: Database.Database,
  itemId: string,
): MergeSource[] {
  const stmt = db.prepare(`
		SELECT
			ism.item_id,
			GROUP_CONCAT(ism.component_item_id, ',') as component_ids,
			GROUP_CONCAT(ci.name, ',') as component_names
		FROM item_sources_merge ism
		JOIN items ci ON ism.component_item_id = ci.id
		WHERE ism.item_id = ?
		GROUP BY ism.item_id
	`);

  const result = stmt.get(itemId) as
    | { item_id: string; component_ids: string; component_names: string }
    | undefined;

  if (!result) {
    return [];
  }

  return [
    {
      item_id: result.item_id,
      component_item_ids: result.component_ids.split(","),
      component_item_names: result.component_names.split(","),
    },
  ];
}

/**
 * Get items obtained from treasure map locations
 */
export function getTreasureMapSources(
  db: Database.Database,
  itemId: string,
): TreasureMapSource[] {
  const stmt = db.prepare(`
		SELECT
			istm.item_id,
			istm.map_item_id,
			mi.name as map_item_name,
			istm.treasure_location_id,
			tl.zone_id,
			z.name as zone_name,
			tl.position_x,
			tl.position_y
		FROM item_sources_treasure_map istm
		JOIN items mi ON istm.map_item_id = mi.id
		JOIN treasure_locations tl ON istm.treasure_location_id = tl.id
		JOIN zones z ON tl.zone_id = z.id
		WHERE istm.item_id = ?
		ORDER BY z.name ASC, mi.name ASC
	`);

  return stmt.all(itemId) as TreasureMapSource[];
}
