/**
 * Zone IDs to exclude from map display.
 * These zones contain unreleased or work-in-progress content.
 */
export const EXCLUDED_ZONE_IDS = new Set(["temple_of_valaark"]);

/**
 * Special respawn_dungeon_id value used for World Boss Renewal Sages.
 * This is not a real zone - it indicates the NPC resets world boss timers.
 */
export const WORLD_BOSS_DUNGEON_ID = 100;

/**
 * Database file paths.
 * sql.js-httpvfs chunked mode requires numeric suffix (0) on the file.
 */
export const DB_FILENAME = "compendium.db0";
export const DB_URL_PREFIX = "/compendium.db";
export const DB_STATIC_PATH = "static/compendium.db0";
