import { describe, expect, it } from "vitest";
import { PLANNER_DATA_URL } from "./planner-assets";

describe("planner payload asset", () => {
  it("is registered through Vite's URL asset pipeline", () => {
    expect(PLANNER_DATA_URL).toContain("planner-data.json.gz");
  });
});
