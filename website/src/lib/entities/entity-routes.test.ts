import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import manifest from "./entity-manifest.json";

/**
 * The manifest is the source of every entity link on the site, so a href it
 * declares must land on a route that exists. Adding an entity family means
 * adding the manifest entry and the route, and the manifest entry alone
 * produces links that 404 rather than an error at build time.
 *
 * Seven families deliberately have no dynamic detail route. Professions use one
 * static page per profession, and the six map-only families point at /map,
 * where the client selects the entity from a query parameter. Both are
 * legitimate, so this asserts that the declared prefix resolves rather than
 * demanding an [id] directory.
 */
const ROUTES = resolve(import.meta.dirname, "..", "..", "routes");

type ManifestEntry = {
  id: string;
  overviewHref?: string;
  detailPrefix?: string;
};

const entries = manifest as ManifestEntry[];

describe("entity manifest routes", () => {
  test("declares at least one entity family", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  test.each(entries.filter((entry) => entry.overviewHref))(
    "$id overview route exists",
    ({ overviewHref }) => {
      expect(existsSync(resolve(ROUTES, `.${overviewHref}`))).toBe(true);
    },
  );

  test.each(entries.filter((entry) => entry.detailPrefix))(
    "$id detail route exists",
    ({ detailPrefix }) => {
      expect(existsSync(resolve(ROUTES, `.${detailPrefix}`))).toBe(true);
    },
  );
});
