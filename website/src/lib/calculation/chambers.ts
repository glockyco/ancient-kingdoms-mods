// The Chambers of Chaos rule calculations. Every table comes from the export, which
// called the game's own methods. Nothing here interpolates a rounded value or
// answers an input the tables do not cover: such an input throws.

export interface ChambersOffset {
  readonly offset: number;
  readonly weight: number;
  readonly ordinary: boolean;
  readonly guardian: boolean;
}

export interface ChambersRewardBand {
  readonly minimumLevel: number;
  readonly maximumLevel: number | null;
  readonly minimumVeteranPoints: number;
  readonly maximumVeteranPoints: number | null;
  readonly minimumQuantity: number;
  readonly maximumQuantity: number;
}

export interface ChambersScalingValue {
  readonly health: number;
  readonly power: number;
}

export interface ChambersRules {
  readonly minimumLevel: number;
  readonly roomCount: number;
  readonly runDurationSeconds: number;
  readonly playerLevels: ReadonlySet<number>;
  readonly veteranPoints: ReadonlySet<number>;
  readonly enemyLevels: ReadonlySet<number>;
  readonly roomIndices: ReadonlySet<number>;
  /** Live monster level to the Seal of Chaos corpse-roll chance. */
  readonly entryItemChances: ReadonlyMap<number, number>;
  /** Level at the guardian's death to completion experience. */
  readonly completionExperience: ReadonlyMap<number, number>;
  /** Total veteran points to the highest enemy level above the player's. */
  readonly maximumLevelBonus: ReadonlyMap<number, number>;
  readonly offsets: readonly ChambersOffset[];
  readonly rewardBands: readonly ChambersRewardBand[];
  /** Keyed by `scalingKey`. Holds the rows that were loaded, which may be a subset. */
  readonly scaling: ReadonlyMap<string, ChambersScalingValue>;
}

export function scalingKey(
  enemyLevel: number,
  veteranPoints: number,
  roomIndex: number,
  guardian: boolean,
): string {
  return `${enemyLevel}:${veteranPoints}:${roomIndex}:${guardian ? 1 : 0}`;
}

function require(set: ReadonlySet<number>, name: string, value: number): void {
  if (!Number.isInteger(value) || !set.has(value))
    throw new RangeError(
      `${name} ${value} is outside the exported Chambers rules`,
    );
}

export interface EnemyLevelChance {
  readonly level: number;
  readonly offset: number;
  readonly weight: number;
  readonly probability: number;
}

/**
 * The weighted enemy levels for one entry. A guardian starts at the player's level.
 * An ordinary enemy starts at most 3 below it.
 */
export function enemyLevelDistribution(
  rules: ChambersRules,
  playerLevel: number,
  veteranPoints: number,
  guardian: boolean,
): EnemyLevelChance[] {
  require(rules.playerLevels, "player level", playerLevel);
  require(rules.veteranPoints, "veteran points", veteranPoints);
  const bonus = rules.maximumLevelBonus.get(veteranPoints);
  if (bonus === undefined)
    throw new RangeError(`veteran points ${veteranPoints} have no level bonus`);
  // Source: server-scripts/MadMageTowerRules.cs:EnemyLevel — the draw runs over the offsets from the lowest allowed one (0 for a guardian, otherwise the larger of -3 and 1 minus the player's level) up to the maximum bonus.
  const lowest = guardian ? 0 : Math.max(-3, 1 - playerLevel);
  const members = rules.offsets
    .filter(
      (row) =>
        (guardian ? row.guardian : row.ordinary) &&
        row.offset >= lowest &&
        row.offset <= bonus,
    )
    .sort((a, b) => a.offset - b.offset);
  for (let offset = lowest; offset <= bonus; offset++)
    if (!members.some((row) => row.offset === offset))
      throw new RangeError(`no exported weight for level offset ${offset}`);
  const total = members.reduce((sum, row) => sum + row.weight, 0);
  return members.map((row) => {
    const level = playerLevel + row.offset;
    require(rules.enemyLevels, "enemy level", level);
    return {
      level,
      offset: row.offset,
      weight: row.weight,
      probability: row.weight / total,
    };
  });
}

/** The game's rounded Health and Power. An input outside the loaded rows throws. */
export function enemyScaling(
  rules: ChambersRules,
  enemyLevel: number,
  veteranPoints: number,
  roomIndex: number,
  guardian: boolean,
): ChambersScalingValue {
  require(rules.enemyLevels, "enemy level", enemyLevel);
  require(rules.veteranPoints, "veteran points", veteranPoints);
  require(rules.roomIndices, "room index", roomIndex);
  const value = rules.scaling.get(
    scalingKey(enemyLevel, veteranPoints, roomIndex, guardian),
  );
  if (!value)
    throw new RangeError(
      `scaling for enemy level ${enemyLevel} at ${veteranPoints} veteran points was not loaded`,
    );
  return value;
}

/** Experience for finishing a run, by the player's level when the guardian dies. */
export function completionExperience(
  rules: ChambersRules,
  level: number,
): number {
  const value = rules.completionExperience.get(level);
  if (value === undefined)
    throw new RangeError(
      `level ${level} is outside the exported Chambers rules`,
    );
  return value;
}

/** The chance that an eligible elite of this live level drops the entry item. */
export function entryItemChance(rules: ChambersRules, level: number): number {
  const value = rules.entryItemChances.get(level);
  if (value === undefined)
    throw new RangeError(
      `monster level ${level} is outside the exported Chambers rules`,
    );
  return value;
}

function covers(
  band: ChambersRewardBand,
  level: number,
  veteran: number | null,
) {
  return (
    band.minimumLevel <= level &&
    (band.maximumLevel === null || level <= band.maximumLevel) &&
    (veteran === null ||
      (band.minimumVeteranPoints <= veteran &&
        (band.maximumVeteranPoints === null ||
          veteran <= band.maximumVeteranPoints)))
  );
}

/**
 * The guardian reward quantity bands for an entry. With unknown veteran points
 * every band the level allows comes back, never a default of zero points. Below the
 * minimum level no band applies.
 */
export function rewardBands(
  rules: ChambersRules,
  level: number,
  veteranPoints: number | null,
): ChambersRewardBand[] {
  require(rules.playerLevels, "entry level", level);
  if (veteranPoints !== null)
    require(rules.veteranPoints, "veteran points", veteranPoints);
  const bands = rules.rewardBands.filter((band) =>
    covers(band, level, veteranPoints),
  );
  if (veteranPoints !== null && bands.length !== 1)
    throw new RangeError(
      `${bands.length} reward bands cover level ${level} with ${veteranPoints} veteran points`,
    );
  return bands;
}
