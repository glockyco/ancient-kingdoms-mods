import { compareSupportBand, type QuantityResult } from "./comparison";
import type { FixtureRecord, ObservationRecord } from "./corpus";
import { parseWindowSample, simulateFixtureWindow } from "./scenario";

/** Frames of slack on each side of the model interval; completions land on frame boundaries. */
const FRAME_SLACK = 3;

/**
 * Compares every observed basic-attack interval with the interval the engine derives from the
 * weapon delay and haste. The engine's interval is exact; the game's completes on frame
 * boundaries, so each endpoint may slip a frame and frames jitter; three frames of slack on each side covers both.
 */
export function compareTierC(
  fixture: FixtureRecord,
  catalog: unknown,
  observation: ObservationRecord,
): QuantityResult[] {
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "actionInterval",
  );
  if (
    !measurement ||
    measurement.windowSeconds === null ||
    measurement.samples.length === 0
  ) {
    return [
      {
        quantity: "actionInterval",
        status: "fail",
        detail: "no interval window was observed",
      },
    ];
  }
  const windows = measurement.samples.map((sample, index) =>
    parseWindowSample(sample, `measurements.actionInterval.samples[${index}]`),
  );
  const { result, resolved } = simulateFixtureWindow(
    fixture,
    observation,
    catalog,
    measurement.windowSeconds,
    0,
  );
  const defaultAttack = resolved.player.actions.find(
    (action) => action.defaultAttack,
  );
  if (!defaultAttack)
    return [
      {
        quantity: "actionInterval",
        status: "fail",
        detail: "the build has no default attack",
      },
    ];
  const completions = result.trace
    .filter(
      (event) =>
        event.kind === "cast_complete" && event.actionId === defaultAttack.id,
    )
    .map((event) => event.at);
  const modelIntervals = completions
    .slice(1)
    .map((at, index) => at - completions[index]);
  if (modelIntervals.length === 0)
    return [
      {
        quantity: "actionInterval",
        status: "fail",
        detail: "the engine completed no repeated attack",
      },
    ];
  const model = modelIntervals.toSorted((left, right) => left - right)[
    Math.floor(modelIntervals.length / 2)
  ];
  const frame = Math.max(
    ...windows.map((window) => window.averageFrameSeconds),
  );
  const observed = windows.flatMap((window) => window.intervals);
  const band: [number, number] = [
    model - FRAME_SLACK * frame,
    model + FRAME_SLACK * frame,
  ];
  const results = [
    compareSupportBand(
      "actionInterval",
      observed.map((value) => Number(value.toFixed(4))),
      [Number(band[0].toFixed(4)), Number(band[1].toFixed(4))],
      fixture.execution.measurement.minimumSamples,
    ),
  ];
  const completed = windows.reduce(
    (total, window) => total + window.counts.completed,
    0,
  );
  const modelCompleted = result.entities[0].abilities
    .filter((ability) => ability.actionId === defaultAttack.id)
    .reduce((total, ability) => total + ability.cast.mean, 0);
  results.push({
    quantity: "actionInterval.completed",
    status: Math.abs(completed - modelCompleted) <= 1 ? "pass" : "fail",
    detail: `observed ${completed} completions, model ${modelCompleted.toFixed(2)} per window`,
  });
  return results;
}
