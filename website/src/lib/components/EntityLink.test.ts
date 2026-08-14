import { parse } from "node-html-parser";
import { render } from "svelte/server";
import { describe, expect, test } from "vitest";
import EntityLink from "./EntityLink.svelte";
import ItemLink from "./ItemLink.svelte";

describe("EntityLink", () => {
  test("defaults to baseline text without rendering available artwork", () => {
    const { body } = render(EntityLink, {
      props: {
        href: "/npcs/elowen_brightsong",
        name: "Elowen Brightsong",
        domain: "npc",
        entityId: "elowen_brightsong",
        imageAvailable: true,
      },
    });
    const root = parse(body);
    const anchor = root.querySelector("a");

    expect(anchor?.textContent.trim()).toBe("Elowen Brightsong");
    expect(anchor?.getAttribute("class")).toContain("align-baseline");
    expect(root.querySelector("img")).toBeNull();
  });

  test("renders a centered artwork reference only when requested", () => {
    const { body } = render(EntityLink, {
      props: {
        href: "/npcs/elowen_brightsong",
        name: "Elowen Brightsong",
        variant: "reference",
        domain: "npc",
        entityId: "elowen_brightsong",
        imageAvailable: true,
      },
    });
    const root = parse(body);
    const anchor = root.querySelector("a");
    const image = root.querySelector("img");

    expect(anchor?.getAttribute("class")).toContain("inline-flex");
    expect(anchor?.getAttribute("class")).toContain("items-center");
    expect(image?.getAttribute("src")).toBe(
      "/images/npcs/elowen_brightsong/primary.webp",
    );
  });
});

describe("ItemLink", () => {
  test("forwards reference artwork dimensions without a tooltip", () => {
    const { body } = render(ItemLink, {
      props: {
        itemId: "minor_potion_of_healing",
        itemName: "Minor Potion of Healing",
        variant: "reference",
        imageAvailable: true,
        imageWidth: 40,
        imageHeight: 20,
      },
    });
    const image = parse(body).querySelector("img");

    expect(image?.getAttribute("src")).toBe(
      "/images/items/minor_potion_of_healing/icon.webp",
    );
    expect(image?.getAttribute("width")).toBe("40");
    expect(image?.getAttribute("height")).toBe("20");
  });
});
