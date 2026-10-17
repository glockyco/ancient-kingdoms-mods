import { describe, expect, test } from "vitest";
import { formatNumber, formatPercent } from "./format";

describe("formatPercent", () => {
  test.each([
    [0, "0%", "10%"],
    [1, "0.0%", "10.0%"],
    [2, "0.00%", "10.00%"],
    [3, "0.000%", "10.000%"],
  ] as const)(
    "retains or drops trailing zeros at precision %s",
    (decimals, zero, ten) => {
      expect(formatPercent(0, { decimals })).toBe("0%");
      expect(formatPercent(0.1, { decimals })).toBe("10%");
      expect(formatPercent(0, { decimals, trailingZeros: true })).toBe(zero);
      expect(formatPercent(0.1, { decimals, trailingZeros: true })).toBe(ten);
    },
  );

  test.each([
    [0.123456, 0, "12%"],
    [0.123456, 1, "12.3%"],
    [0.123456, 2, "12.35%"],
    [0.123456, 3, "12.346%"],
    [-0.123456, 2, "−12.35%"],
    [0.0000123, 2, "0%"],
    [-0.0000123, 2, "0%"],
  ])("rounds %s at precision %s", (value, decimals, expected) => {
    expect(
      formatPercent(value as number, { decimals: decimals as number }),
    ).toBe(expected);
  });

  test("keeps tiny nonzero chances visible only when requested", () => {
    expect(
      formatPercent(0.0000123, { decimals: 2, preserveNonzero: true }),
    ).toBe("0.0012%");
    expect(
      formatPercent(-0.0000123, { decimals: 2, preserveNonzero: true }),
    ).toBe("−0.0012%");
    expect(formatPercent(0, { decimals: 2, preserveNonzero: true })).toBe("0%");
    expect(formatPercent(0.00005, { decimals: 2, preserveNonzero: true })).toBe(
      "0.01%",
    );
  });

  test("uses a true minus sign with fixed precision", () => {
    expect(formatPercent(-0.1, { decimals: 2, trailingZeros: true })).toBe(
      "−10.00%",
    );
    expect(
      formatPercent(-0.0000123, { decimals: 2, trailingZeros: true }),
    ).toBe("−0.00%");
  });
});

describe("formatNumber", () => {
  test("keeps the caller's grouping separator", () => {
    expect(formatNumber(1234567, { groupSeparator: "\u202F" })).toBe(
      "1\u202F234\u202F567",
    );
    expect(formatNumber(-1234, { groupSeparator: "\u202F" })).toBe(
      "−1\u202F234",
    );
  });

  test("retains locale rounding for grouped decimal numbers", () => {
    expect(formatNumber(1.005, { decimals: 2 })).toBe("1.01");
    expect(formatNumber(1.005, { decimals: 2, grouping: false })).toBe("1");
  });
  test.each([
    [0, "0"],
    [1234, "1,234"],
    [-1234, "−1,234"],
    [-1.5, "−1.5"],
    [1.23456, "1.235"],
    [0.0000123, "0"],
  ])("formats %s", (value, expected) => {
    expect(formatNumber(value as number)).toBe(expected);
  });

  test.each([
    [0, "1234", "1,234"],
    [1, "1234.0", "1,234.0"],
    [2, "1234.00", "1,234.00"],
    [3, "1234.000", "1,234.000"],
  ] as const)(
    "respects precision %s with and without grouping",
    (decimals, fixed, grouped) => {
      expect(formatNumber(1234, { decimals })).toBe("1,234");
      expect(formatNumber(1234, { decimals, trailingZeros: true })).toBe(
        grouped,
      );
      expect(
        formatNumber(1234, { decimals, trailingZeros: true, grouping: false }),
      ).toBe(fixed);
      expect(formatNumber(1234, { decimals, grouping: false })).toBe("1234");
    },
  );

  test("rounds the last shown decimal and preserves the minus sign", () => {
    expect(formatNumber(-1234.567, { decimals: 2 })).toBe("−1,234.57");
    expect(formatNumber(-1234.567, { decimals: 2, grouping: false })).toBe(
      "−1234.57",
    );
    expect(formatNumber(0, { decimals: 2, trailingZeros: true })).toBe("0.00");
  });
});
