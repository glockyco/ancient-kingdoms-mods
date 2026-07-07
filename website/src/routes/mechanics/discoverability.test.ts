import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("mechanics index and homepage expose mechanics references", () => {
  const mechanicsIndex = source("./+page.svelte");
  const homepage = source("../+page.svelte");

  assert.match(mechanicsIndex, /href: "\/mechanics\/inventory"/);
  assert.match(mechanicsIndex, /href: "\/mechanics\/experience"/);
  assert.match(mechanicsIndex, /href: "\/mechanics\/combat"/);
  assert.match(mechanicsIndex, /href: "\/mechanics\/monster-spawns"/);

  // The homepage's "Game mechanics" section links directly to every mechanics
  // page, which supersedes the old single /mechanics card.
  assert.match(homepage, /Game mechanics/);
  assert.match(homepage, /href: "\/mechanics\/inventory"/);
  assert.match(homepage, /href: "\/mechanics\/experience"/);
  assert.match(homepage, /href: "\/mechanics\/combat"/);
  assert.match(homepage, /href: "\/mechanics\/monster-spawns"/);
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
    /SELECT id, name, quality, backpack_slots, tooltip_html/,
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

test("experience page cross-links equipment and death inventory rules", () => {
  const experiencePage = source("./experience/+page.svelte");

  assert.match(
    experiencePage,
    /href="\/mechanics\/inventory#equipment-and-death"/,
  );
  assert.match(experiencePage, /Retrieve from corpse/);
});
