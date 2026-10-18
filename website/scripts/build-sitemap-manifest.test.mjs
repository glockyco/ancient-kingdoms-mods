import { test, expect } from "vitest";
import {
  createSemanticHasher,
  hashRow,
  mergeManifests,
} from "./build-sitemap-manifest.mjs";
import { createSemanticComparator } from "../src/lib/acquisition/fingerprint.ts";

const GENERATED = "2026-05-14T03:12:04.000Z";
const TODAY = GENERATED.slice(0, 10);
const baseline = (entries) => ({
  version: 2,
  hash_scheme: "compendium-page-v2",
  generated: "2026-01-02T00:00:00.000Z",
  entries,
});
const next = (hashes = {}, bareUrls = []) => ({ hashes, bareUrls });
const merge = (previous, candidate) =>
  mergeManifests(previous, candidate, TODAY, GENERATED);

test("unchanged content retains its date while changed and new content receive the generation date", () => {
  const previous = baseline({
    "https://example.com/unchanged": { hash: "same", lastmod: "2026-01-01" },
    "https://example.com/changed": { hash: "old", lastmod: "2026-02-02" },
    "https://example.com/removed": { hash: "removed", lastmod: "2026-03-03" },
  });
  const result = merge(
    previous,
    next({
      "https://example.com/unchanged": "same",
      "https://example.com/changed": "new",
      "https://example.com/added": "added",
    }),
  );
  expect(result.entries).toEqual({
    "https://example.com/added": { hash: "added", lastmod: TODAY },
    "https://example.com/changed": { hash: "new", lastmod: TODAY },
    "https://example.com/unchanged": { hash: "same", lastmod: "2026-01-01" },
  });
  expect(Object.keys(result.entries)).toEqual([
    "https://example.com/added",
    "https://example.com/changed",
    "https://example.com/unchanged",
  ]);
});

test("missing baselines start fresh and bare URLs never acquire content dates", () => {
  const initial = merge(
    null,
    next({ "https://example.com/content": "hash" }, [
      "https://example.com/map",
    ]),
  );
  expect(initial).toEqual({
    version: 2,
    hash_scheme: "compendium-page-v2",
    generated: GENERATED,
    entries: {
      "https://example.com/content": { hash: "hash", lastmod: TODAY },
      "https://example.com/map": {},
    },
  });
  const changedToBare = merge(
    baseline({
      "https://example.com/content": { hash: "hash", lastmod: "2026-01-01" },
    }),
    next({}, ["https://example.com/content"]),
  );
  expect(changedToBare.entries).toEqual({ "https://example.com/content": {} });
});

test("legacy and unknown baseline schemes fail instead of resetting publication dates", () => {
  for (const previous of [
    { entries: {} },
    { version: 1, entries: {} },
    { ...baseline({}), hash_scheme: "unknown" },
    { ...baseline({}), version: 3 },
  ])
    expect(() => merge(previous, next())).toThrow(
      "unsupported baseline scheme",
    );
});

test("malformed publication entries cannot silently donate dates", () => {
  for (const entry of [
    null,
    [],
    "hash",
    { hash: "x" },
    { lastmod: "2026-01-01" },
    { hash: "x", lastmod: "2026-02-30" },
    { hash: "x", lastmod: "2026-01-01", internal: "value" },
    { hash: "", lastmod: "2026-01-01" },
  ])
    expect(() =>
      merge(baseline({ "https://example.com/a": entry }), next()),
    ).toThrow("invalid entry");
});

test("generation instant is one explicit UTC clock and must match the content date", () => {
  for (const generated of [
    "invalid",
    "2026-05-14",
    "2026-05-14T03:12:04+00:00",
  ])
    expect(() => mergeManifests(null, next(), TODAY, generated)).toThrow(
      "generation instant",
    );
  expect(() => mergeManifests(null, next(), "2026-05-13", GENERATED)).toThrow(
    "date differs",
  );
  expect(() =>
    merge({ ...baseline({}), generated: "invalid" }, next()),
  ).toThrow("generation instant");
});

test("semantic hashes identify copied and shared values independently of object insertion order", () => {
  const hash = createSemanticHasher();
  const shared = Object.freeze({
    amount: 25,
    item: Object.freeze({ id: "arrows", name: "Arrows" }),
  });
  const dag = Object.freeze({
    outputs: Object.freeze([shared, shared]),
    cost: Object.freeze({ gold: 10 }),
  });
  const copied = {
    cost: { gold: 10 },
    outputs: [
      { item: { name: "Arrows", id: "arrows" }, amount: 25 },
      { amount: 25, item: { id: "arrows", name: "Arrows" } },
    ],
  };
  expect(hash(dag)).toBe(hash(copied));
  expect(hash(dag)).toBe(hashRow(copied));
  let exponential = Object.freeze({ amount: 1 });
  for (let depth = 0; depth < 60; depth++)
    exponential = Object.freeze([exponential, exponential]);
  expect(hash(exponential)).toMatch(/^[0-9a-f]{64}$/);
});

test("semantic framing distinguishes scalar types, keys, boundaries, order and duplicates", () => {
  const values = [
    null,
    undefined,
    false,
    0,
    "0",
    [],
    {},
    [1, 2],
    [2, 1],
    [1, 1, 2],
    { a: 1 },
    { b: 1 },
    { a: undefined },
    { a: null },
    ["ab", "c"],
    ["a", "bc"],
    { "a:b": "c" },
    { a: "b:c" },
    "\ud800",
    "\ufffd",
    "s1:x",
    { "\ud800": 1 },
    { "\ufffd": 1 },
  ];
  expect(new Set(values.map(hashRow)).size).toBe(values.length);
});

test("every nested cost, gate, delivery and anonymous process field participates", () => {
  const original = {
    costs: [{ amount: 2, role: "material", withheld: true }],
    requirements: [{ kind: "metric_at_least", amount: 5 }],
    outputs: [{ amount: 25, delivery: "inventory" }],
    process: [{ probability: 0.2, cap: 2, duplicateGroup: 0, withheld: true }],
  };
  const baselineHash = hashRow(original);
  for (const change of [
    (value) => {
      value.costs[0].amount++;
    },
    (value) => {
      value.costs[0].withheld = false;
    },
    (value) => {
      value.requirements[0].amount++;
    },
    (value) => {
      value.outputs[0].amount++;
    },
    (value) => {
      value.outputs[0].delivery = "keyring";
    },
    (value) => {
      value.process[0].probability = 0.3;
    },
    (value) => {
      value.process[0].cap++;
    },
    (value) => {
      value.process[0].duplicateGroup++;
    },
  ]) {
    const changed = structuredClone(original);
    change(changed);
    expect(hashRow(changed)).not.toBe(baselineHash);
  }
});

test("one build does not cache mutable descendants or freeze caller values", () => {
  const hash = createSemanticHasher(),
    child = { amount: 1 };
  const value = Object.freeze({ child }),
    ancestor = Object.freeze({ value });
  const before = hash(ancestor);
  child.amount = 2;
  expect(hash(ancestor)).not.toBe(before);
  expect(Object.isFrozen(child)).toBe(false);
  expect(hash(ancestor)).toBe(hashRow({ value: { child: { amount: 2 } } }));
});

test("unordered semantic collections have complete structural tie-breaks without flattening DAGs", () => {
  const compare = createSemanticComparator();
  const shared = Object.freeze({ id: "arrows", name: "Arrows" });
  const values = [
    { identity: shared, method: { cost: 2, output: 25 } },
    { identity: shared, method: { cost: 1, output: 25 } },
    { identity: { id: "iron", name: "Iron" }, method: { cost: 1, output: 1 } },
  ];
  const ordered = [...values].sort(compare);
  expect(hashRow(ordered)).toBe(
    hashRow(structuredClone([...values].reverse()).sort(compare)),
  );
  expect(compare(values[0], values[1])).not.toBe(0);
  let left = Object.freeze({ cap: 1 }),
    right = Object.freeze({ cap: 1 });
  for (let depth = 0; depth < 60; depth++) {
    left = Object.freeze([left, left]);
    right = Object.freeze([right, right]);
  }
  expect(compare(left, right)).toBe(0);
  expect(compare({ value: [1, 2] }, { value: [2, 1] })).not.toBe(0);
});

test("semantic data rejects frozen accessors rather than caching their external state", () => {
  let amount = 1;
  const getter = Object.freeze({
    get amount() {
      return amount;
    },
  });
  const ancestor = Object.freeze({ getter });
  const array = [0];
  Object.defineProperty(array, "0", {
    get() {
      return amount;
    },
  });
  Object.freeze(array);
  const hash = createSemanticHasher(),
    compare = createSemanticComparator();
  for (const value of [getter, ancestor, array]) {
    expect(() => hash(value)).toThrow("semantic accessors are unsupported");
    amount++;
    expect(() => hash(value)).toThrow("semantic accessors are unsupported");
  }
  expect(() => compare(getter, Object.freeze({ amount: 1 }))).toThrow(
    "semantic accessors are unsupported",
  );
  expect(() => compare(array, Object.freeze([1]))).toThrow(
    "semantic accessors are unsupported",
  );
});

test("structural comparisons do not memoize shallow-frozen mutable descendants", () => {
  const compare = createSemanticComparator();
  const cost = { amount: 2 };
  const left = Object.freeze({ cost }),
    right = Object.freeze({ cost: Object.freeze({ amount: 3 }) });
  expect(compare(left, right)).toBeLessThan(0);
  cost.amount = 4;
  expect(compare(left, right)).toBeGreaterThan(0);
  expect(Object.isFrozen(cost)).toBe(false);
});
