#!/usr/bin/env node
/**
 * Snapshot mechanics card text from prerendered SvelteKit skill pages.
 *
 * Usage:
 *   node scripts/snapshot-mechanics.mjs [--update]
 *
 * Without --update: compares against existing snapshots in test-fixtures/mechanics-snapshots/
 *   and reports any diffs. Exit code 1 if unexpected changes found.
 * With --update: writes (or overwrites) snapshot files.
 *
 * Reads HTML from: .svelte-kit/output/prerendered/pages/skills/<id>/index.html
 * Snapshots at:    test-fixtures/mechanics-snapshots/<id>.txt
 */

import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse } from "node-html-parser";

const ROOT = resolve(import.meta.dirname, "..");
const PAGES_DIR = join(ROOT, ".svelte-kit/output/prerendered/pages/skills");
const SNAPSHOTS_DIR = join(ROOT, "test-fixtures/mechanics-snapshots");

const UPDATE = process.argv.includes("--update");

// ---------------------------------------------------------------------------
// Extract normalised text from the mechanics card
// ---------------------------------------------------------------------------

/**
 * Parse an HTML string, find the element with id="mechanics",
 * and return its flattened text content with whitespace normalised.
 */
function extractMechanicsText(html) {
  const root = parse(html);
  const card = root.querySelector("#mechanics");
  if (!card) return null;

  // Get raw text, collapsing whitespace runs to single spaces
  const raw = card.innerText
    .replace(/&times;/gi, "×")
    .replace(/&minus;/gi, "−")
    .replace(/&divide;/gi, "÷")
    .replace(/&plusmn;/gi, "±")
    .replace(/&ndash;/gi, "–")
    .replace(/&rarr;/gi, "→")
    .replace(/\s+/g, " ")
    .trim();

  return raw;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Verify pages directory exists
  try {
    await access(PAGES_DIR);
  } catch {
    console.error(
      `ERROR: Pages directory not found: ${PAGES_DIR}\nRun 'pnpm build' first.`,
    );
    process.exit(1);
  }

  await mkdir(SNAPSHOTS_DIR, { recursive: true });

  const skillDirs = (await readdir(PAGES_DIR, { withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith(".html"))
    .map((d) => d.name.replace(/\.html$/, ""))
    .sort();

  let changed = 0;
  let missing = 0;
  let skipped = 0;
  const changedSkills = [];

  for (const skillId of skillDirs) {
    const htmlPath = join(PAGES_DIR, `${skillId}.html`);
    const snapshotPath = join(SNAPSHOTS_DIR, `${skillId}.txt`);

    let html;
    try {
      html = await readFile(htmlPath, "utf8");
    } catch {
      skipped++;
      continue;
    }

    const text = extractMechanicsText(html);
    if (text === null) {
      // Skill has no mechanics card — write empty marker
      if (UPDATE) {
        await writeFile(snapshotPath, "");
      }
      skipped++;
      continue;
    }

    if (UPDATE) {
      await writeFile(snapshotPath, text + "\n");
    } else {
      // Compare
      let existing;
      try {
        existing = (await readFile(snapshotPath, "utf8")).trimEnd();
      } catch {
        console.log(`  NEW: ${skillId}`);
        missing++;
        changedSkills.push(skillId);
        continue;
      }

      if (existing !== text) {
        console.log(`  CHANGED: ${skillId}`);
        // Show first diff line for context
        const oldLines = existing.split(" ");
        const newLines = text.split(" ");
        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
          if (oldLines[i] !== newLines[i]) {
            const ctx = Math.max(0, i - 5);
            console.log(
              `    old: ...${oldLines.slice(ctx, i + 5).join(" ")}...`,
            );
            console.log(
              `    new: ...${newLines.slice(ctx, i + 5).join(" ")}...`,
            );
            break;
          }
        }
        changed++;
        changedSkills.push(skillId);
      }
    }
  }

  if (UPDATE) {
    console.log(
      `Snapshots written for ${skillDirs.length - skipped} skills (${skipped} had no mechanics card).`,
    );
    console.log(`Snapshots at: ${SNAPSHOTS_DIR}`);
  } else {
    const total = skillDirs.length - skipped;
    console.log(`\nChecked ${total} skills with mechanics cards.`);
    if (changed === 0 && missing === 0) {
      console.log("✓ All snapshots match.");
    } else {
      console.log(`✗ ${changed} changed, ${missing} new: ${changedSkills.join(", ")}`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
