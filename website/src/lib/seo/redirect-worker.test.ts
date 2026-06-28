import assert from "node:assert/strict";
import { test } from "vitest";
import worker from "../../../redirect-worker";

test("legacy hostname redirects to canonical URL and advertises canonical target", async () => {
  const request = new Request(
    "https://ancient-kingdoms-compendium.wowmuch1.workers.dev/map?x=1",
  );

  const response = await worker.fetch(request);

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("Location"),
    "https://ancient-kingdoms.compendiums.org/map?x=1",
  );
  assert.equal(
    response.headers.get("Link"),
    '<https://ancient-kingdoms.compendiums.org/map?x=1>; rel="canonical"',
  );
});
