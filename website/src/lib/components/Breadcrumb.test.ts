import { test, expect } from "vitest";
import { buildBreadcrumbLd } from "./Breadcrumb.svelte";

test("string href becomes a clean canonical URL", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    { label: "Abyssal Tidehammer" },
  ]);
  expect(ld.itemListElement[0].item).toBe(
    "https://ancient-kingdoms.compendiums.org/",
  );
  expect(ld.itemListElement[1].item).toBe(
    "https://ancient-kingdoms.compendiums.org/items",
  );
  expect(ld.itemListElement[2]).not.toHaveProperty("item");
});

test("route+params href substitutes [param] placeholders", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    {
      label: "Sword",
      href: { route: "/items/[id]", params: { id: "abyssal_tidehammer" } },
    },
  ]);
  expect(ld.itemListElement[2].item).toBe(
    "https://ancient-kingdoms.compendiums.org/items/abyssal_tidehammer",
  );
});

test("no URL contains '.' or '..' segments", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    { label: "Foo", href: { route: "/items/[id]", params: { id: "foo" } } },
  ]);
  for (const entry of ld.itemListElement) {
    if (entry.item) {
      const url = entry.item as string;
      expect(url).not.toMatch(/\/\.{1,2}(\/|$)/);
    }
  }
});
