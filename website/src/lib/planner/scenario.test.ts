import { describe, expect, it } from "vitest";
import { assertSupportedTargetCount } from "./scenario";

describe("assertSupportedTargetCount", () => {
  it("accepts the one-target model", () => {
    expect(() => assertSupportedTargetCount(1)).not.toThrow();
  });

  it.each([0, 2, 3])("refuses unsupported target count %i", (targetCount) => {
    expect(() => assertSupportedTargetCount(targetCount)).toThrow(
      `Unsupported target count ${targetCount}; expected 1`,
    );
  });
});
