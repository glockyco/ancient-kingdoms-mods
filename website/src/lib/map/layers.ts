import type {
  MapEntityData,
  LayerVisibility,
  AnyMapEntity,
} from "$lib/types/map";
import {
  LAYER_COLORS,
  LAYER_RADII,
  BACKGROUND_COLOR,
  WORLD_BOUNDS,
} from "./config";

// Type for deck.gl layer constructor (we use any since deck.gl types are complex)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayerConstructor = new (props: any) => any;

interface DeckModules {
  ScatterplotLayer: LayerConstructor;
  PolygonLayer: LayerConstructor;
}

/**
 * Create all deck.gl layers from entity data
 */
export function createLayers(
  data: MapEntityData,
  visibility: LayerVisibility,
  modules: DeckModules,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { onHover: (info: any) => void; onClick: (info: any) => void },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const { ScatterplotLayer, PolygonLayer } = modules;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layers: any[] = [];

  // Background layer (solid color until tiles are available)
  layers.push(
    new PolygonLayer({
      id: "background",
      data: [
        {
          polygon: [
            [WORLD_BOUNDS.minX, WORLD_BOUNDS.minY],
            [WORLD_BOUNDS.maxX, WORLD_BOUNDS.minY],
            [WORLD_BOUNDS.maxX, WORLD_BOUNDS.maxY],
            [WORLD_BOUNDS.minX, WORLD_BOUNDS.maxY],
          ],
        },
      ],
      getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: BACKGROUND_COLOR,
      pickable: false,
    }),
  );

  // Gathering plants
  if (visibility.gatheringPlants) {
    const plants = data.gathering.filter((g) => g.type === "gathering_plant");
    layers.push(
      new ScatterplotLayer({
        id: "gathering-plants",
        data: plants,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.gathering_plant,
        getRadius: LAYER_RADII.gathering,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Gathering minerals
  if (visibility.gatheringMinerals) {
    const minerals = data.gathering.filter(
      (g) => g.type === "gathering_mineral",
    );
    layers.push(
      new ScatterplotLayer({
        id: "gathering-minerals",
        data: minerals,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.gathering_mineral,
        getRadius: LAYER_RADII.gathering,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Gathering sparks
  if (visibility.gatheringSparks) {
    const sparks = data.gathering.filter((g) => g.type === "gathering_spark");
    layers.push(
      new ScatterplotLayer({
        id: "gathering-sparks",
        data: sparks,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.gathering_spark,
        getRadius: LAYER_RADII.gathering,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Crafting stations
  if (visibility.crafting) {
    layers.push(
      new ScatterplotLayer({
        id: "crafting-stations",
        data: data.crafting,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.crafting,
        getRadius: LAYER_RADII.crafting,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Chests
  if (visibility.chests) {
    layers.push(
      new ScatterplotLayer({
        id: "chests",
        data: data.chests,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.chest,
        getRadius: LAYER_RADII.chest,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Altars
  if (visibility.altars) {
    layers.push(
      new ScatterplotLayer({
        id: "altars",
        data: data.altars,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.altar,
        getRadius: LAYER_RADII.altar,
        radiusUnits: "pixels",
        radiusMinPixels: 4,
        radiusMaxPixels: 14,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Portals
  if (visibility.portals) {
    layers.push(
      new ScatterplotLayer({
        id: "portals",
        data: data.portals,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.portal,
        getRadius: LAYER_RADII.portal,
        radiusUnits: "pixels",
        radiusMinPixels: 4,
        radiusMaxPixels: 12,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Regular monsters
  if (visibility.monsters) {
    const regularMonsters = data.monsters.filter(
      (m) => !m.isBoss && !m.isElite,
    );
    layers.push(
      new ScatterplotLayer({
        id: "monsters",
        data: regularMonsters,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.monster,
        getRadius: LAYER_RADII.monster,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Elite monsters
  if (visibility.elites) {
    const elites = data.monsters.filter((m) => m.isElite && !m.isBoss);
    layers.push(
      new ScatterplotLayer({
        id: "elites",
        data: elites,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.elite,
        getRadius: LAYER_RADII.elite,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 12,
        pickable: true,
        stroked: true,
        lineWidthPixels: 1,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // Boss monsters
  if (visibility.bosses) {
    const bosses = data.monsters.filter((m) => m.isBoss);
    layers.push(
      new ScatterplotLayer({
        id: "bosses",
        data: bosses,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.boss,
        getRadius: LAYER_RADII.boss,
        radiusUnits: "pixels",
        radiusMinPixels: 5,
        radiusMaxPixels: 16,
        pickable: true,
        stroked: true,
        lineWidthPixels: 2,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  // NPCs (on top for visibility)
  if (visibility.npcs) {
    layers.push(
      new ScatterplotLayer({
        id: "npcs",
        data: data.npcs,
        getPosition: (d: AnyMapEntity) => d.position,
        getFillColor: LAYER_COLORS.npc,
        getRadius: LAYER_RADII.npc,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: callbacks.onHover,
        onClick: callbacks.onClick,
      }),
    );
  }

  return layers;
}
