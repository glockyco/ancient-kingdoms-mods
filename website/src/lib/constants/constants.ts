/**
 * Zones excluded from map display. These use a custom in-game map sprite
 * instead of the world map (see update-game-version skill for details).
 */
export const EXCLUDED_ZONE_IDS = new Set(["temple_of_valaark"]);

/**
 * Special respawn_dungeon_id value used for World Boss Renewal Sages.
 * This is not a real zone - it indicates the NPC resets world boss timers.
 * Source: server-scripts/Npc.cs:1689-1691 — respawnDungeonId == 100 branch uses "World Bosses" label and Adventurer's Essences currency
 */
export const WORLD_BOSS_DUNGEON_ID = 100;

/**
 * Database file paths.
 */
export const DB_FILENAME = "compendium.db";
export const DB_STATIC_PATH = "static/compendium.db";
