/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `cache-${version}`;
const DB_CACHE_NAME = `db-cache-${version}`;

// Assets to cache immediately
const ASSETS = [...build, ...files];

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== DB_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

sw.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Special handling for database file
  if (url.pathname === "/compendium.db") {
    event.respondWith(
      caches.open(DB_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Standard cache-first for other assets
  if (event.request.method === "GET") {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request)),
    );
  }
});
