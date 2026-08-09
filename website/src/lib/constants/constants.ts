/**
 * Zones excluded from map display because they do not belong on the public world map.
 * See update-game-version skill for the coordinate and tile exclusion workflow.
 */
export const EXCLUDED_ZONE_IDS: Record<string, true> = {
  temple_of_valaark: true,
  old_valorath: true,
};

/**
 * Special respawn_dungeon_id value used for World Boss NPCs.
 * This is not a real zone — it identifies NPCs/monsters associated with world bosses.
 * Source: server-scripts/Npc.cs:1695, Utils.cs:worldBosses
 * Note: Sage Renewal for World Bosses was removed in v0.9.13.0;
 * the Player-side renewal branch is gone; this constant still identifies world boss entities in the DB.
 */
export const WORLD_BOSS_DUNGEON_ID = 100;

/**
 * Database file paths.
 */
export const DB_FILENAME = "compendium.db";
export const DB_STATIC_PATH = "static/compendium.db";
