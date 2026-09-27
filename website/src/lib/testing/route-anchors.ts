import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTES = "src/routes";

/**
 * The route source for a site path. A path with no directory of its own is a
 * detail page, so it resolves to the sibling `[id]` route.
 */
function routeSource(path: string): string | null {
  const direct = join(ROUTES, path, "+page.svelte");
  if (existsSync(direct)) return readFileSync(direct, "utf8");
  const detail = join(ROUTES, dirname(path), "[id]", "+page.svelte");
  if (existsSync(detail)) return readFileSync(detail, "utf8");
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
