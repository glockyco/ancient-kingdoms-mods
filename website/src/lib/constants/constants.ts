/**
 * Special respawn_dungeon_id value used for World Boss NPCs.
 * This is not a real zone — it identifies NPCs/monsters associated with world bosses.
 * Source: server-scripts/Npc.cs:1705, Utils.cs:worldBosses
 * Note: Sage Renewal for World Bosses was removed in v0.9.13.0;
 * the Player-side renewal branch is gone; this constant still identifies world boss entities in the DB.
 */
export const WORLD_BOSS_DUNGEON_ID = 100;

/**
 * Build-time path to the compendium database, relative to the website root.
 *
 * The database lives outside static/ on purpose. Anything in static/ is
 * published verbatim at a stable, unhashed URL, which cannot carry an
 * immutable cache header. Prerendering and the other build scripts read this
 * file from disk; the browser gets a gzipped, content-hashed copy emitted by
 * the Vite asset graph (see src/lib/db.worker.ts).
 */
export const DB_SOURCE_PATH = "data/compendium.db";
