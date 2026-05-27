import { test } from "vitest";
import assert from "node:assert/strict";
import { parseGameVersionRss } from "./steam-news-parser.ts";

const latestRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Ancient Kingdoms v0.9.18.0 - Fishing</title>
      <link><![CDATA[https://store.steampowered.com/news/app/2241380/view/690884077303104797]]></link>
      <pubDate>Tue, 26 May 2026 14:42:50 +0000</pubDate>
    </item>
    <item>
      <title>Ancient Kingdoms v0.9.17.2 Hotfix 🛠️</title>
      <link><![CDATA[https://store.steampowered.com/news/app/2241380/view/666113645632029718]]></link>
      <pubDate>Mon, 18 May 2026 03:40:45 +0000</pubDate>
    </item>
  </channel>
</rss>`;

test("parseGameVersionRss: returns newest version and store news link", () => {
  assert.deepEqual(parseGameVersionRss(latestRss), {
    ok: true,
    version: "0.9.18.0",
    date: 1779806570,
    url: "https://store.steampowered.com/news/app/2241380/view/690884077303104797",
  });
});

test("parseGameVersionRss: skips non-version entries, picks next match", () => {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss><channel>
  <item>
    <title>Devblog: a year of Ancient Kingdoms</title>
    <link>https://example.com/devblog</link>
    <pubDate>Tue, 26 May 2026 14:42:50 +0000</pubDate>
  </item>
  <item>
    <title><![CDATA[Ancient Kingdoms v0.9.17.2 Hotfix 🛠️]]></title>
    <link><![CDATA[https://example.com/patch]]></link>
    <pubDate>Mon, 18 May 2026 03:40:45 +0000</pubDate>
  </item>
</channel></rss>`;

  const r = parseGameVersionRss(rss);

  assert.equal(r.ok && r.version, "0.9.17.2");
  assert.equal(r.ok && r.url, "https://example.com/patch");
});

test("parseGameVersionRss: supports 3-segment and 4-segment versions", () => {
  const threeSegment = `<rss><channel><item><title>Ancient Kingdoms v0.10.0 - Big Update</title><link>https://example.com/three</link></item></channel></rss>`;
  const fourSegment = `<rss><channel><item><title>Ancient Kingdoms v1.0.0.1 Hotfix</title><link>https://example.com/four</link></item></channel></rss>`;

  const threeSegmentResult = parseGameVersionRss(threeSegment);
  const fourSegmentResult = parseGameVersionRss(fourSegment);

  assert.equal(threeSegmentResult.ok && threeSegmentResult.version, "0.10.0");
  assert.equal(fourSegmentResult.ok && fourSegmentResult.version, "1.0.0.1");
});

test("parseGameVersionRss: rejects two-segment versions", () => {
  const rss = `<rss><channel><item><title>Ancient Kingdoms v1.0 Demo Release</title><link>https://example.com/demo</link></item></channel></rss>`;

  assert.deepEqual(parseGameVersionRss(rss), { ok: false });
});

test("parseGameVersionRss: malformed entity in title does not throw", () => {
  const rss = `<rss><channel><item><title>Ancient Kingdoms v0.9.18.0 &#9999999999;</title><link>https://example.com/patch</link></item></channel></rss>`;

  const r = parseGameVersionRss(rss);

  assert.equal(r.ok && r.version, "0.9.18.0");
});

test("parseGameVersionRss: invalid or empty input returns ok:false", () => {
  assert.deepEqual(parseGameVersionRss(""), { ok: false });
  assert.deepEqual(parseGameVersionRss(null), { ok: false });
  assert.deepEqual(parseGameVersionRss(undefined), { ok: false });
});
