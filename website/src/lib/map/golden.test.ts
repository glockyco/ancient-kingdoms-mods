import { describe, expect, test } from "vitest";
import { createLayers } from "./layers";
import {
  EMPTY_PATROL_DATA,
  EMPTY_RELATION_ARCS,
  EMPTY_SELECTION,
} from "./selection";
import { getDefaultLayerVisibility } from "./url-state";
import type { ZoneFocusedData } from "./zone-filter";

// This array is a golden baseline: layer order is deck.gl paint order, so a diff
// here is a real rendering change and must be reviewed, not blindly re-recorded.
class StubLayer {
  readonly id: string;

  constructor(props: { id: string }) {
    this.id = props.id;
  }
}

class StubDataFilterExtension {}

const emptyFilteredData = {
  creatures: [],
  elites: [],
  fabled: [],
  bosses: [],
  hunts: [],
  plants: [],
  minerals: [],
  sparks: [],
  fishingSpots: [],
  otherGathering: [],
  alchemyTables: [],
  forges: [],
  cookingOvens: [],
  scribingTables: [],
  houses: [],
  portalsWithDestinations: [],
  teleportersWithDestinations: [],
  parentZones: [],
  npcs: [],
  portals: [],
  chests: [],
  treasure: [],
  altars: [],
  traps: [],
  trapsWithDestinations: [],
  subZones: [],
} satisfies ZoneFocusedData;

const deckModules = {
  ScatterplotLayer: StubLayer,
  IconLayer: StubLayer,
  PolygonLayer: StubLayer,
  LineLayer: StubLayer,
  TileLayer: StubLayer,
  BitmapLayer: StubLayer,
  DataFilterExtension: StubDataFilterExtension,
};

const emptyCallbacks = {
  onHover: () => {},
  onClick: () => {},
};

const emptyLevelFilter = {
  monsterMin: 0,
  monsterMax: 0,
  gatheringMin: 0,
  gatheringMax: 0,
};

describe("map golden invariants", () => {
  test("createLayers preserves deck.gl paint order", () => {
    const layers = createLayers({
      filtered: emptyFilteredData,
      visibility: getDefaultLayerVisibility(),
      modules: deckModules,
      callbacks: emptyCallbacks,
      levelFilter: emptyLevelFilter,
      selectedPortalId: null,
      focusedZoneId: null,
      selectionData: EMPTY_SELECTION,
      patrolPathData: EMPTY_PATROL_DATA,
      relatedEntities: EMPTY_SELECTION,
      relationArcData: EMPTY_RELATION_ARCS,
      selectedEntity: null,
      selectedZone: null,
      hoverSelectionData: EMPTY_SELECTION,
      hoverZone: null,
    });

    expect(layers.map((layer) => layer.id)).toEqual([
      "background",
      "map-tiles",
      "parent-zones",
      "sub-zones",
      "zone-highlight",
      "wander-range",
      "altar-event-radius",
      "trap-area-halo",
      "trap-area",
      "relation-arcs",
      "relation-arc-endpoints",
      "portal-arcs",
      "trap-teleport-arcs",
      "teleporter-arcs",
      "creatures",
      "gathering-plants",
      "gathering-minerals",
      "gathering-fishing",
      "gathering-sparks",
      "gathering-other",
      "alchemy-tables",
      "forges",
      "cooking-ovens",
      "scribing-tables",
      "hunts",
      "chests",
      "houses",
      "treasure",
      "portals",
      "portal-destinations",
      "trap-teleport-destinations",
      "teleporter-destinations",
      "npcs",
      "altars",
      "traps",
      "elites",
      "fabled",
      "bosses",
      "related-highlight-outline",
      "related-highlight",
      "selection-highlight-outline",
      "selection-highlight",
      "primary-selection-highlight-outline",
      "primary-selection-highlight",
      "hover-highlight-outline",
      "hover-highlight",
      "zone-hover-highlight",
    ]);
  });

  test("default layer visibility keeps the shared URL key grammar", () => {
    expect(Object.keys(getDefaultLayerVisibility()).sort()).toEqual([
      "alchemyTables",
      "altars",
      "bosses",
      "chests",
      "cookingOvens",
      "creatures",
      "elites",
      "fabled",
      "forges",
      "gatheringFishing",
      "gatheringMinerals",
      "gatheringOther",
      "gatheringPlants",
      "gatheringSparks",
      "houses",
      "hunts",
      "npcAdventurerTasks",
      "npcAdventurerVendors",
      "npcAttributeReset",
      "npcAugmenters",
      "npcBanks",
      "npcBarbers",
      "npcEssenceTraders",
      "npcFactionVendors",
      "npcGuards",
      "npcGuildManagers",
      "npcInnkeepers",
      "npcMercenaryRecruiters",
      "npcPriestesses",
      "npcQuestGivers",
      "npcRenewalSages",
      "npcRepair",
      "npcSkillTrainers",
      "npcSoulBinders",
      "npcTeleporters",
      "npcVendors",
      "npcVeteranTrainers",
      "npcVillagers",
      "parentZones",
      "portalArcs",
      "portals",
      "scribingTables",
      "subZones",
      "tiles",
      "traps",
      "treasure",
    ]);

    // These keys appear verbatim in shared map URLs, so any change breaks
    // existing links and must be a deliberate edit to this file.
    expect(
      Object.entries(getDefaultLayerVisibility())
        .filter(([, visible]) => visible)
        .map(([key]) => key)
        .sort(),
    ).toEqual([
      "altars",
      "bosses",
      "elites",
      "fabled",
      "npcRenewalSages",
      "tiles",
      "traps",
    ]);
  });
});
