import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

export interface ModRelease {
  version: string;
  date: string;
  changes: string[];
}

interface PublishedMod {
  id: string;
  version: string;
  releases?: ModRelease[];
}

interface DownloadManifest {
  mods: PublishedMod[];
}

/**
 * Pocket Compendium's entry in the mod list. build-tool publish-mods writes the list from the DLLs
 * it publishes and the registry's releases, before every dev server and build, so the pages name
 * the version the download holds and the changes the mod itself shows.
 */
export function pocketCompendium(): Required<PublishedMod> {
  const manifest = JSON.parse(
    readFileSync(resolvePath("static/mods/manifest.json"), "utf8"),
  ) as DownloadManifest;
  const mod = manifest.mods.find((entry) => entry.id === "pocket-compendium");
  if (!mod) {
    throw new Error(
      "static/mods/manifest.json lists no pocket-compendium download.",
    );
  }
  return { ...mod, releases: mod.releases ?? [] };
}
