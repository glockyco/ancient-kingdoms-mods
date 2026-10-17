#!/usr/bin/env node
/** Generate the synchronous stat vocabulary from the published database. */

import Database from "better-sqlite3";
import { format } from "prettier";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(projectRoot, "src/lib/generated");
const outPath = resolve(outDir, "stat-vocabulary.ts");
const db = new Database(resolve(projectRoot, "data/compendium.db"), {
  readonly: true,
});

let rows;
let fields;
try {
  rows = db
    .prepare(
      `SELECT id, name, item_name, weapon_item_name, override_reason, format,
              min_value, max_value, pool_id, per_point_of
       FROM stats ORDER BY sort_order`,
    )
    .all();
  fields = db
    .prepare(
      `SELECT f.source, f.field, f.stat_id AS stat, f.modifier, f.curve
       FROM stat_fields f JOIN stats s ON s.id = f.stat_id
       ORDER BY s.sort_order, f.source, f.field`,
    )
    .all();
} finally {
  db.close();
}
if (rows.length === 0) {
  throw new Error("The stats catalogue is empty");
}

const ids = rows.map((row) => row.id);
const stats = Object.fromEntries(
  rows.map((row) => [
    row.id,
    {
      id: row.id,
      name: row.name,
      itemName: row.item_name,
      weaponItemName: row.weapon_item_name,
      overrideReason: row.override_reason,
      format: row.format,
      min: row.min_value,
      max: row.max_value,
      pool: row.pool_id,
      perPointOf: JSON.parse(row.per_point_of).map((term) => ({
        stat: term.stat_id,
        amount: term.amount,
      })),
    },
  ]),
);

const raw = `// AUTO-GENERATED. Do not edit.
// Run pnpm gen:stat-vocabulary to regenerate from data/compendium.db.

export type StatFormat = "integer" | "percent" | "decimal";
export type StatSource = "item" | "skill" | "class" | "pet";
export type StatModifier = "flat" | "percent" | "per_second" | "percent_of_max_per_second";

export const STAT_IDS = ${JSON.stringify(ids)} as const;
export type StatId = (typeof STAT_IDS)[number];

export interface Stat {
  readonly id: StatId;
  readonly name: string;
  readonly itemName: string | null;
  readonly weaponItemName: string | null;
  readonly overrideReason: string | null;
  readonly format: StatFormat;
  readonly min: number | null;
  readonly max: number | null;
  readonly pool: StatId | null;
  readonly perPointOf: readonly { readonly stat: StatId; readonly amount: number }[];
}

export const STATS: Readonly<Record<StatId, Stat>> = ${JSON.stringify(stats, null, 2)};

export interface StatField {
  readonly source: StatSource;
  readonly field: string;
  readonly stat: StatId;
  readonly modifier: StatModifier;
  readonly curve: "base" | "per_level" | null;
}

export const STAT_FIELDS: readonly StatField[] = ${JSON.stringify(fields, null, 2)};
`;
const formatted = await format(raw, { filepath: outPath });
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, formatted);
console.log(`Wrote ${outPath}`);
