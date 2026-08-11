import { describe, expect, test } from "vitest";
import { entityImageUrl } from "./entityImage";

describe("entityImageUrl", () => {
  test("rejects ids that cannot be published verbatim", () => {
    expect(() => entityImageUrl("item", "bad/id", "icon")).toThrow(
      "Invalid entity id",
    );
    expect(() => entityImageUrl("item", "helm", "bad/kind")).toThrow(
      "Invalid artwork kind",
    );
  });
});
