import { existsSync, readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "vitest";
import { MECHANICS_GROUPS } from "$lib/data/mechanics";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("every mechanics page is registered, and every entry opens a page", () => {
  const listed: readonly string[] = MECHANICS_GROUPS.flatMap((group) =>
    group.pages.map((page) => page.href),
  );
  const routes = readdirSync(new URL(".", import.meta.url), {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(new URL(`./${entry.name}/+page.svelte`, import.meta.url)),
    )
    .map((entry) => `/mechanics/${entry.name}`);

  const unlisted = routes.filter((route) => !listed.includes(route));
  assert.deepEqual(
    unlisted,
    [],
    "mechanics pages missing from MECHANICS_GROUPS",
  );

  const dangling = listed.filter((href) => {
    const path = href.split("#")[0];
    return !existsSync(new URL(`..${path}/+page.svelte`, import.meta.url));
  });
  assert.deepEqual(dangling, [], "MECHANICS_GROUPS entries without a route");
});

test("mercenary rules links reach the hub section", () => {
  const hub = source("../mercenaries/+page.svelte");

  // The mechanics index and every mercenary page link to this section.
  assert.match(hub, /id="how-it-works"/);
});

test("faction pages link standing to reputation mechanics", () => {
  const factionPage = source("../factions/[id]/+page.svelte");
  const factionsIndex = source("../factions/+page.svelte");

  assert.match(factionPage, /href="\/mechanics\/reputation"/);
  assert.match(factionsIndex, /href="\/mechanics\/reputation"/);
});

test("quest pages link the reputation reward to reputation mechanics", () => {
  const questPage = source("../quests/[id]/+page.svelte");
  const reputationPage = source("./reputation/+page.svelte");

  // Adventurer quests credit no faction, so the reward has to be gated on it.
  assert.match(questPage, /data\.quest\.is_adventurer_quest/);
  assert.match(questPage, /section="reputation#quests"/);
  assert.match(reputationPage, /id="quests"/);
});

test("item pages link backpacks and house chests to inventory mechanics", () => {
  const itemPage = source("../items/[id]/+page.svelte");
  const houseChests = source("../../lib/inventory/house-chests.ts");

  assert.match(itemPage, /data\.item\.item_type === "backpack"/);
  assert.match(itemPage, /data\.item\.item_type === "structure"/);
  assert.match(itemPage, /isHouseChestItemId\(data\.item\.id\)/);
  assert.match(houseChests, /wooden_chest/);
  assert.match(houseChests, /guardian_box/);
  assert.match(itemPage, /href="\/mechanics\/inventory#backpacks"/);
  assert.match(itemPage, /href="\/mechanics\/inventory#house-chests"/);
});

test("monster pages link spawns to spawn mechanics", () => {
  const monsterPage = source("../monsters/[id]/+page.svelte");

  assert.match(monsterPage, /href="\/mechanics\/monster-spawns"/);
});

test("inventory backpack links include tooltip data", () => {
  const inventoryServer = source("./inventory/+page.server.ts");
  const inventoryPage = source("./inventory/+page.svelte");

  assert.match(
    inventoryServer,
    /SELECT id, name, quality, backpack_slots, backpack_is_unique, tooltip_html/,
  );
  assert.match(inventoryPage, /tooltipHtml=\{backpack\.tooltip_html\}/);
});

test("skill page keeps Parry mechanics visible without normal damage", () => {
  const skillPage = source("../skills/[id]/+page.svelte");
  const showMechanicsGate =
    skillPage.match(
      /const showMechanics = \$derived\([\s\S]*?\n {2}\);/,
    )?.[0] ?? "";

  assert.match(showMechanicsGate, /skill\.id === "parry"/);
});

test("skill page links Parry to combat mechanics", () => {
  const skillPage = source("../skills/[id]/+page.svelte");

  assert.match(skillPage, /href="\/mechanics\/combat#parry"/);
});

test("combat mechanics page documents Parry special rules", () => {
  const combatPage = source("./combat/+page.svelte");
  const parrySection =
    combatPage.match(
      /<h3 id="parry"[\s\S]*?(?=\n\s*<h3|\n\s*<\/Card\.Content>)/,
    )?.[0] ?? "";

  assert.match(parrySection, /<h3 id="parry"[^>]*>Parry<\/h3>/);
});

test("experience page links death and remains recovery rules", () => {
  const experiencePage = source("./experience/+page.svelte");
  const deathPage = source("./death/+page.svelte");

  assert.match(experiencePage, /href="\/mechanics\/death#death"/);
  assert.match(deathPage, /<Card\.Root id="death"/);
});
