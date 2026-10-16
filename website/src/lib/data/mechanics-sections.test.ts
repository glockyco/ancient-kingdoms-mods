import { describe, expect, test } from "vitest";
import { missingAnchors } from "$lib/testing/route-anchors";
import { MECHANICS_SECTIONS } from "./mechanics-sections";

describe("mechanics page contents", () => {
  test("every entry opens an element on its page", () => {
    const hrefs = Object.entries(MECHANICS_SECTIONS).flatMap(
      ([page, sections]) =>
        sections.map((section) => `${page.split("#")[0]}#${section.id}`),
    );
    expect(missingAnchors(hrefs)).toEqual([]);
  });
});
