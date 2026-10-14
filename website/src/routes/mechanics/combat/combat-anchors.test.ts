import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { outlineIds } from "$lib/components/reference/outline";
import { COMBAT_OUTLINE } from "./outline";

const here = new URL(".", import.meta.url).pathname;
const src = join(here, "../../..");
const ids = new Set(outlineIds(COMBAT_OUTLINE));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(svelte|ts|json)$/.test(name) && !name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

const chapterFiles = readdirSync(join(here, "chapters"))
  .filter((name) => name.endsWith(".svelte"))
  .map((name) => join(here, "chapters", name));

test("every link into the combat page opens a section that exists", () => {
  const broken: string[] = [];
  for (const path of files(src)) {
    const text = readFileSync(path, "utf8");
    const links = [
      ...text.matchAll(/\/mechanics\/combat#([a-z0-9-]+)/g),
      ...text.matchAll(/section="combat#([a-z0-9-]+)"/g),
    ];
    for (const [, id] of links) {
      if (!ids.has(id)) broken.push(`${relative(src, path)} → #${id}`);
    }
  }
  expect(broken).toEqual([]);
});

test("the chapters render every outline entry once and link only to entries", () => {
  const rendered: string[] = [];
  const broken: string[] = [];
  for (const path of chapterFiles) {
    const text = readFileSync(path, "utf8");
    for (const [, id] of text.matchAll(/<(?:Chapter|Topic) id="([^"]+)"/g)) {
      rendered.push(id);
    }
    for (const [, id] of text.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.has(id)) broken.push(`${relative(here, path)} → #${id}`);
    }
  }
  expect([...rendered].sort()).toEqual([...ids].sort());
  expect(broken).toEqual([]);
});

test("the page includes every chapter file", () => {
  const page = readFileSync(join(here, "+page.svelte"), "utf8");
  const missing = chapterFiles
    .map((path) => relative(here, path))
    .filter((path) => !page.includes(`./${path}`));
  expect(missing).toEqual([]);
});
