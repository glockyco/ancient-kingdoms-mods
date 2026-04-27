#!/usr/bin/env node
/**
 * Build-time renderer for static/og-default.png.
 *
 * Open Graph and Twitter card images must be raster (Discord, Slack, and X
 * all require image/png or image/jpeg, none accept SVG or webp). resvg-js
 * rasterises an inline SVG composition of the project logo plus brand text
 * onto a 1200x630 canvas, then writes the result next to the static assets
 * picked up by adapter-static.
 *
 * Run automatically via the "prebuild" npm script. The output is committed
 * so deploys do not depend on this script succeeding in CI.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const logoPath = resolve(projectRoot, "static/icons/pwa-512.png");
const outPath = resolve(projectRoot, "static/og-default.png");

const WIDTH = 1200;
const HEIGHT = 630;

// Embed the logo as a data URL so resvg-js doesn't need to resolve external
// hrefs. the source PNG matches the icon shipped to PWA installs.
const logoBase64 = readFileSync(logoPath).toString("base64");
const logoDataUrl = `data:image/png;base64,${logoBase64}`;

// Background colour matches the dark theme of the site (slate-900-ish).
// Text colours intentionally high-contrast for thumbnail readability.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#111c33" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

  <!-- Subtle accent border -->
  <rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" fill="none" stroke="#1f2a44" stroke-width="2" rx="18" />

  <!-- Logo -->
  <image href="${logoDataUrl}" x="90" y="170" width="290" height="290" />

  <!-- Brand name -->
  <text x="440" y="295" font-family="Inter, Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#f8fafc">
    Ancient Kingdoms
  </text>
  <text x="440" y="380" font-family="Inter, Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#facc15">
    Compendium
  </text>

  <!-- Tagline -->
  <text x="440" y="450" font-family="Inter, Helvetica, Arial, sans-serif" font-size="32" font-weight="500" fill="#94a3b8">
    Wiki and Interactive Map
  </text>
</svg>`;

const resvg = new Resvg(svg, {
  background: "#0b1220",
  fitTo: { mode: "width", value: WIDTH },
  font: {
    // Fall back to system fonts if Inter is unavailable. resvg-js bundles
    // its own font lookup so generic family names map to whatever is on the
    // host. The exact face is not important for thumbnail use.
    loadSystemFonts: true,
  },
});

const png = resvg.render().asPng();
writeFileSync(outPath, png);

console.log(`Wrote ${outPath} (${png.length} bytes, ${WIDTH}x${HEIGHT})`);
