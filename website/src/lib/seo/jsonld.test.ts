import { test, expect } from "vitest";
import {
  buildWebSite,
  buildOrganization,
  buildPerson,
  buildCollectionPage,
  serializeJsonLd,
  SITE_ID,
  ORG_ID,
  AUTHOR_ID,
} from "./jsonld";

test("SITE_ID, ORG_ID, AUTHOR_ID are stable", () => {
  expect(SITE_ID).toBe("https://ancient-kingdoms.compendiums.org/#website");
  expect(ORG_ID).toBe("https://ancient-kingdoms.compendiums.org/#org");
  expect(AUTHOR_ID).toBe("https://ancient-kingdoms.compendiums.org/#author");
});

test("buildWebSite has the expected shape", () => {
  const node = buildWebSite();
  expect(node["@type"]).toBe("WebSite");
  expect(node["@id"]).toBe(SITE_ID);
  expect(node.url).toBe("https://ancient-kingdoms.compendiums.org/");
  expect(node.publisher).toEqual({ "@id": ORG_ID });
  expect(node.inLanguage).toBe("en");
});

test("buildOrganization carries name, logo, description, and founder ref", () => {
  const node = buildOrganization();
  expect(node["@type"]).toBe("Organization");
  expect(node["@id"]).toBe(ORG_ID);
  expect(node.name).toBe("Ancient Kingdoms Compendium");
  expect(node.url).toBe("https://ancient-kingdoms.compendiums.org/");
  expect(node.description).toBe(
    "Fan-made wiki, interactive world map, and game database for Ancient Kingdoms",
  );
  expect(node.logo).toEqual({
    "@type": "ImageObject",
    url: "https://ancient-kingdoms.compendiums.org/icons/pwa-512.png",
    width: 512,
    height: 512,
  });
  expect(node.founder).toEqual({ "@id": AUTHOR_ID });
});

test("buildPerson uses Ko-fi as primary url with Steam cross-reference", () => {
  const node = buildPerson();
  expect(node["@type"]).toBe("Person");
  expect(node["@id"]).toBe(AUTHOR_ID);
  expect(node.name).toBe("WoW_Much");
  expect(node.url).toBe("https://ko-fi.com/wowmuch");
  expect(node.sameAs).toEqual([
    "https://ko-fi.com/wowmuch",
    "https://steamcommunity.com/profiles/76561198107304856/",
  ]);
});

test("buildCollectionPage embeds an ItemList sized to the input array", () => {
  const node = buildCollectionPage({
    path: "/items",
    name: "Items",
    description: "All items",
    items: [
      { name: "A", path: "/items/a" },
      { name: "B", path: "/items/b" },
      { name: "C", path: "/items/c" },
    ],
  });
  expect(node["@type"]).toBe("CollectionPage");
  expect(node["@id"]).toBe(
    "https://ancient-kingdoms.compendiums.org/items#page",
  );
  expect(node.isPartOf).toEqual({ "@id": SITE_ID });
  expect(node.mainEntity["@type"]).toBe("ItemList");
  expect(node.mainEntity.numberOfItems).toBe(3);
  expect(node.mainEntity.itemListElement[0]).toEqual({
    "@type": "ListItem",
    position: 1,
    name: "A",
    url: "https://ancient-kingdoms.compendiums.org/items/a",
  });
});

test("buildCollectionPage omits description cleanly when not provided", () => {
  const node = buildCollectionPage({
    path: "/items",
    name: "Items",
    items: [],
  });
  expect(node.description).toBeUndefined();
  expect(node.mainEntity.numberOfItems).toBe(0);
});

test("serializeJsonLd escapes script-tag breakout sequences", () => {
  const json = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "Thing",
    name: "x</script><script>alert(1)</script><!--",
  });

  expect(json).not.toContain("</script>");
  expect(json).not.toContain("<!--");
  expect(json).toContain("x\\u003c/script>");
  expect(json).toContain("\\u003cscript>alert(1)\\u003c/script>");
});
