import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import type { PageServerLoad } from "./$types";

interface PublishedMod {
  id: string;
  version: string;
}

interface DownloadManifest {
  mods: PublishedMod[];
}

// build-tool publish-mods writes this manifest from the DLLs it publishes, before every dev
// server and build, so the page names the version the download holds.
export const load: PageServerLoad = () => {
  const manifest = JSON.parse(
    readFileSync(resolvePath("static/mods/manifest.json"), "utf8"),
  ) as DownloadManifest;
  const mod = manifest.mods.find((entry) => entry.id === "pocket-compendium");
  if (!mod) {
    throw new Error(
      "static/mods/manifest.json lists no pocket-compendium download.",
    );
  }
  return { version: mod.version };
};
