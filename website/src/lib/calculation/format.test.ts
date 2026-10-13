import { describe, expect, test } from "vitest";
import { formatNumber, formatPercent } from "./format";

describe("calculation numeric formatting", () => {
  test.each([
    [1234, "1,234"],
    [-1234, "−1,234"],
    [-1.5, "−1.5"],
    [0, "0"],
  ])("formats number %s as %s", (value, expected) => {
    expect(formatNumber(value as number)).toBe(expected);
  });

  test.each([
    [0.125, "12.5%"],
    [-0.125, "−12.5%"],
    [-0.01, "−1%"],
    [-0.0000123, "−0.0012%"],
    [0.0000123, "0.0012%"],
    [0, "0%"],
  ])("formats percentage %s as %s", (value, expected) => {
    expect(formatPercent(value as number)).toBe(expected);
  });
});
