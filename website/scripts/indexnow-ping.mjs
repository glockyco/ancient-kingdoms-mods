import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_HOST = "ancient-kingdoms.compendiums.org";
const SITE_URL = `https://${SITE_HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const KEY = "b0384ee2818bf5cb2ce24f8699d2377f";
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;

export function selectUrlsToPing(previous, current) {
  const urls = [];
  const prevEntries = previous?.entries ?? {};
  const currentEntries = current?.entries ?? {};

  for (const [url, entry] of Object.entries(currentEntries)) {
    if (!("hash" in entry)) continue;
    const prev = prevEntries[url];
    if (!prev || !("hash" in prev) || prev.hash !== entry.hash) urls.push(url);
  }

  for (const [url, entry] of Object.entries(prevEntries)) {
    if (url in currentEntries) continue;
    if (!("hash" in entry)) continue;
    urls.push(url);
  }

  return urls;
}

export function buildPayload({ host, key, keyLocation, urls }) {
  return { host, key, keyLocation, urlList: urls };
}

export async function sendIndexNowPing(payload, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(`indexnow: fetch failed (${err?.message ?? err})`, {
      cause: err,
    });
  }

  if (!res.ok) {
    const body = await res.text();
    const details = body ? `\nindexnow body: ${body}` : "";
    throw new Error(`indexnow: ${res.status} ${res.statusText}${details}`);
  }

  return res;
}

function loadManifest(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  const [prevPath, nextPath] = process.argv.slice(2);
  if (!prevPath || !nextPath) {
    throw new Error(
      "Usage: node scripts/indexnow-ping.mjs <prev-manifest> <current-manifest>",
    );
  }

  const previous = loadManifest(resolve(prevPath));
  if (previous === null) {
    console.log("indexnow: no live baseline manifest; skipping ping");
    return;
  }
  const current = loadManifest(resolve(nextPath));
  if (current === null) {
    throw new Error(`indexnow: current manifest not found at ${nextPath}`);
  }
  const urls = selectUrlsToPing(previous, current);

  if (urls.length === 0) {
    console.log("indexnow: no manifest changes; skipping ping");
    return;
  }

  const payload = buildPayload({
    host: SITE_HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urls,
  });

  console.log(`indexnow: pinging ${urls.length} URLs`);
  const res = await sendIndexNowPing(payload);
  console.log(`indexnow: ${res.status} ${res.statusText}`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
