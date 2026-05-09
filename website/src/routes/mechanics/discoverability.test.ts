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
  assert.match(homepage, /href="\/mechanics"/);
  assert.match(homepage, /Game systems and rule references/);

  assert.ok(
    homepage.indexOf("<!-- Chests -->") <
      homepage.indexOf("<!-- Mechanics -->"),
  );
  assert.match(homepage, /import Cog from "@lucide\/svelte\/icons\/cog"/);
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

test("inventory backpack links include tooltip data", () => {
  const inventoryServer = source("./inventory/+page.server.ts");
  const inventoryPage = source("./inventory/+page.svelte");

  assert.match(
    inventoryServer,
    /SELECT id, name, quality, backpack_slots, tooltip_html/,
  );
  assert.match(inventoryPage, /tooltipHtml=\{backpack\.tooltip_html\}/);
});

test("mechanics detail breadcrumbs link to mechanics overview", () => {
  const experiencePage = source("./experience/+page.svelte");
  const combatPage = source("./combat/+page.svelte");

  assert.match(experiencePage, /\{ label: "Mechanics", href: "\/mechanics" \}/);
  assert.match(combatPage, /\{ label: "Mechanics", href: "\/mechanics" \}/);
});

test("mechanics pages cross-link equipment and death inventory rules", () => {
  const experiencePage = source("./experience/+page.svelte");
  const combatPage = source("./combat/+page.svelte");

  assert.match(
    experiencePage,
    /href="\/mechanics\/inventory#equipment-and-death"/,
  );
  assert.match(experiencePage, /Retrieve from corpse/);
  assert.match(combatPage, /href="\/mechanics\/inventory#equipment-and-death"/);
  assert.match(combatPage, /Requires durability/);
});
