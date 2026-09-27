#!/usr/bin/env node
/**
 * Build the serialized search index from the compendium.
 *
 * The compendium remains the authoritative source. This script only
 * materializes searchable text, destinations, and the canonical artwork paths
 * joined from visual_assets; it never derives an artwork URL from an entity id.
 * The output must be byte-stable for identical input, so that the hashed asset
 * name changes only when the index does.
 */
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSearchPayload } from "$lib/search/engine";
import { tokenize } from "$lib/search/normalize";
import { buildSearchDocuments } from "$lib/server/search/documents";

const root = resolve(import.meta.dirname, "..");
const source = new Database(resolve(root, "data/compendium.db"), {
  readonly: true,
});
const docs = buildSearchDocuments(source);
source.close();

// A six-digit hex term is a rich-text colour code that survived markup removal.
const markupArtifacts = new Set(
  docs.flatMap((doc) =>
    tokenize(`${doc.name} ${doc.keywords} ${doc.content}`).filter((term) =>
      /^[0-9a-f]{6}$/.test(term),
    ),
  ),
);
if (markupArtifacts.size > 0) {
  throw new Error(
    `Search index contains rich-text colour tokens: ${[...markupArtifacts].join(", ")}`,
  );
}

const outputPath = resolve(root, "data/search-index.json");
writeFileSync(outputPath, JSON.stringify(createSearchPayload(docs)));
console.log(`Wrote ${outputPath} (${docs.length} documents)`);
