import type { DamageKind, EvaluationScenario, ResourceKind } from "./scenario";

export interface ResourceState {
  current: number;
  maximum: number;
}

export interface TimedCooldownState {
  entityId: string;
  skillId: string;
  remainingSeconds: number;
}

export interface TimedBuffState {
  sourceEntityId: string;
  targetEntityId: string;
  skillId: string;
  skillLevel: number;
  remainingSeconds: number;
}

export interface InventoryState {
  entityId: string;
  itemId: string;
  quantity: number;
}

export interface IncomingDamageEvent {
  atSeconds: number;
  targetEntityId: string;
  amount: number;
  damageType: DamageKind;
}

export interface ScenarioState {
  atSeconds: number;
  horizonSeconds: number;
  resources: ReadonlyMap<string, ReadonlyMap<ResourceKind, ResourceState>>;
  cooldowns: readonly TimedCooldownState[];
  activeBuffs: readonly TimedBuffState[];
  consumables: readonly InventoryState[];
  ammunition: readonly InventoryState[];
  incomingEvents: readonly IncomingDamageEvent[];
  nextIncomingEventIndex: number;
}

export interface ScenarioAdvance {
  state: ScenarioState;
  incomingEvents: readonly IncomingDamageEvent[];
}

export function createInitialScenarioState(
  scenario: EvaluationScenario,
): ScenarioState {
  const resources = new Map<string, Map<ResourceKind, ResourceState>>();
  for (const entry of scenario.initialResources) {
    let entity = resources.get(entry.entityId);
    if (!entity) {
      entity = new Map<ResourceKind, ResourceState>();
      resources.set(entry.entityId, entity);
    }
    entity.set(entry.resource, {
      current: entry.current,
      maximum: entry.maximum,
    });
  }

  return {
    atSeconds: 0,
    horizonSeconds: scenario.horizonSeconds,
    resources,
    cooldowns: scenario.initialCooldowns.map((entry) => ({ ...entry })),
    activeBuffs: scenario.activeBuffs.map((entry) => ({ ...entry })),
    consumables: scenario.consumables.map((entry) => ({ ...entry })),
    ammunition: scenario.ammunition.map((entry) => ({ ...entry })),
    incomingEvents: scenario.incomingEvents.map((entry) => ({ ...entry })),
    nextIncomingEventIndex: 0,
  };
}

export function advanceScenarioState(
  state: ScenarioState,
  toSeconds: number,
): ScenarioAdvance {
  if (!Number.isFinite(toSeconds)) {
    throw new TypeError("Scenario time must be finite");
  }
  if (toSeconds < state.atSeconds) {
    throw new RangeError("Scenario time must not move backwards");
  }
  if (toSeconds > state.horizonSeconds) {
    throw new RangeError("Scenario time must not exceed the horizon");
  }

  const elapsed = toSeconds - state.atSeconds;
  let nextIncomingEventIndex = state.nextIncomingEventIndex;
  const incomingEvents: IncomingDamageEvent[] = [];
  while (
    nextIncomingEventIndex < state.incomingEvents.length &&
    state.incomingEvents[nextIncomingEventIndex].atSeconds <= toSeconds
  ) {
    incomingEvents.push(state.incomingEvents[nextIncomingEventIndex]);
    nextIncomingEventIndex += 1;
  }

  return {
    state: {
      ...state,
      atSeconds: toSeconds,
      cooldowns: state.cooldowns.map((entry) => ({
        ...entry,
        remainingSeconds: Math.max(0, entry.remainingSeconds - elapsed),
      })),
      activeBuffs: state.activeBuffs
        .map((entry) => ({
          ...entry,
          remainingSeconds: Math.max(0, entry.remainingSeconds - elapsed),
        }))
        .filter((entry) => entry.remainingSeconds > 0),
      nextIncomingEventIndex,
    },
    incomingEvents,
  };
}

export function consumeAmmunition(
  state: ScenarioState,
  entityId: string,
  itemId: string,
  requiredQuantity: number,
): ScenarioState {
  if (!Number.isInteger(requiredQuantity) || requiredQuantity < 0) {
    throw new RangeError(
      "Required ammunition quantity must be a non-negative integer",
    );
  }
  const entryIndex = state.ammunition.findIndex(
    (entry) => entry.entityId === entityId && entry.itemId === itemId,
  );
  const availableQuantity =
    entryIndex === -1 ? 0 : state.ammunition[entryIndex].quantity;
  if (requiredQuantity > availableQuantity) {
    throw new RangeError(
      `Insufficient ammunition for ${entityId}: required ${requiredQuantity} ${itemId}, available ${availableQuantity}`,
    );
  }
  if (requiredQuantity === 0) return state;

  return {
    ...state,
    ammunition: state.ammunition.map((entry, index) =>
      index === entryIndex
        ? { ...entry, quantity: entry.quantity - requiredQuantity }
        : entry,
    ),
  };
}
