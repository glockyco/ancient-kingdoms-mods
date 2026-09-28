import { parse } from "node-html-parser";
import { render } from "svelte/server";
import { describe, expect, test } from "vitest";
import ItemTooltip from "./ItemTooltip.svelte";

describe("ItemTooltip", () => {
  test("does not request an icon or reserve its frame when artwork is absent", () => {
    const { body } = render(ItemTooltip, {
      props: {
        tooltipHtml: "Helm of the Twilight",
        visualAsset: null,
      },
    });
    const root = parse(body);

    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector(".float-right")).toBeNull();
    expect(root.textContent).toContain("Helm of the Twilight");
  });

  test("uses the registered icon path and dimensions", () => {
    const { body } = render(ItemTooltip, {
      props: {
        tooltipHtml: "Frostheart",
        visualAsset: {
          public_path: "images/items/frostheart/icon.webp",
          width: 25,
          height: 29,
        },
      },
    });
    const image = parse(body).querySelector("img");

    expect(image?.getAttribute("src")).toBe(
      "/images/items/frostheart/icon.webp",
    );
    expect(image?.getAttribute("width")).toBe("25");
    expect(image?.getAttribute("height")).toBe("29");
  });

  test("uses a recorded path even when intrinsic dimensions are unavailable", () => {
    const { body } = render(ItemTooltip, {
      props: {
        tooltipHtml: "Frostheart",
        visualAsset: { public_path: "images/items/frostheart/icon.webp" },
      },
    });
    const image = parse(body).querySelector("img");

    expect(image?.getAttribute("src")).toBe(
      "/images/items/frostheart/icon.webp",
    );
    expect(image?.getAttribute("width")).toBeUndefined();
  });
});
