#!/usr/bin/env node
/**
 * Build the compact, unified search artifact from the client-safe entity registry.
 *
 * The compendium remains the authoritative source. This script only materializes
 * searchable identity/content and joins the canonical visual_assets manifest; it
 * never derives an artwork URL from an entity id.
 */
import Database from "better-sqlite3";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { buildSearchDocuments } from "$lib/server/search/documents";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "data/compendium.db");
const outputPath = resolve(root, "data/search.db");

const source = new Database(sourcePath, { readonly: true });
const docs = buildSearchDocuments(source);
const imagePath = source.prepare(
  `
    SELECT v.public_path AS image
    FROM (SELECT ? AS domain, ? AS entity_id, ? AS kind) requested
    LEFT JOIN visual_assets v
      ON v.domain = requested.domain
     AND v.entity_id = requested.entity_id
     AND v.kind = requested.kind
  `,
);

rmSync(outputPath, { force: true });
const output = new Database(outputPath);
output.pragma("journal_mode = DELETE");
output.pragma("user_version = 1");
output.exec(`
  CREATE TABLE entities (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    image TEXT,
    PRIMARY KEY (entity_type, entity_id)
  );
  CREATE VIRTUAL TABLE search_fts USING fts5(
    name,
    keywords,
    content,
    content='entities',
    content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 1',
    prefix='2 3'
  );
`);

const insertEntity = output.prepare(`
  INSERT INTO entities (entity_type, entity_id, name, keywords, content, image)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertFts = output.prepare(`
  INSERT INTO search_fts (rowid, name, keywords, content)
  SELECT rowid, name, keywords, content
  FROM entities
  WHERE rowid = ?
`);

const write = output.transaction(() => {
  for (const doc of docs) {
    const image =
      doc.imageDomain && doc.imageKind
        ? ((
            imagePath.get(doc.imageDomain, doc.entityId, doc.imageKind) as
              { image: string | null } | undefined
          )?.image ?? null)
        : null;
    const result = insertEntity.run(
      doc.entityType,
      doc.entityId,
      doc.name,
      doc.keywords,
      doc.content,
      image,
    );
    insertFts.run(result.lastInsertRowid);
  }
});

write();
output.exec("INSERT INTO search_fts(search_fts) VALUES ('optimize')");
output.exec(
  "CREATE VIRTUAL TABLE search_vocab USING fts5vocab(search_fts, 'row')",
);
const markupArtifacts = output
  .prepare(
    "SELECT term FROM search_vocab WHERE term GLOB '[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'",
  )
  .all() as Array<{ term: string }>;
if (markupArtifacts.length > 0) {
  throw new Error(
    `Search index contains rich-text colour tokens: ${markupArtifacts.map(({ term }) => term).join(", ")}`,
  );
}
output.exec("VACUUM");
output.close();
source.close();

console.log(`Wrote ${outputPath} (${docs.length} entities)`);
