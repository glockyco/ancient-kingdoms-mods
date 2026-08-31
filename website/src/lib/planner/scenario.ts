export const SCENARIO_SCHEMA_VERSION = 1 as const;
export const SUPPORTED_TARGET_COUNT = 1 as const;

export type ResourceKind = "health" | "mana" | "energy";
export type DamageKind =
  "normal" | "magic" | "poison" | "fire" | "cold" | "disease";

export interface EvaluationScenario {
  schemaVersion: typeof SCENARIO_SCHEMA_VERSION;
  target: {
    id: string;
    level: number;
  };
  horizonSeconds: number;
  initialResources: Array<{
    entityId: string;
    resource: ResourceKind;
    current: number;
    maximum: number;
  }>;
  initialCooldowns: Array<{
    entityId: string;
    skillId: string;
    remainingSeconds: number;
  }>;
  activeBuffs: Array<{
    sourceEntityId: string;
    targetEntityId: string;
    skillId: string;
    skillLevel: number;
    remainingSeconds: number;
  }>;
  consumables: Array<{
    entityId: string;
    itemId: string;
    quantity: number;
  }>;
  ammunition: Array<{
    entityId: string;
    itemId: string;
    quantity: number;
  }>;
  incomingEvents: Array<{
    atSeconds: number;
    targetEntityId: string;
    amount: number;
    damageType: DamageKind;
  }>;
  roster: string[];
  targetCount: number;
}

export function assertSupportedTargetCount(
  targetCount: number,
): asserts targetCount is 1 {
  if (targetCount !== SUPPORTED_TARGET_COUNT) {
    throw new RangeError(
      `Unsupported target count ${targetCount}; expected ${SUPPORTED_TARGET_COUNT}`,
    );
  }
}
