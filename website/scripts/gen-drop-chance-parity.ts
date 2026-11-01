/**
 * Bake the pure per-kill calculation for each monster's own drop table.
 * Uses the website acquisition rules, not a second probability implementation.
 * Authored templates exclude runtime event overrides and supplemental rewards.
 * Run: pnpm --filter website gen:drop-chance-parity
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "$lib/db.server";
import { queryAcquisitionRows } from "$lib/acquisition/queries";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import type { DataRow, MethodRow, PoolEntry } from "$lib/acquisition/types";

const db = getDb();
// UIBestiaryDetail's journal targets are bosses and elites, including fabled elites.
const monsters = db
  .prepare(
    "SELECT id, is_boss, is_hunt, loot_pool_id FROM monsters WHERE is_boss OR is_elite ORDER BY id",
  )
  .all() as Array<{
  id: string;
  is_boss: number;
  is_hunt: number;
  loot_pool_id: string;
}>;
const loaded = await queryAcquisitionRows(
  async (sql, values) =>
    db.prepare(sql).all(...values) as Record<string, unknown>[],
  { kind: "monsters", monsterIds: monsters.map((monster) => monster.id) },
);
// Acquisition contexts can replace a template's pool. Supply the original pools
// as well, because task 1.3 will read Monster.dropChances, not server overrides.
const entries = db
  .prepare("SELECT * FROM loot_pool_entries ORDER BY pool_id, ordinal")
  .all() as PoolEntry[];
const rows = {
  ...loaded,
  pools: db.prepare("SELECT * FROM loot_pools").all() as DataRow[],
  poolEntries: entries,
};
const byPool = new Map<string, PoolEntry[]>();
for (const entry of entries) {
  const pool = byPool.get(entry.pool_id) ?? [];
  pool.push(entry);
  byPool.set(entry.pool_id, pool);
}

const corpus = monsters.map((monster) => {
  const pool = byPool.get(monster.loot_pool_id) ?? [];
  const drops = pool.map((entry) => ({
    itemId: entry.item_id ?? `anonymous:${entry.duplicate_group}`,
    itemName: `group:${entry.duplicate_group}`,
    probability: entry.probability,
    countsAsEquipment: Boolean(entry.guaranteed_equipment_candidate),
    requiresQuest: entry.quest_gate !== "none",
    ...(entry.resolution === "uniform_child"
      ? {
          randomItems: (byPool.get(entry.child_pool_id!) ?? []).map(
            (child) => ({
              itemId: child.item_id ?? `anonymous-child:${child.ordinal}`,
              countsAsEquipment: Boolean(child.counts_equipment),
            }),
          ),
        }
      : {}),
  }));
  const method: MethodRow = {
    id: `parity:${monster.id}`,
    kind: "kill",
    rule_id: "monster_loot",
    setup_method_id: null,
    rooted: 1,
    source_level_hint: null,
  };
  const detail: DataRow = {
    id: method.id,
    loot_pool_id: monster.loot_pool_id,
    is_boss: monster.is_boss,
    is_hunt: monster.is_hunt,
    loot_zone_number: 0,
  };
  const targets = drops.flatMap((drop, ordinal) => [
    { itemId: drop.itemId, ordinal },
    ...[...new Set(drop.randomItems?.map((item) => item.itemId) ?? [])].map(
      (itemId) => ({ itemId, ordinal }),
    ),
  ]);
  const checks = targets.flatMap(({ itemId, ordinal }) =>
    [false, true].map((questNeeded) => {
      const neededQuestItemIds = questNeeded ? [itemId] : [];
      const expected = [false, true].map((fatecharm) => {
        const results = calculateMethodProbabilities(rows, method, detail, {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            questNeed: "specified",
            fatecharm,
          },
          neededQuestItemIds: new Set(neededQuestItemIds),
        });
        const result = results.find(
          (value) =>
            value.target.kind === "item" && value.target.itemId === itemId,
        );
        // Random wrappers are not awarded themselves, so they have no result.
        const chance = result?.probability ?? (result === undefined ? 0 : null);
        if (chance === null)
          throw new Error(`Unknown chance for ${monster.id}/${itemId}`);
        return chance;
      });
      return {
        itemId,
        ordinal,
        neededQuestItemIds,
        expected: expected[0],
        expectedWithFatecharm: expected[1],
      };
    }),
  );
  return {
    monsterId: monster.id,
    isBoss: Boolean(monster.is_boss),
    drops,
    checks,
  };
});

const json = `[\n${corpus.map((item) => "  " + JSON.stringify(item)).join(",\n")}\n]\n`;
const outPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../tests/PocketCompendium.Tests/Fixtures/drop-chance-parity.json",
);
const checks = corpus.reduce(
  (count, monster) => count + monster.checks.length * 2,
  0,
);
if (process.argv.includes("--check")) {
  if (readFileSync(outPath, "utf8") !== json)
    throw new Error("Drop-chance parity corpus is stale. Regenerate it.");
  console.log(
    `Checked ${checks} drop-chance cases across ${corpus.length} monsters`,
  );
} else {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, "utf8");
  console.log(
    `Wrote ${checks} drop-chance cases across ${corpus.length} monsters to ${outPath}`,
  );
}
