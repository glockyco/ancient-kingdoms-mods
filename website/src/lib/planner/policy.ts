import type {
  ActionDecision,
  ActionPolicy,
  EngineAction,
  EntityView,
} from "./engine";
import { multiplyF32 } from "./engine-math";

function requireAction(view: EntityView, id: string): EngineAction {
  const action = view.actions.find((candidate) => candidate.id === id);
  if (!action) throw new Error(`${view.id} has no action ${id}`);
  return action;
}

function defaultAttack(view: EntityView): EngineAction | null {
  const defaults = view.actions.filter((action) => action.defaultAttack);
  if (defaults.length > 1)
    throw new Error(`${view.id} declares more than one default attack`);
  return defaults[0] ?? null;
}

/**
 * Casts a declared sequence in order. A step waits for its cooldown, records a refusal and advances
 * when the engine would refuse it, and repeats from the start when `repeat` is set.
 */
export function schedulePolicy(schedule: {
  steps: readonly string[];
  repeat: boolean;
}): ActionPolicy {
  if (schedule.steps.length === 0)
    throw new RangeError("schedule must contain at least one step");
  let index = 0;
  return {
    decide(view, now) {
      if (index >= schedule.steps.length) {
        if (!schedule.repeat) return { kind: "wait", until: null };
        index = 0;
      }
      const action = requireAction(view, schedule.steps[index]);
      const gate = view.gate(action);
      if (gate.refusal !== null) {
        index += 1;
        return { kind: "refuse", action, reason: gate.refusal };
      }
      if (gate.readyAt > now) return { kind: "wait", until: gate.readyAt };
      // The engine re-decides on every recovery tick, so an unaffordable step waits for the next tick.
      if (!gate.affordable) return { kind: "wait", until: null };
      index += 1;
      return { kind: "cast", action };
    },
  };
}

/**
 * Casts the first listed skill that is ready, legal, and affordable; otherwise the default attack when
 * its delay has elapsed; otherwise waits for the earliest of those.
 */
export function priorityPolicy(order: readonly string[]): ActionPolicy {
  return {
    decide(view, now) {
      let earliest: number | null = null;
      for (const id of order) {
        const action = requireAction(view, id);
        if (action.defaultAttack) continue;
        const gate = view.gate(action);
        if (gate.refusal !== null) continue;
        if (gate.readyAt > now) {
          earliest =
            earliest === null ? gate.readyAt : Math.min(earliest, gate.readyAt);
          continue;
        }
        if (!gate.affordable) continue;
        return { kind: "cast", action };
      }
      const attack = defaultAttack(view);
      if (attack) {
        const gate = view.gate(attack);
        if (gate.refusal === null && gate.affordable) {
          if (gate.readyAt <= now) return { kind: "cast", action: attack };
          earliest =
            earliest === null ? gate.readyAt : Math.min(earliest, gate.readyAt);
        }
      }
      return { kind: "wait", until: earliest };
    },
  };
}

/**
 * Samples the companion's own attack selection. A Warrior prioritizes Battle Shout and Challenge.
 * The shared special-action timer redraws from 2 to 4 seconds and picks uniformly among ready
 * offensive skills that a healer's reserve allows and the target does not already hold. Otherwise
 * the companion uses its default attack when ready.
 * Source: server-scripts/Pet.cs:1326-1366; server-scripts/PetSkills.cs:60-119,143-178.
 */
export function companionPolicy(): ActionPolicy {
  return {
    decide(view, now, random): ActionDecision {
      const [defaultAction, ...specials] = view.actions;
      if (!defaultAction) return { kind: "wait", until: null };
      if (!defaultAction.defaultAttack)
        throw new Error(`${view.id} must list its default attack first`);
      if (view.classId === "warrior") {
        const areaTaunt = specials.find(
          (action) => action.name === "Battle Shout",
        );
        if (areaTaunt) {
          const gate = view.gate(areaTaunt);
          if (gate.refusal === null && gate.readyAt <= now && gate.affordable)
            return { kind: "cast", action: areaTaunt };
        }
      }
      if (view.classId === "warrior") {
        const challenge = specials.find(
          (action) => action.name === "Challenge",
        );
        if (challenge) {
          const gate = view.gate(challenge);
          if (gate.refusal === null && gate.readyAt <= now && gate.affordable)
            return { kind: "cast", action: challenge };
        }
      }
      let until: number | null = null;
      if (specials.length > 0 && now >= view.nextSpecialAt) {
        view.setNextSpecialAt(now + random.range(2, 4));
        const ready = specials.filter((action) => {
          if (
            view.classId === "warrior" &&
            (action.name === "Challenge" || action.name === "Battle Shout")
          )
            return false;
          if (!action.offensive) return false;
          const gate = view.gate(action);
          if (gate.refusal !== null || gate.readyAt > now || !gate.affordable)
            return false;
          if (dropsBelowHealerReserve(view, action)) return false;
          if (
            !action.damage &&
            action.effect &&
            view.targetHasEffect(action.effect)
          )
            return false;
          return true;
        });
        if (ready.length > 0)
          return { kind: "cast", action: ready[random.below(ready.length)] };
      } else if (specials.length > 0) {
        until =
          until === null
            ? view.nextSpecialAt
            : Math.min(until, view.nextSpecialAt);
      }
      const gate = view.gate(defaultAction);
      if (
        gate.refusal === null &&
        gate.affordable &&
        !dropsBelowHealerReserve(view, defaultAction)
      ) {
        if (gate.readyAt <= now) return { kind: "cast", action: defaultAction };
        until = until === null ? gate.readyAt : Math.min(until, gate.readyAt);
      }
      return { kind: "wait", until };
    },
  };
}

/** Source: server-scripts/PetSkills.cs:168-175. */
function dropsBelowHealerReserve(
  view: EntityView,
  action: EngineAction,
): boolean {
  return (
    view.hasHeals &&
    action.resourceCost > 0 &&
    view.resource.kind === "mana" &&
    view.resource.maximum > 0 &&
    view.resource.current - action.resourceCost <
      multiplyF32(view.resource.maximum, 0.35)
  );
}
