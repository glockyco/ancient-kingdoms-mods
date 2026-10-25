import { describe, expect, it } from "vitest";
import { seasonIncludes, seasonOccurrence } from "./seasonal-events";

const at = (iso: string) => new Date(iso);

describe("seasonOccurrence", () => {
  it("returns the coming run before the first date", () => {
    expect(seasonOccurrence("halloween", at("2026-10-18T23:59:59Z"))).toEqual({
      start: at("2026-10-19T00:00:00Z"),
      end: at("2026-11-02T00:00:00Z"),
    });
  });

  it("keeps the current run through the last date", () => {
    const run = seasonOccurrence("halloween", at("2026-11-01T23:59:59Z"));
    expect(run.start).toEqual(at("2026-10-19T00:00:00Z"));
    expect(seasonIncludes("halloween", at("2026-11-01T23:59:59Z"))).toBe(true);
  });

  it("moves to next year once the last date has passed", () => {
    expect(
      seasonOccurrence("halloween", at("2026-11-02T00:00:00Z")).start,
    ).toEqual(at("2027-10-19T00:00:00Z"));
    expect(seasonIncludes("halloween", at("2026-11-02T00:00:00Z"))).toBe(false);
  });

  it("carries the Winter Festival across the new year", () => {
    expect(seasonOccurrence("christmas", at("2027-01-06T12:00:00Z"))).toEqual({
      start: at("2026-12-19T00:00:00Z"),
      end: at("2027-01-07T00:00:00Z"),
    });
    expect(seasonOccurrence("christmas", at("2027-01-07T00:00:00Z"))).toEqual({
      start: at("2027-12-19T00:00:00Z"),
      end: at("2028-01-07T00:00:00Z"),
    });
  });
});
