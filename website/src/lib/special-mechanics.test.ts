import { describe, expect, it } from "vitest";
import {
  getItemSpecialMechanics,
  getMonsterSpecialMechanics,
  type SpecialMechanicText,
} from "./special-mechanics";

function textContent(parts: SpecialMechanicText): string {
  return parts
    .map((part: SpecialMechanicText[number]) =>
      typeof part === "string" ? part : part.label,
    )
    .join("");
}

describe("curated special mechanics", () => {
  it("cross-links Valaark and Dragonbait Stew", () => {
    const monsterMechanics = getMonsterSpecialMechanics("valaark");
    const itemMechanics = getItemSpecialMechanics("dragonbait_stew");

    expect(monsterMechanics).toHaveLength(1);
    expect(monsterMechanics[0].title).toBe("Invulnerability");
    expect(monsterMechanics[0].summary).toContainEqual({
      href: "/items/dragonbait_stew",
      label: "Dragonbait Stew",
    });
    expect(monsterMechanics[0].details).toHaveLength(6);
    const detailText = monsterMechanics[0].details.map(textContent).join(" ");
    expect(detailText).toContain("60-299 seconds");
    expect(detailText).toContain(
      "one random damage resistance drops to 500 while the others stay at 2000",
    );
    expect(detailText).toContain("area damage is halved");

    expect(itemMechanics).toHaveLength(1);
    expect(itemMechanics[0].title).toBe("Valaark Vulnerability");
    expect(itemMechanics[0].summary).toContainEqual({
      href: "/monsters/valaark",
      label: "Valaark",
    });
    expect(itemMechanics[0].details).toEqual([]);
  });

  it("returns no mechanics for ordinary entities", () => {
    expect(getMonsterSpecialMechanics("wolf")).toEqual([]);
    expect(getItemSpecialMechanics("apple")).toEqual([]);
  });
});
