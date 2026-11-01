/**
 * Renders the Lucide icons that Pocket Compendium draws into the format its `Icons` class loads,
 * plus a PNG preview of each for review.
 *
 * Every icon is white on transparent, because the mod tints it with Unity's image colour, so only
 * the alpha channel is stored: 96x96 bytes, top row first, gzipped. The mod rebuilds white RGBA
 * and flips the rows for Unity.
 *
 * Output: `mods/PocketCompendium/Assets/Icons/<file>.alpha.gz` and `<file>.png`.
 *
 * Run: `pnpm --filter website gen:mod-icons`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";

const SIZE = 96;
const STROKE_WIDTH = 2.2;

/** Output file name, Lucide icon name, and whether the shape is filled instead of stroked. */
const ICONS = [
  ["bell", "bell"],
  ["book-open", "book-open"],
  ["code", "code"],
  ["coffee", "coffee"],
  ["dices", "dices"],
  ["chevrons-down-up", "chevrons-down-up"],
  ["chevrons-up-down", "chevrons-up-down"],
  ["eye", "eye"],
  ["eye-off", "eye-off"],
  ["external-link", "external-link"],
  ["globe", "globe"],
  ["hourglass", "hourglass"],
  ["info", "info"],
  ["layout-grid", "layout-grid"],
  ["layout-list", "layout-list"],
  ["locate-fixed", "locate-fixed"],
  ["lucide-lock", "lock"],
  ["lucide-lock-open", "lock-open"],
  ["message-circle", "message-circle"],
  ["map-pin", "map-pin"],
  ["moon", "moon"],
  ["move", "move"],
  ["arrow", "navigation-2", true],
  ["pin", "pin"],
  ["shield", "shield"],
  ["skull", "skull"],
  ["sliders-horizontal", "sliders-horizontal"],
  ["sun", "sun"],
  ["swords", "swords"],
  ["timer", "timer"],
  ["users", "users"],
  ["x", "x"],
];

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, "../node_modules/lucide/dist/esm/icons");
const outDir = resolve(here, "../../mods/PocketCompendium/Assets/Icons");

function attributes(node) {
  return Object.entries(node)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
}

async function svgFor(lucideName, filled) {
  const { default: nodes } = await import(`${iconsDir}/${lucideName}.mjs`);
  const body = nodes
    .map(([tag, attrs]) => `<${tag} ${attributes(attrs)}/>`)
    .join("");
  const paint = filled
    ? `fill="#fff" stroke="#fff" stroke-width="${STROKE_WIDTH}" stroke-linejoin="round"`
    : `fill="none" stroke="#fff" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${paint}>${body}</svg>`;
}

// The folder holds only this script's output, so stale icons are removed before each run.
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) rmSync(resolve(outDir, file));

for (const [file, lucideName, filled = false] of ICONS) {
  const svg = await svgFor(lucideName, filled);
  const image = new Resvg(svg, {
    fitTo: { mode: "width", value: SIZE },
  }).render();
  if (image.width !== SIZE || image.height !== SIZE)
    throw new Error(
      `${lucideName} rendered at ${image.width}x${image.height}, expected ${SIZE}x${SIZE}`,
    );

  // Only coverage matters for a white icon, and alpha is the same whether or not the renderer
  // premultiplied the colour channels.
  const source = image.pixels;
  const alpha = Buffer.alloc(SIZE * SIZE);
  for (let index = 0; index < SIZE * SIZE; index++)
    alpha[index] = source[index * 4 + 3];

  // Node's gzip header carries no timestamp, so a rerun writes identical files.
  writeFileSync(
    resolve(outDir, `${file}.alpha.gz`),
    gzipSync(alpha, { level: 9 }),
  );
  writeFileSync(resolve(outDir, `${file}.png`), image.asPng());
}
console.log(`Rendered ${ICONS.length} icons into ${outDir}`);
