import { describe, expect, it } from "vitest";
import { asksAboutOldValorath } from "./query";

describe("asksAboutOldValorath", () => {
  it.each([
    "val",
    "valor",
    "valorat",
    "Valorath",
    "old v",
    "old val",
    "old valorath",
    "key to old valorath",
    "fall of valorath",
  ])("shows the notice for %j", (query) => {
    expect(asksAboutOldValorath(query)).toBe(true);
  });

  it.each(["", "va", "old", "old wyrm", "vampire", "valorathian x"])(
    "does not show the notice for %j",
    (query) => {
      expect(asksAboutOldValorath(query)).toBe(false);
    },
  );
});
