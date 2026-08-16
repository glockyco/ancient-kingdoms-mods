#!/usr/bin/env node
/**
 * Compress the generated databases for delivery to the browser.
 *
 * Cloudflare does not compress these files on the fly. It picks compressible
 * responses by content type, and a SQLite file has no compressible type, so
 * the wire payload was the full 16.3 MB. SQLite compresses about 7 to 1, so
 * shipping a pre-compressed artifact is the single largest saving available.
 * HTTP range requests are not an option here, because the Cloudflare asset
 * layer answers a Range header with the complete body.
 *
 * The `.gz` files are imported by src/lib/db.worker.ts through Vite, which
 * gives them a content-hashed name under /_app/immutable/. That is what makes
 * them safe to cache forever, and what makes a rebuilt database invalidate
 * itself. The worker inflates the bytes with DecompressionStream.
 *
 * Output must stay byte-stable for identical input, otherwise every build
 * changes the content hash and forces every visitor to download again.
 * zlib writes a zero timestamp, so gzip output depends only on the input.
 */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const DATABASES = ["compendium.db", "search.db"];

for (const name of DATABASES) {
  const source = resolve(root, "data", name);
  const output = `${source}.gz`;

  if (!existsSync(source)) {
    throw new Error(
      `Missing ${source}. Run the build pipeline to generate the databases.`,
    );
  }

  const sourceStat = statSync(source);
  if (existsSync(output) && statSync(output).mtimeMs >= sourceStat.mtimeMs) {
    console.log(`${name}.gz is up to date`);
    continue;
  }

  await pipeline(
    createReadStream(source),
    createGzip({ level: 9 }),
    createWriteStream(output),
  );

  const compressedSize = statSync(output).size;
  const ratio = (sourceStat.size / compressedSize).toFixed(1);
  console.log(
    `${name}: ${(sourceStat.size / 1024 / 1024).toFixed(2)} MB -> ` +
      `${(compressedSize / 1024 / 1024).toFixed(2)} MB (${ratio}x)`,
  );
}
