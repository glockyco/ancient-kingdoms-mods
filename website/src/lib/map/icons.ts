/**
 * Generate icon atlas from Lucide icons for deck.gl IconLayer.
 * Creates colored circle backgrounds with white icons overlaid.
 */

import {
  Sword,
  Crown,
  Shield,
  Star,
  Crosshair,
  User,
  CircleDot,
  Box,
  Shovel,
  Flame,
  Leaf,
  Pickaxe,
  Sparkles,
  Package,
  FlaskConical,
  Hammer,
  ChefHat,
  Scroll,
  type IconNode,
} from "lucide";
import { LAYER_COLORS } from "./config";

// Icon size in the atlas (pixels)
const ICON_SIZE = 64;
// Padding between icon circle edge and atlas cell edge (prevents clipping)
const CIRCLE_PADDING = 2;

/** Convert RGB array to hex string */
function rgbToHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Entity type configurations: icon + color key + optional flip
// Colors are derived from LAYER_COLORS (single source of truth)
const ENTITY_ICONS: Record<
  string,
  { icon: IconNode; colorKey: keyof typeof LAYER_COLORS; flipX?: boolean }
> = {
  // Sword flipped horizontally for better visual appearance
  monster: { icon: Sword, colorKey: "monster", flipX: true },
  boss: { icon: Crown, colorKey: "boss" },
  elite: { icon: Shield, colorKey: "elite" },
  fabled: { icon: Star, colorKey: "fabled" },
  hunt: { icon: Crosshair, colorKey: "hunt" },
  npc: { icon: User, colorKey: "npc" },
  portal: { icon: CircleDot, colorKey: "portal" },
  chest: { icon: Box, colorKey: "chest" },
  altar: { icon: Flame, colorKey: "altar" },
  gathering_plant: { icon: Leaf, colorKey: "gathering_plant" },
  gathering_mineral: { icon: Pickaxe, colorKey: "gathering_mineral" },
  gathering_spark: { icon: Sparkles, colorKey: "gathering_spark" },
  gathering_other: { icon: Package, colorKey: "gathering_other" },
  alchemy_table: { icon: FlaskConical, colorKey: "crafting" },
  crafting_station: { icon: Hammer, colorKey: "crafting" },
  cooking_oven: { icon: ChefHat, colorKey: "crafting" },
  treasure: { icon: Shovel, colorKey: "treasure" },
  scribing_table: { icon: Scroll, colorKey: "scribing" },
};

export type EntityIconType = keyof typeof ENTITY_ICONS;

/**
 * Convert Lucide IconNode to SVG string.
 */
function iconNodeToSvg(iconNode: IconNode, color: string): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`;

  for (const [tag, attrs] of iconNode) {
    const attrStr = Object.entries(attrs || {})
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    svg += `<${tag} ${attrStr}/>`;
  }

  svg += "</svg>";
  return svg;
}

/**
 * Load an SVG string as an Image
 */
function loadSvgAsImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "data:image/svg+xml," + encodeURIComponent(svgString);
  });
}

export interface IconAtlasResult {
  atlas: HTMLCanvasElement;
  mapping: Record<
    string,
    { x: number; y: number; width: number; height: number; mask: boolean }
  >;
}

/**
 * Create icon atlas canvas and mapping for deck.gl IconLayer.
 * Each icon is a colored circle with a white icon overlay.
 */
export async function createIconAtlas(): Promise<IconAtlasResult> {
  const entityTypes = Object.keys(ENTITY_ICONS);
  const atlasWidth = ICON_SIZE * entityTypes.length;
  const atlasHeight = ICON_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas 2d context");
  }

  const mapping: IconAtlasResult["mapping"] = {};

  // Load all icon images first
  const iconImages = await Promise.all(
    entityTypes.map(async (entityType) => {
      const { icon } = ENTITY_ICONS[entityType];
      const svgString = iconNodeToSvg(icon, "#ffffff");
      return loadSvgAsImage(svgString);
    }),
  );

  // Draw each icon with colored circle background
  entityTypes.forEach((entityType, index) => {
    const { colorKey, flipX } = ENTITY_ICONS[entityType];
    const bgColor = rgbToHex(LAYER_COLORS[colorKey]);
    const img = iconImages[index];

    const x = index * ICON_SIZE;
    const y = 0;
    const centerX = x + ICON_SIZE / 2;
    const centerY = ICON_SIZE / 2;
    const radius = ICON_SIZE / 2 - CIRCLE_PADDING;

    // Draw colored circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Add dark outline for better definition
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw white icon centered (scaled to fit inside circle)
    // Add dark drop shadow for visibility on bright backgrounds
    const iconSize = ICON_SIZE * 0.55;
    const iconOffset = (ICON_SIZE - iconSize) / 2;

    ctx.filter = "drop-shadow(0 0 1px black) drop-shadow(0 0 1px black)";
    if (flipX) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.drawImage(img, x + iconOffset, y + iconOffset, iconSize, iconSize);
    }
    ctx.filter = "none";

    // Add to mapping
    mapping[entityType] = {
      x,
      y,
      width: ICON_SIZE,
      height: ICON_SIZE,
      mask: false,
    };
  });

  return { atlas: canvas, mapping };
}
