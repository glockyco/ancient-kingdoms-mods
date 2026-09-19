import { compareWelch, type QuantityResult } from "./comparison";
import type { FixtureRecord, ObservationRecord } from "./corpus";
import { simulateFixtureWindow } from "./scenario";
import { parseTierDWindowSample } from "./tier-d-sample";

/** Significance for every stochastic mean, as the design's protocol states. */
export const WELCH_SIGNIFICANCE = 0.01;

/**
 * Compares each entity's damage per window with the engine's replicate totals by a Welch test.
 * The window is the sampling unit: hits inside one window depend on each other through cooldowns
 * and resources, so they are never pooled. The player's total is the sum of the hits the game
 * attributed to it inside the window; a companion's total is what the game's own damage meter
 * moved by. Fewer windows than the fixture's declared minimum report inconclusive.
 */
export function compareTierD(
  fixture: FixtureRecord,
  catalog: unknown,
  observation: ObservationRecord,
): QuantityResult[] {
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "window",
  );
  if (!measurement || measurement.samples.length === 0)
    return [{ quantity: "window", status: "fail", detail: "no windows" }];
  const windows = measurement.samples.map((sample, index) =>
    parseTierDWindowSample(
      sample,
      `measurements.window.samples[${index}]`,
      fixture.coverage.startsWith("D.class."),
    ),
  );
  const horizons = new Set(
    windows.map((entry) => Math.round(entry.durationSeconds)),
  );
  if (horizons.size !== 1)
    return [
      {
        quantity: "window",
        status: "fail",
        detail: `windows differ in length: ${[...horizons].join(", ")} s`,
      },
    ];
  const horizon = fixture.execution.durationSeconds;
  if (horizon === null)
    return [
      {
        quantity: "window",
        status: "fail",
        detail: "a tier D fixture must declare durationSeconds",
      },
    ];
  // One engine run per fixture: the windows repeat the same initial state, so the replicate set is
  // the model for every window.
  const { result, resolved } = simulateFixtureWindow(
    fixture,
    observation,
    catalog,
    horizon,
    0,
  );
  const options = {
    minimumSamples: fixture.execution.measurement.minimumSamples,
    significance: WELCH_SIGNIFICANCE,
  };
  const results: QuantityResult[] = [];
  const playerId = resolved.player.entityId;
  results.push(
    compareWelch(
      `damage.${playerId}`,
      windows.map((entry) => entry.playerDamage),
      result.samples.perEntityDamage.get(playerId) ?? [],
      options,
    ),
  );
  for (const companion of resolved.companions) {
    const observed = windows.map((entry) => {
      const match = entry.companionDamage.find(
        (candidate) => candidate.entityId === companion.entityId,
      );
      if (!match)
        throw new Error(
          `window holds no damage reading for companion '${companion.entityId}'`,
        );
      return match.damage;
    });
    results.push(
      compareWelch(
        `damage.${companion.entityId}`,
        observed,
        result.samples.perEntityDamage.get(companion.entityId) ?? [],
        options,
      ),
    );
  }
  return results;
}
