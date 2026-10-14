import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTES = "src/routes";

/**
 * A route's page plus the files beside it that render as part of it, such as
 * chapter components. Subfolders with their own +page.svelte are separate
 * routes, and tests render nothing.
 */
function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return existsSync(join(path, "+page.svelte")) ? [] : routeFiles(path);
    }
    return /\.(svelte|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

/**
 * The route source for a site path. A path with no directory of its own is a
 * detail page, so it resolves to the sibling `[id]` route.
 */
function routeSource(path: string): string | null {
  for (const directory of [
    join(ROUTES, path),
    join(ROUTES, dirname(path), "[id]"),
  ]) {
    if (existsSync(join(directory, "+page.svelte"))) {
      return routeFiles(directory)
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
    }
  }
  return null;
}

/**
 * The links among `hrefs` that no route renders: either the path has no route,
 * or the route source has no literal `id` attribute for the fragment.
 */
export function missingAnchors(hrefs: readonly string[]): string[] {
  return hrefs.filter((href) => {
    const [path, anchor] = href.split("#");
    const source = routeSource(path);
    if (source === null) return true;
    return anchor !== undefined && !source.includes(`id="${anchor}"`);
  });
}
