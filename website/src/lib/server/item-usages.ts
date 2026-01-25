/**
 * Item usage query helpers
 *
 * Functions for querying what items are used for (recipes, quests, etc.)
 * from normalized junction tables.
 */

import type Database from "better-sqlite3";
import type {
  RecipeUsage,
  QuestUsage,
  CurrencyUsage,
  AltarUsage,
  PortalUsage,
  ChestUsage,
  ItemUsages,
} from "$lib/types/item-sources";

/**
 * Get all usages for an item, grouped by type
 */
export function getItemUsages(
  db: Database.Database,
  itemId: string,
): ItemUsages {
  return {
    recipes: getRecipeUsages(db, itemId),
    quests: getQuestUsages(db, itemId),
    currency: getCurrencyUsages(db, itemId),
    altars: getAltarUsages(db, itemId),
    portals: getPortalUsages(db, itemId),
    chests: getChestUsages(db, itemId),
  };
}

/**
 * Get recipes that use this item as a material
 */
export function getRecipeUsages(
  db: Database.Database,
  itemId: string,
): RecipeUsage[] {
  const stmt = db.prepare(`
		SELECT
			iur.item_id,
			iur.recipe_id,
			iur.recipe_type,
			iur.amount,
			CASE
				WHEN iur.recipe_type = 'crafting' THEN (
					SELECT cr.result_item_id FROM crafting_recipes cr WHERE cr.id = iur.recipe_id
				)
				WHEN iur.recipe_type = 'alchemy' THEN (
					SELECT ar.result_item_id FROM alchemy_recipes ar WHERE ar.id = iur.recipe_id
				)
			END as result_item_id,
			CASE
				WHEN iur.recipe_type = 'crafting' THEN (
					SELECT i.name FROM items i WHERE i.id = (
						SELECT cr.result_item_id FROM crafting_recipes cr WHERE cr.id = iur.recipe_id
					)
				)
				WHEN iur.recipe_type = 'alchemy' THEN (
					SELECT i.name FROM items i WHERE i.id = (
						SELECT ar.result_item_id FROM alchemy_recipes ar WHERE ar.id = iur.recipe_id
					)
				)
			END as result_item_name,
			CASE
				WHEN iur.recipe_type = 'crafting' THEN (
					SELECT cr.result_amount FROM crafting_recipes cr WHERE cr.id = iur.recipe_id
				)
				WHEN iur.recipe_type = 'alchemy' THEN (
					SELECT ar.result_amount FROM alchemy_recipes ar WHERE ar.id = iur.recipe_id
				)
			END as result_amount,
			CASE
				WHEN iur.recipe_type = 'crafting' THEN (
					SELECT cr.tier FROM crafting_recipes cr WHERE cr.id = iur.recipe_id
				)
				WHEN iur.recipe_type = 'alchemy' THEN (
					SELECT ar.tier FROM alchemy_recipes ar WHERE ar.id = iur.recipe_id
				)
			END as tier
		FROM item_usages_recipe iur
		WHERE iur.item_id = ?
		ORDER BY iur.recipe_type ASC, tier ASC
	`);

  return stmt.all(itemId) as RecipeUsage[];
}

/**
 * Get quests that require this item
 */
export function getQuestUsages(
  db: Database.Database,
  itemId: string,
): QuestUsage[] {
  const stmt = db.prepare(`
		SELECT
			iuq.item_id,
			iuq.quest_id,
			q.name as quest_name,
			q.level_required as quest_level_required,
			q.level_recommended as quest_level_recommended,
			iuq.purpose,
			iuq.amount,
			COALESCE(q.is_repeatable, 0) as is_repeatable,
			iuq.class_restrictions
		FROM item_usages_quest iuq
		JOIN quests q ON iuq.quest_id = q.id
		WHERE iuq.item_id = ?
		ORDER BY q.name ASC
	`);

  return stmt.all(itemId) as QuestUsage[];
}

/**
 * Get items that can be purchased using this currency
 */
export function getCurrencyUsages(
  db: Database.Database,
  itemId: string,
): CurrencyUsage[] {
  const stmt = db.prepare(`
		SELECT
			iuc.currency_item_id,
			iuc.purchasable_item_id,
			pi.name as purchasable_item_name,
			pi.quality as purchasable_quality,
			iuc.npc_id,
			n.name as npc_name,
			iuc.price
		FROM item_usages_currency iuc
		JOIN items pi ON iuc.purchasable_item_id = pi.id
		JOIN npcs n ON iuc.npc_id = n.id
		WHERE iuc.currency_item_id = ?
		ORDER BY n.name ASC, pi.name ASC
	`);

  return stmt.all(itemId) as CurrencyUsage[];
}

/**
 * Get altars that require this item for activation
 */
export function getAltarUsages(
  db: Database.Database,
  itemId: string,
): AltarUsage[] {
  const stmt = db.prepare(`
		SELECT
			iua.item_id,
			iua.altar_id,
			a.name as altar_name,
			a.type as altar_type,
			a.zone_id,
			z.name as zone_name
		FROM item_usages_altar iua
		JOIN altars a ON iua.altar_id = a.id
		JOIN zones z ON a.zone_id = z.id
		WHERE iua.item_id = ?
		ORDER BY z.name ASC, a.name ASC
	`);

  return stmt.all(itemId) as AltarUsage[];
}

/**
 * Get portals that require this item for access
 */
export function getPortalUsages(
  db: Database.Database,
  itemId: string,
): PortalUsage[] {
  const stmt = db.prepare(`
		SELECT
			iup.item_id,
			iup.portal_id,
			p.from_zone_id,
			z1.name as from_zone_name,
			p.to_zone_id,
			z2.name as to_zone_name,
			p.position_x,
			p.position_y
		FROM item_usages_portal iup
		JOIN portals p ON iup.portal_id = p.id
		JOIN zones z1 ON p.from_zone_id = z1.id
		JOIN zones z2 ON p.to_zone_id = z2.id
		WHERE iup.item_id = ?
		ORDER BY z1.name ASC, z2.name ASC
	`);

  return stmt.all(itemId) as PortalUsage[];
}

/**
 * Get chests that this item opens (key items)
 */
export function getChestUsages(
  db: Database.Database,
  itemId: string,
): ChestUsage[] {
  const stmt = db.prepare(`
		SELECT
			iuc.item_id,
			iuc.chest_id,
			c.name as chest_name,
			c.zone_id,
			z.name as zone_name,
			c.position_x,
			c.position_y
		FROM item_usages_chest iuc
		JOIN chests c ON iuc.chest_id = c.id
		JOIN zones z ON c.zone_id = z.id
		WHERE iuc.item_id = ?
		ORDER BY z.name ASC, c.name ASC
	`);

  return stmt.all(itemId) as ChestUsage[];
}
