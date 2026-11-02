import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { getPlatformProxy } from "wrangler";
import { checkListPages } from "./crawlable-pagination.mjs";

// Use the platform's asset manifest rules, including the generated exclusions.
const platform = await getPlatformProxy({
  configPath: fileURLToPath(new URL("../wrangler.toml", import.meta.url)),
  persist: false,
  remoteBindings: false,
  envFiles: [],
});
try {
  const fetchAsset = (path) =>
    platform.env.ASSETS.fetch(`http://assets${path}`);
  const response = await fetchAsset("/robots.txt");
  if (response.status !== 200) {
    throw new Error(
      `Built assets are not readable: robots.txt returned ${response.status}`,
    );
  }

  // Search engines reach list entries through the numbered list pages.
  const fetchPage = async (path) => {
    const page = await fetchAsset(path);
    assert.equal(page.status, 200, `${path} returned ${page.status}`);
    return page.text();
  };
  const sitemap = new Set(
    parse(await fetchPage("/sitemap.xml"))
      .querySelectorAll("loc")
      .map((loc) => loc.textContent),
  );
  const { origin } = new URL([...sitemap][0]);
  const lists = [...sitemap].flatMap(
    (url) => /^https:\/\/[^/]+(\/[a-z-]+)\/page\/2$/.exec(url)?.[1] ?? [],
  );
  assert.ok(lists.includes("/items"), "The item list has no numbered pages");
  for (const basePath of lists) {
    const pages = await checkListPages({
      fetchPage,
      basePath,
      origin,
      sitemap,
    });
    if (basePath === "/items") {
      const { items } = JSON.parse(await fetchPage("/items/list.json"));
      assert.deepEqual(
        pages.flatMap((page) => page.rows).sort(),
        items.map((item) => `/items/${item.id}`).sort(),
        "Every item must be on exactly one item page",
      );
    }
  }
  console.log(
    `Cloudflare deployment assets validated, with ${lists.length} paginated lists.`,
  );
} finally {
  await platform.dispose();
}
