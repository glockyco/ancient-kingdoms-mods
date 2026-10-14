import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import assert from "node:assert/strict";
import { describe, test } from "vitest";

const here = new URL(".", import.meta.url).pathname;
const routes = join(here, "../../routes");

/**
 * Every page that renders a PageSections jump list. The ids in each page's
 * section array are decoupled from the markup they scroll to, so a renamed
 * Card.Root id would silently produce a dead link.
 */
const PAGES = (readdirSync(routes, { recursive: true }) as string[])
  .filter((path) => path.endsWith("+page.svelte"))
  .map((path) => join(routes, path))
  .filter((path) => readFileSync(path, "utf8").includes("<PageSections"))
  .map((path) => relative(here, path))
  .sort();

function source(path: string): string {
  return readFileSync(join(here, path), "utf8");
}

/**
 * Section ids declared in the page's jump-list array. Entries are recognised
 * by carrying a `label`, which separates them from other id-bearing literals
 * on the same page such as the reputation page's faction list.
 */
function declaredIds(src: string): string[] {
  return [...src.matchAll(/id: "([^"]+)",\s*label:/g)].map((m) => m[1]);
}

/** Element ids the page actually renders, e.g. <Card.Root id="bosses">. */
function renderedIds(src: string): Set<string> {
  return new Set([...src.matchAll(/\bid="([^"{}]+)"/g)].map((m) => m[1]));
}

describe("PageSections jump lists", () => {
  test.each(PAGES)("%s declares sections", (path) => {
    const src = source(path);
    assert.match(src, /<PageSections\b/);
    assert.ok(
      declaredIds(src).length > 0,
      "expected at least one section entry",
    );
  });

  test.each(PAGES)("%s has no dead jump links", (path) => {
    const src = source(path);
    const rendered = renderedIds(src);
    const dead = declaredIds(src).filter((id) => !rendered.has(id));
    assert.deepEqual(dead, [], `jump links point at missing ids: ${dead}`);
  });

  test("no page still hand-rolls the old jump-list markup", () => {
    for (const path of PAGES) {
      assert.doesNotMatch(
        source(path),
        /<nav aria-label="Page sections"/,
        `${path} should use the PageSections component`,
      );
    }
  });
});
