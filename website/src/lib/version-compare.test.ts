import { test } from "vitest";
import assert from "node:assert/strict";
import { compareVersions } from "./version-compare.ts";

test("compareVersions: equal versions return 0", () => {
  assert.equal(compareVersions("0.9.14.3", "0.9.14.3"), 0);
});

test("compareVersions: a < b at major segment", () => {
  assert.ok(compareVersions("0.9.14.3", "1.0.0") < 0);
});

test("compareVersions: a < b at minor segment", () => {
  assert.ok(compareVersions("0.9.13.3", "0.9.14.0") < 0);
});

test("compareVersions: a > b at patch segment", () => {
  assert.ok(compareVersions("0.9.14.5", "0.9.14.3") > 0);
});

test("compareVersions: a < b at hotfix segment", () => {
  assert.ok(compareVersions("0.9.14.0", "0.9.14.3") < 0);
});

test("compareVersions: missing trailing segments treated as zero", () => {
  assert.equal(compareVersions("0.9.14", "0.9.14.0"), 0);
});

test("compareVersions: 3-segment behind 4-segment with content", () => {
  assert.ok(compareVersions("0.9.14", "0.9.14.1") < 0);
});

test("compareVersions: 4-segment ahead of 3-segment with content", () => {
  assert.ok(compareVersions("0.9.14.1", "0.9.14") > 0);
});
