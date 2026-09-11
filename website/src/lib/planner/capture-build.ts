import { parseLogicalBuildData, type LogicalBuildData } from "./logical-build";

export const CAPTURE_BUILD_SCHEMA_VERSION = 1 as const;
export type CaptureState = "complete" | "missing" | "excluded";

export interface CaptureBuildRecord {
  captureSchemaVersion: typeof CAPTURE_BUILD_SCHEMA_VERSION;
  producer: {
    id: string;
    version: string;
    capturedAtUtc: string;
  };
  gameData: {
    gameVersion: string;
    steamBuildId: string;
    assemblySha256: string;
  };
  modelCompatibility: string;
  buildData: unknown;
  completeness: Record<string, CaptureState>;
  containers: Array<{
    containerId: string;
    state: CaptureState;
    entryCount: number;
    totalQuantity: number;
  }>;
  ownedItems: Array<{
    instanceId: string;
    itemId: string;
    itemName: string | null;
    quantity: number;
    containerId: string;
    slot: number | null;
    augmentId: string | null;
    durability: number | null;
  }>;
}

const CAPTURE_FIELDS = allowed([
  "captureSchemaVersion",
  "producer",
  "gameData",
  "modelCompatibility",
  "buildData",
  "completeness",
  "containers",
  "ownedItems",
]);
const PRODUCER_FIELDS = allowed(["id", "version", "capturedAtUtc"]);
const GAME_DATA_FIELDS = allowed([
  "gameVersion",
  "steamBuildId",
  "assemblySha256",
]);
const CONTAINER_FIELDS = allowed([
  "containerId",
  "state",
  "entryCount",
  "totalQuantity",
]);
const OWNED_ITEM_FIELDS = allowed([
  "instanceId",
  "itemId",
  "itemName",
  "quantity",
  "containerId",
  "slot",
  "augmentId",
  "durability",
]);
const REQUIRED_BUILD_SECTIONS = [
  "player",
  "player.attributes",
  "player.skills",
  "player.equipment",
  "companions",
  "consumables",
  "ammunition",
  "learnedBookIds",
] as const;

export function parseCaptureBuildRecord(value: unknown): CaptureBuildRecord {
  const capture = record(value, "capture", CAPTURE_FIELDS);
  const captureSchemaVersion = integer(
    capture,
    "captureSchemaVersion",
    "capture.captureSchemaVersion",
  );
  if (captureSchemaVersion !== CAPTURE_BUILD_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported capture schema ${captureSchemaVersion}; expected ${CAPTURE_BUILD_SCHEMA_VERSION}`,
    );
  }

  const producer = record(
    capture.producer,
    "capture.producer",
    PRODUCER_FIELDS,
  );
  const capturedAtUtc = stringValue(
    producer,
    "capturedAtUtc",
    "capture.producer.capturedAtUtc",
  );
  if (!Number.isFinite(Date.parse(capturedAtUtc))) {
    throw new TypeError(
      "capture.producer.capturedAtUtc must be an ISO-8601 timestamp",
    );
  }

  const gameData = record(
    capture.gameData,
    "capture.gameData",
    GAME_DATA_FIELDS,
  );
  const completenessRecord = record(
    capture.completeness,
    "capture.completeness",
  );
  const completeness: Record<string, CaptureState> = {};
  for (const [section, value] of Object.entries(completenessRecord)) {
    if (section.trim().length === 0) {
      throw new TypeError(
        "capture.completeness contains an empty section name",
      );
    }
    completeness[section] = captureState(
      value,
      `capture.completeness.${section}`,
    );
  }

  const containers = array(capture, "containers", "capture.containers").map(
    (value, index) => {
      const path = `capture.containers[${index}]`;
      const container = record(value, path, CONTAINER_FIELDS);
      return {
        containerId: stringValue(
          container,
          "containerId",
          `${path}.containerId`,
        ),
        state: captureState(
          field(container, "state", `${path}.state`),
          `${path}.state`,
        ),
        entryCount: nonNegativeInteger(
          container,
          "entryCount",
          `${path}.entryCount`,
        ),
        totalQuantity: nonNegativeInteger(
          container,
          "totalQuantity",
          `${path}.totalQuantity`,
        ),
      };
    },
  );
  unique(
    containers.map((container) => container.containerId),
    "capture.containers.containerId",
  );

  const ownedItems = array(capture, "ownedItems", "capture.ownedItems").map(
    (value, index) => {
      const path = `capture.ownedItems[${index}]`;
      const item = record(value, path, OWNED_ITEM_FIELDS);
      return {
        instanceId: stringValue(item, "instanceId", `${path}.instanceId`),
        itemId: stringValue(item, "itemId", `${path}.itemId`),
        itemName: nullableString(item, "itemName", `${path}.itemName`),
        quantity: positiveInteger(item, "quantity", `${path}.quantity`),
        containerId: stringValue(item, "containerId", `${path}.containerId`),
        slot: nullableNonNegativeInteger(item, "slot", `${path}.slot`),
        augmentId: nullableString(item, "augmentId", `${path}.augmentId`),
        durability: nullableNonNegativeInteger(
          item,
          "durability",
          `${path}.durability`,
        ),
      };
    },
  );
  unique(
    ownedItems.map((item) => item.instanceId),
    "capture.ownedItems.instanceId",
  );
  validateContainerIntegrity(containers, ownedItems);

  return {
    captureSchemaVersion,
    producer: {
      id: stringValue(producer, "id", "capture.producer.id"),
      version: stringValue(producer, "version", "capture.producer.version"),
      capturedAtUtc,
    },
    gameData: {
      gameVersion: stringValue(
        gameData,
        "gameVersion",
        "capture.gameData.gameVersion",
      ),
      steamBuildId: stringValue(
        gameData,
        "steamBuildId",
        "capture.gameData.steamBuildId",
      ),
      assemblySha256: stringValue(
        gameData,
        "assemblySha256",
        "capture.gameData.assemblySha256",
      ),
    },
    modelCompatibility: stringValue(
      capture,
      "modelCompatibility",
      "capture.modelCompatibility",
    ),
    buildData: record(
      field(capture, "buildData", "capture.buildData"),
      "capture.buildData",
    ),
    completeness,
    containers,
    ownedItems,
  };
}

export function adaptCompleteCapture(
  capture: CaptureBuildRecord,
): LogicalBuildData {
  for (const section of REQUIRED_BUILD_SECTIONS) {
    const state = capture.completeness[section];
    if (state === undefined) {
      throw new TypeError(`capture.completeness.${section} is required`);
    }
    if (state !== "complete") {
      throw new Error(
        `capture.completeness.${section} is ${state}; complete is required`,
      );
    }
  }
  return parseLogicalBuildData(capture.buildData);
}

function validateContainerIntegrity(
  containers: CaptureBuildRecord["containers"],
  items: CaptureBuildRecord["ownedItems"],
): void {
  const containerIds = new Set(
    containers.map((container) => container.containerId),
  );
  for (const item of items) {
    if (!containerIds.has(item.containerId)) {
      throw new Error(
        `capture.ownedItems container ${item.containerId} is not declared`,
      );
    }
  }

  for (const container of containers) {
    const captured = items.filter(
      (item) => item.containerId === container.containerId,
    );
    const quantity = captured.reduce((total, item) => total + item.quantity, 0);
    if (captured.length !== container.entryCount) {
      throw new Error(
        `capture.containers.${container.containerId}.entryCount does not match ownedItems`,
      );
    }
    if (quantity !== container.totalQuantity) {
      throw new Error(
        `capture.containers.${container.containerId}.totalQuantity does not match ownedItems`,
      );
    }
    if (container.state !== "complete" && captured.length !== 0) {
      throw new Error(
        `capture.containers.${container.containerId} is ${container.state} but contains ownedItems`,
      );
    }
  }
}

function allowed(keys: readonly string[]): Readonly<Record<string, true>> {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function record(
  value: unknown,
  path: string,
  allowedFields?: Readonly<Record<string, true>>,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const result = value as Record<string, unknown>;
  if (allowedFields !== undefined) {
    for (const key of Object.keys(result)) {
      if (!Object.prototype.hasOwnProperty.call(allowedFields, key)) {
        throw new TypeError(`${path}.${key} is not a supported field`);
      }
    }
  }
  return result;
}

function field(
  source: Record<string, unknown>,
  key: string,
  path: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    throw new TypeError(`${path} is required`);
  }
  return source[key];
}

function array(
  source: Record<string, unknown>,
  key: string,
  path: string,
): unknown[] {
  const value = field(source, key, path);
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value;
}

function stringValue(
  source: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = field(source, key, path);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function nullableString(
  source: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = field(source, key, path);
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be null or a non-empty string`);
  }
  return value;
}

function integer(
  source: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = field(source, key, path);
  if (!Number.isInteger(value))
    throw new TypeError(`${path} must be an integer`);
  return value as number;
}

function positiveInteger(
  source: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = integer(source, key, path);
  if (value < 1) throw new RangeError(`${path} must be at least 1`);
  return value;
}

function nonNegativeInteger(
  source: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = integer(source, key, path);
  if (value < 0) throw new RangeError(`${path} must not be negative`);
  return value;
}

function nullableNonNegativeInteger(
  source: Record<string, unknown>,
  key: string,
  path: string,
): number | null {
  const value = field(source, key, path);
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new RangeError(`${path} must be null or a non-negative integer`);
  }
  return value as number;
}

function captureState(value: unknown, path: string): CaptureState {
  if (value !== "complete" && value !== "missing" && value !== "excluded") {
    throw new TypeError(`${path} must be complete, missing, or excluded`);
  }
  return value;
}

function unique(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value))
      throw new RangeError(`${path}[${index}] duplicates ${value}`);
    seen.add(value);
  }
}
