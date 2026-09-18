import { buildCasterStatSheet } from "../caster";
import { resolveLogicalBuild } from "../catalog-resolver";
import { scaleTargetDebuff, type EffectSpec } from "../effects";
import { prepareHit, type HitCaster, type HitTarget } from "../hit";
import {
  compareExact,
  compareSupportBand,
  type QuantityResult,
} from "./comparison";
import type { FixtureRecord, ObservationRecord } from "./corpus";
import {
  actionSkillIds,
  parseTargetReadback,
  parseWindowSample,
} from "./scenario";

/**
 * Compares every attributed hit of the fixture's one action with the engine's derivation: the
 * requested amount must equal the engine's intent exactly, and the health taken must lie inside the
 * band the engine's ordered integer steps allow for that hit's facing, from the smallest
 * non-critical roll to the largest critical one.
 */
export function compareTierB(
  fixture: FixtureRecord,
  catalog: unknown,
  observation: ObservationRecord,
): QuantityResult[] {
  const actions = fixture.execution.actions ?? [];
  if (actions.length !== 1)
    return [
      {
        quantity: "tierB",
        status: "fail",
        detail: "tier B requires one action",
      },
    ];
  const resolved = resolveLogicalBuild(fixture.buildData, catalog);
  const [skillId] = actionSkillIds(resolved, actions);
  const action = resolved.player.actions.find(
    (candidate) => candidate.id === skillId,
  )!;
  const sheet = buildCasterStatSheet(resolved.player.caster);
  if (action.effect?.recipient === "target" && !action.damage)
    return compareTargetEffect(
      fixture,
      observation,
      scaleTargetDebuff(action.effect, sheet.attributes),
    );
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "perHit",
  );
  if (!measurement || measurement.samples.length === 0)
    return [
      {
        quantity: "perHit",
        status: "fail",
        detail: "no per-hit window",
      },
    ];
  const windows = measurement.samples.map((sample, index) =>
    parseWindowSample(sample, `measurements.perHit.samples[${index}]`),
  );
  if (!action.damage)
    return [
      {
        quantity: "perHit",
        status: "fail",
        detail: `${skillId} has neither damage nor a target effect`,
      },
    ];
  const target = parseTargetReadback(observation.observation.target);
  const caster: HitCaster = {
    kind: "player",
    classId: resolved.player.classId,
    level: resolved.player.caster.level,
    damage: sheet.damage,
    magicDamage: sheet.magicDamage,
    accuracy: sheet.accuracy,
    criticalChance: sheet.criticalChance,
    dexterity: sheet.attributes.dexterity,
    energyCurrent: sheet.energy,
    manaCurrent: sheet.mana,
    weapons: resolved.player.weapons,
    ammunition: Object.fromEntries(
      resolved.ammunition.map((item) => [item.itemId, item.quantity]),
    ),
  };
  const hitTarget: HitTarget = {
    level: target.level,
    defense: target.stats.defense,
    magicResist: target.stats.magicResist,
    poisonResist: target.stats.poisonResist,
    fireResist: target.stats.fireResist,
    coldResist: target.stats.coldResist,
    diseaseResist: target.stats.diseaseResist,
    blockChance: target.stats.blockChance,
    criticalResist: target.stats.criticalResist,
    currentHealth: target.healthMax,
    maximumHealth: target.healthMax,
  };
  const hits = windows
    .flatMap((window) => window.hits)
    .filter((hit) => hit.skill === action.name);
  const results: QuantityResult[] = [];
  const minimum = fixture.execution.measurement.minimumSamples;
  if (hits.length < minimum) {
    return [
      {
        quantity: "perHit",
        status: "inconclusive",
        detail: `${hits.length} of ${minimum} required hits of ${action.name}`,
      },
    ];
  }

  const byFacing = new Map<boolean, typeof hits>();
  for (const hit of hits)
    byFacing.set(hit.sameFacing, [
      ...(byFacing.get(hit.sameFacing) ?? []),
      hit,
    ]);
  for (const [sameFacing, group] of byFacing) {
    const prepared = prepareHit(caster, hitTarget, action.damage, {
      sameFacing,
    });
    const label = sameFacing ? "behind" : "front";
    if (prepared.refused !== null) {
      results.push({
        quantity: `perHit.${label}`,
        status: "fail",
        detail: prepared.refused,
      });
      continue;
    }
    const intents = new Set(group.map((hit) => hit.intent));
    results.push(
      intents.size === 1
        ? compareExact(
            `perHit.${label}.intent`,
            prepared.intent.amount,
            [...intents][0],
          )
        : {
            quantity: `perHit.${label}.intent`,
            status: "fail",
            detail: `observed intents vary: ${[...intents].join(", ")}`,
          },
    );
    results.push(
      compareSupportBand(
        `perHit.${label}.amount`,
        group.map((hit) => hit.amount),
        [prepared.supportBand[0], prepared.critical(prepared.supportBand[1])],
        1,
      ),
    );
  }
  return results;
}

const TARGET_BONUSES: ReadonlyArray<[keyof EffectSpec["bonuses"], string]> = [
  ["defense", "defense"],
  ["magicResist", "magicResist"],
  ["poisonResist", "poisonResist"],
  ["fireResist", "fireResist"],
  ["coldResist", "coldResist"],
  ["diseaseResist", "diseaseResist"],
  ["blockChance", "blockChance"],
];

/** Compares one applied target effect and the settled target stats it changes. */
function compareTargetEffect(
  fixture: FixtureRecord,
  observation: ObservationRecord,
  effect: EffectSpec,
): QuantityResult[] {
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "targetState",
  );
  if (!measurement)
    return [
      {
        quantity: "targetState",
        status: "fail",
        detail: "no settled target-state reading",
      },
    ];
  const minimum = fixture.execution.measurement.minimumSamples;
  if (measurement.samples.length < minimum)
    return [
      {
        quantity: "targetState",
        status: "inconclusive",
        detail: `${measurement.samples.length} of ${minimum} required readings`,
      },
    ];
  const target = parseTargetReadback(observation.observation.target);
  const results: QuantityResult[] = [];
  measurement.samples.forEach((sample, index) => {
    const window = parseWindowSample(
      sample,
      `measurements.targetState.samples[${index}]`,
    );
    const settled = window.settledTarget;
    const applied = settled?.effects.find(
      (candidate) => candidate.skillId === effect.skillId,
    );
    results.push({
      quantity: `targetEffect.${effect.skillId}.window${index + 1}`,
      status: applied && !applied.expired ? "pass" : "fail",
      detail: applied
        ? applied.expired
          ? "effect is expired"
          : `active with ${applied.remaining.toFixed(3)} s remaining`
        : "effect is absent",
    });
    if (!settled || !applied) return;
    for (const [bonusKey, statKey] of TARGET_BONUSES) {
      const bonus = effect.bonuses[bonusKey];
      if (typeof bonus !== "number" || bonus === 0) continue;
      const initial = target.stats[statKey];
      const observed = settled.stats[statKey];
      if (initial === undefined || observed === undefined) {
        results.push({
          quantity: `targetState.${statKey}.window${index + 1}`,
          status: "fail",
          detail: "stat is absent",
        });
        continue;
      }
      results.push(
        compareExact(
          `targetState.${statKey}.window${index + 1}`,
          initial + bonus,
          observed,
        ),
      );
    }
  });
  return results;
}
