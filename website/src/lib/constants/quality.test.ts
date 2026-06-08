import { describe, expect, it } from "vitest";
import {
  QUALITY_IDS,
  QUALITY_NAMES,
  getQualityId,
  getQualityName,
} from "./quality";
import {
  getQualityColorClass,
  getQualityTextColorClass,
} from "$lib/utils/format";

describe("item quality constants", () => {
  it("maps game quality 5 to Mythic", () => {
    expect(QUALITY_NAMES[5]).toBe("Mythic");
    expect(QUALITY_IDS[5]).toBe("mythic");
    expect(getQualityName(5)).toBe("Mythic");
    expect(getQualityId(5)).toBe("mythic");
    expect(getQualityColorClass(5)).toBe("text-quality-mythic");
    expect(getQualityTextColorClass(5)).toBe("text-quality-text-mythic");
  });

  it("keeps unknown qualities on the Common fallback", () => {
    expect(getQualityName(99)).toBe("Common");
    expect(getQualityId(99)).toBe("common");
    expect(getQualityColorClass(99)).toBe("text-quality-common");
    expect(getQualityTextColorClass(99)).toBe("text-quality-text-common");
  });
});
