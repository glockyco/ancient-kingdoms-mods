import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import worker from "./redirect-worker";

const LEGACY_ORIGIN =
  "https://ancient-kingdoms-compendium.wowmuch1.workers.dev";
const CANONICAL_ORIGIN = "https://ancient-kingdoms.compendiums.org";
const VERIFICATION_PATH = "/google279cf61d0b725839.html";

const verificationFile = readFileSync(
  new URL("./static/google279cf61d0b725839.html", import.meta.url),
  "utf8",
);

function call(path: string): Response {
  return worker.fetch(new Request(`${LEGACY_ORIGIN}${path}`));
}

test("serves the Google verification token with 200 instead of redirecting", async () => {
  const res = call(VERIFICATION_PATH);
  expect(res.status).toBe(200);
  expect(res.headers.get("Location")).toBeNull();
  expect(res.headers.get("Content-Type")).toMatch(/text\/html/);
  expect(await res.text()).toBe(verificationFile);
});

test("verification body stays in sync with the committed static file", async () => {
  const res = call(VERIFICATION_PATH);
  // Guards against the worker token drifting away from static/ if the file is
  // regenerated. Both properties must present the identical token.
  expect((await res.text()).trim()).toBe(verificationFile.trim());
});

test("redirects all other paths to the canonical domain, preserving path and query", () => {
  const res = call("/items?q=sword");
  expect(res.status).toBe(301);
  expect(res.headers.get("Location")).toBe(`${CANONICAL_ORIGIN}/items?q=sword`);
  expect(res.headers.get("Link")).toBe(
    `<${CANONICAL_ORIGIN}/items?q=sword>; rel="canonical"`,
  );
});

test("redirects the site root to the canonical domain", () => {
  const res = call("/");
  expect(res.status).toBe(301);
  expect(res.headers.get("Location")).toBe(`${CANONICAL_ORIGIN}/`);
});
