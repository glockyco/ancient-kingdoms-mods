export const SERIALIZED_SCHEMA_VERSION = 3 as const;
export const MODEL_VERSION = "1" as const;

export interface GameDataVersion {
  gameVersion: string;
  steamBuildId: string;
  assemblySha256: string;
}

export interface BuildEnvelope {
  serializedSchemaVersion: typeof SERIALIZED_SCHEMA_VERSION;
  modelVersion: string;
  gameData: GameDataVersion;
}

export interface BuildCompatibility {
  comparable: boolean;
  gameDataDecisionRequired: boolean;
  staleModel: boolean;
  reasons: string[];
}

const BUILD_FIELDS = {
  serializedSchemaVersion: true,
  modelVersion: true,
  gameData: true,
} as const satisfies Readonly<Record<keyof BuildEnvelope, true>>;
const GAME_DATA_FIELDS = {
  gameVersion: true,
  steamBuildId: true,
  assemblySha256: true,
} as const satisfies Readonly<Record<keyof GameDataVersion, true>>;

export function parseBuildEnvelope(value: unknown): BuildEnvelope {
  const build = requireRecord(value, "build", BUILD_FIELDS);
  const serializedSchemaVersion = requireInteger(
    build,
    "serializedSchemaVersion",
    "build.serializedSchemaVersion",
  );
  if (serializedSchemaVersion !== SERIALIZED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported serialized schema ${serializedSchemaVersion}; expected ${SERIALIZED_SCHEMA_VERSION}`,
    );
  }

  const gameData = requireRecord(
    build.gameData,
    "build.gameData",
    GAME_DATA_FIELDS,
  );
  return {
    serializedSchemaVersion,
    modelVersion: requireString(build, "modelVersion", "build.modelVersion"),
    gameData: {
      gameVersion: requireString(
        gameData,
        "gameVersion",
        "build.gameData.gameVersion",
      ),
      steamBuildId: requireString(
        gameData,
        "steamBuildId",
        "build.gameData.steamBuildId",
      ),
      assemblySha256: requireString(
        gameData,
        "assemblySha256",
        "build.gameData.assemblySha256",
      ),
    },
  };
}

export function assessBuildCompatibility(
  expected: BuildEnvelope,
  actual: BuildEnvelope,
): BuildCompatibility {
  const reasons: string[] = [];
  const staleModel = expected.modelVersion !== actual.modelVersion;
  if (staleModel) {
    reasons.push(
      `Model ${actual.modelVersion} differs from expected model ${expected.modelVersion}`,
    );
  }

  const gameDataDecisionRequired = !sameGameData(
    expected.gameData,
    actual.gameData,
  );
  if (gameDataDecisionRequired) {
    reasons.push(
      "Game-data versions differ and require an explicit compatibility decision",
    );
  }

  return {
    comparable: !staleModel && !gameDataDecisionRequired,
    gameDataDecisionRequired,
    staleModel,
    reasons,
  };
}

function sameGameData(a: GameDataVersion, b: GameDataVersion): boolean {
  return (
    a.gameVersion === b.gameVersion &&
    a.steamBuildId === b.steamBuildId &&
    a.assemblySha256 === b.assemblySha256
  );
}

function requireRecord(
  value: unknown,
  path: string,
  allowedFields: Readonly<Record<string, true>>,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!Object.prototype.hasOwnProperty.call(allowedFields, key)) {
      throw new TypeError(`${path}.${key} is not a supported field`);
    }
  }
  return record;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = record[key];
  if (!Number.isInteger(value)) {
    throw new TypeError(`${path} must be an integer`);
  }
  return value as number;
}
