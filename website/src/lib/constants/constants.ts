/**
 * Zones excluded from map display. These use a custom in-game map sprite
 * instead of the world map (see update-game-version skill for details).
 */
export const EXCLUDED_ZONE_IDS = new Set(["temple_of_valaark"]);

/**
 * Special respawn_dungeon_id value used for World Boss NPCs.
 * This is not a real zone — it identifies NPCs/monsters associated with world bosses.
 * Source: server-scripts/Npc.cs:1690, Player.cs:11188
 * Note: Sage Renewal for World Bosses was removed in v0.9.13.0;
 * this constant is still used for identifying world boss entities in the DB.
 */
export const WORLD_BOSS_DUNGEON_ID = 100;

/**
 * Database file paths.
 */
export const DB_FILENAME = "compendium.db";
export const DB_STATIC_PATH = "static/compendium.db";
