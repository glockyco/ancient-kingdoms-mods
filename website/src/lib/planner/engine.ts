import {
  buildCasterStatSheet,
  type CasterStatInput,
  type CasterStatSheet,
} from "./caster";
import {
  applyCooldownReduction,
  applyEffect,
  cleanupExpiredEffects,
  scaleTargetDebuff,
  targetStatsWithEffects,
  type EffectSpec,
  type TimedEffect,
} from "./effects";
import {
  hitRefusal,
  prepareHit,
  requiredAmmunitionForSkill,
  sampleHit,
  weaponGateRefusal,
  type CasterClass,
  type DamageSkillSpec,
  type EquippedWeapon,
  type HitCaster,
  type HitOptions,
  type HitTarget,
  type PreparedHit,
} from "./hit";
import type { RandomSource } from "./random";
import {
  applyIncomingDamageReturn,
  applyOutgoingDamageReturn,
  recoverResourceTick,
  resourceRecoveryPerTick,
  setResourceCurrent,
  type CombatResourceState,
} from "./resource";
import type { DamageKind } from "./scenario";
import { debuffLandingProbability, type TargetCombatStats } from "./target";
import {
  effectiveCastTime,
  effectiveSkillCooldown,
  playerSkillRefractory,
} from "./timing";

/** One castable skill as the engine sees it. */
export interface EngineAction {
  id: string;
  name: string;
  defaultAttack: boolean;
  castTime: number;
  cooldown: number;
  resourceCost: number;
  isSpell: boolean;
  requiredWeaponCategory: string;
  followupDefaultAttack: boolean;
  /** True for the handlers a companion may select as a special action. */
  offensive: boolean;
  damage: DamageSkillSpec | null;
  effect: EffectSpec | null;
  /** Seconds between cast completion and projectile arrival; zero for non-projectiles. */
  projectileTravelSeconds: number;
  hitOptions?: HitOptions;
}

export interface EngineEntityInput {
  id: string;
  kind: "player" | "companion";
  classId: CasterClass;
  /** Base stat input without timed effects. */
  caster: CasterStatInput;
  weapons: readonly EquippedWeapon[];
  weaponDelay: number;
  resourceKind: "mana" | "energy";
  resourceRecovery: {
    base: number;
    equipmentFlat: number;
    passivePercent: number;
  };
  actions: readonly EngineAction[];
  policy: ActionPolicy;
  hasHeals: boolean;
  endlessQuiver: boolean;
  enhancedBackstab: boolean;
}

export interface EngineTargetInput {
  id: string;
  stats: TargetCombatStats & { criticalResist: number };
  currentHealth: number;
  maximumHealth: number;
}

export interface EngineInput {
  horizon: number;
  includeHorizonEvents: boolean;
  entities: readonly EngineEntityInput[];
  target: EngineTargetInput;
  initialResources: ReadonlyMap<string, number>;
  initialCooldowns: readonly {
    entityId: string;
    skillId: string;
    remainingSeconds: number;
  }[];
  initialEffects: readonly {
    sourceId: string;
    recipientId: string;
    spec: EffectSpec;
    remainingSeconds: number;
  }[];
  consumables: readonly {
    entityId: string;
    spec: EffectSpec | null;
    quantity: number;
  }[];
  ammunition: readonly { entityId: string; itemId: string; quantity: number }[];
  incomingEvents: readonly {
    atSeconds: number;
    targetEntityId: string;
    amount: number;
    damageType: DamageKind;
  }[];
}

/** What a policy may read when it decides. */
export interface EntityView {
  readonly id: string;
  readonly kind: "player" | "companion";
  readonly classId: CasterClass;
  readonly actions: readonly EngineAction[];
  readonly resource: CombatResourceState;
  readonly hasHeals: boolean;
  readonly nextDefaultAttackAt: number;
  readonly nextSpecialAt: number;
  readonly targetCurrentHealth: number;
  /** Cooldown readiness, legality, and affordability of one action. */
  gate(action: EngineAction): ActionGate;
  /** True when the target already holds this effect or its category. */
  targetHasEffect(spec: EffectSpec): boolean;
  setNextSpecialAt(at: number): void;
}

export interface ActionGate {
  readyAt: number;
  refusal: string | null;
  affordable: boolean;
}

export type ActionDecision =
  | { kind: "cast"; action: EngineAction }
  | { kind: "wait"; until: number | null }
  | { kind: "refuse"; action: EngineAction; reason: string };

export interface ActionPolicy {
  decide(view: EntityView, now: number, random: RandomSource): ActionDecision;
}

export type TimelineEvent =
  | { at: number; kind: "cast_start"; entityId: string; actionId: string }
  | { at: number; kind: "cast_complete"; entityId: string; actionId: string }
  | {
      at: number;
      kind: "refused";
      entityId: string;
      actionId: string;
      reason: string;
    }
  | {
      at: number;
      kind: "hit";
      entityId: string;
      actionId: string;
      school: DamageKind;
      intent: number;
      damage: number;
      avoided: boolean;
      critical: boolean;
    }
  | {
      at: number;
      kind: "effect_applied";
      sourceId: string;
      recipientId: string;
      skillId: string;
      replaced: string[];
    }
  | {
      at: number;
      kind: "effect_resisted";
      sourceId: string;
      recipientId: string;
      skillId: string;
    }
  | { at: number; kind: "effect_expired"; recipientId: string; skillId: string }
  | {
      at: number;
      kind: "resource";
      entityId: string;
      delta: number;
      current: number;
      cause: string;
    }
  | { at: number; kind: "target_died" };

export interface ActionCounts {
  cast: number;
  refused: number;
  hits: number;
  avoided: number;
  critical: number;
  landed: number;
}

export interface ReplicateResult {
  /** Refusal reason for each action at the initial state, or null when castable. */
  initialRefusals: Map<string, Map<string, string | null>>;
  damageByEntity: Map<string, number>;
  damageByAbility: Map<string, Map<string, number>>;
  damageBySchool: Map<string, Map<DamageKind, number>>;
  counts: Map<string, Map<string, ActionCounts>>;
  effectUptime: Map<string, Map<string, number>>;
  targetDiedAt: number | null;
  trace: TimelineEvent[];
}

type QueuedEvent =
  | { at: number; kind: "decide"; entityId: string }
  | { at: number; kind: "complete"; entityId: string; actionId: string }
  | {
      at: number;
      kind: "arrive";
      entityId: string;
      actionId: string;
      hit: Extract<PreparedHit, { refused: null }>;
    }
  | {
      at: number;
      kind: "incoming";
      entityId: string;
      amount: number;
      damageType: DamageKind;
    }
  | { at: number; kind: "expire"; recipientId: string }
  | { at: number; kind: "tick" };

interface EntityState {
  input: EngineEntityInput;
  sheet: CasterStatSheet;
  resource: CombatResourceState;
  effects: TimedEffect[];
  cooldownReadyAt: Map<string, number>;
  nextDefaultAttackAt: number;
  castingUntil: number | null;
  decideScheduledAt: number | null;
  decideBurst: { at: number; count: number };
  nextSpecialAt: number;
  ammunition: Map<string, number>;
  actionsById: Map<string, EngineAction>;
}

interface TargetState {
  input: EngineTargetInput;
  effects: TimedEffect[];
  currentHealth: number;
  diedAt: number | null;
}

class EventQueue {
  private readonly heap: { seq: number; event: QueuedEvent }[] = [];
  private seq = 0;

  push(event: QueuedEvent): void {
    const entry = { seq: this.seq, event };
    this.seq += 1;
    const heap = this.heap;
    heap.push(entry);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!EventQueue.before(heap[index], heap[parent])) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
  }

  pop(): QueuedEvent | undefined {
    const heap = this.heap;
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < heap.length && EventQueue.before(heap[left], heap[smallest]))
          smallest = left;
        if (
          right < heap.length &&
          EventQueue.before(heap[right], heap[smallest])
        )
          smallest = right;
        if (smallest === index) break;
        [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
        index = smallest;
      }
    }
    return top.event;
  }

  private static before(
    left: { seq: number; event: QueuedEvent },
    right: { seq: number; event: QueuedEvent },
  ): boolean {
    return left.event.at === right.event.at
      ? left.seq < right.seq
      : left.event.at < right.event.at;
  }
}

/**
 * Runs one replicate. Casts, completions, projectile arrivals, incoming damage, and effect expiry are
 * exact-timestamp events. Resource recovery runs on the one-second tick.
 * Source: server-scripts/NetworkManagerMMO.cs:105-117.
 */
export function runReplicate(
  input: EngineInput,
  random: RandomSource,
): ReplicateResult {
  return new Engine(input, random).run();
}

class Engine {
  private readonly queue = new EventQueue();
  private readonly entities = new Map<string, EntityState>();
  private readonly target: TargetState;
  private readonly result: ReplicateResult = {
    initialRefusals: new Map(),
    damageByEntity: new Map(),
    damageByAbility: new Map(),
    damageBySchool: new Map(),
    counts: new Map(),
    effectUptime: new Map(),
    targetDiedAt: null,
    trace: [],
  };

  constructor(
    private readonly input: EngineInput,
    private readonly random: RandomSource,
  ) {
    if (!(input.horizon > 0)) throw new RangeError("horizon must be positive");
    this.target = {
      input: input.target,
      effects: [],
      currentHealth: input.target.currentHealth,
      diedAt: null,
    };
    for (const entity of input.entities) this.addEntity(entity);
    for (const cooldown of input.initialCooldowns) {
      const entity = this.entity(cooldown.entityId);
      if (!entity.actionsById.has(cooldown.skillId))
        throw new Error(
          `${cooldown.entityId} has no action ${cooldown.skillId}`,
        );
      entity.cooldownReadyAt.set(cooldown.skillId, cooldown.remainingSeconds);
    }
    for (const effect of input.initialEffects) {
      this.applyEffectTo(effect.recipientId, {
        spec: effect.spec,
        sourceId: effect.sourceId,
        recipientId: effect.recipientId,
        appliedAt: 0,
        expiresAt: effect.remainingSeconds,
      });
    }
    for (const consumable of input.consumables) {
      if (consumable.spec === null || consumable.quantity <= 0) continue;
      this.applyEffectTo(consumable.entityId, {
        spec: consumable.spec,
        sourceId: consumable.entityId,
        recipientId: consumable.entityId,
        appliedAt: 0,
        expiresAt: consumable.spec.duration,
      });
    }
    for (const supply of input.ammunition) {
      const entity = this.entity(supply.entityId);
      entity.ammunition.set(
        supply.itemId,
        (entity.ammunition.get(supply.itemId) ?? 0) + supply.quantity,
      );
    }
    for (const event of input.incomingEvents) {
      this.queue.push({
        at: event.atSeconds,
        kind: "incoming",
        entityId: event.targetEntityId,
        amount: event.amount,
        damageType: event.damageType,
      });
    }
    for (let second = 1; second <= input.horizon; second += 1)
      this.queue.push({ at: second, kind: "tick" });
    for (const entity of this.entities.values()) {
      this.result.initialRefusals.set(
        entity.input.id,
        new Map(
          entity.input.actions.map((action) => [
            action.id,
            this.gate(entity, action).refusal,
          ]),
        ),
      );
      this.scheduleDecide(entity, 0);
    }
  }

  run(): ReplicateResult {
    for (;;) {
      const event = this.queue.pop();
      if (!event) break;
      if (event.at > this.input.horizon) break;
      if (event.at === this.input.horizon && !this.input.includeHorizonEvents)
        break;
      switch (event.kind) {
        case "decide":
          this.onDecide(this.entity(event.entityId), event.at);
          break;
        case "complete":
          this.onComplete(
            this.entity(event.entityId),
            event.actionId,
            event.at,
          );
          break;
        case "arrive":
          this.resolveHit(
            this.entity(event.entityId),
            event.actionId,
            event.hit,
            event.at,
          );
          break;
        case "incoming":
          this.onIncoming(
            this.entity(event.entityId),
            event.amount,
            event.damageType,
            event.at,
          );
          break;
        case "expire":
          this.onExpire(event.recipientId, event.at);
          break;
        case "tick":
          this.onTick(event.at);
          break;
      }
    }
    this.closeEffectUptime(this.input.horizon);
    return this.result;
  }

  private addEntity(input: EngineEntityInput): void {
    if (this.entities.has(input.id))
      throw new Error(`duplicate entity ${input.id}`);
    const actionsById = new Map<string, EngineAction>();
    for (const action of input.actions) {
      if (actionsById.has(action.id))
        throw new Error(`${input.id} declares action ${action.id} twice`);
      actionsById.set(action.id, action);
    }
    const initialCurrent = this.input.initialResources.get(input.id);
    if (initialCurrent === undefined)
      throw new Error(
        `scenario has no ${input.resourceKind} state for ${input.id}`,
      );
    const sheet = buildCasterStatSheet(input.caster);
    const maximum = input.resourceKind === "mana" ? sheet.mana : sheet.energy;
    const state: EntityState = {
      input,
      sheet,
      resource: {
        kind: input.resourceKind,
        current: Math.min(initialCurrent, maximum),
        maximum,
        recoveryPerTick: 0,
        enabled: true,
        alive: true,
      },
      effects: [],
      cooldownReadyAt: new Map(),
      nextDefaultAttackAt: 0,
      castingUntil: null,
      decideScheduledAt: null,
      decideBurst: { at: -1, count: 0 },
      nextSpecialAt: 0,
      ammunition: new Map(),
      actionsById,
    };
    this.entities.set(input.id, state);
    this.result.damageByEntity.set(input.id, 0);
    this.result.damageByAbility.set(input.id, new Map());
    this.result.damageBySchool.set(input.id, new Map());
    this.result.counts.set(input.id, new Map());
    this.refreshSheet(state);
  }

  private entity(id: string): EntityState {
    const entity = this.entities.get(id);
    if (!entity) throw new Error(`unknown entity ${id}`);
    return entity;
  }

  /** Recomputes the stat sheet, resource maximum, and recovery from base input plus active effects. */
  private refreshSheet(entity: EntityState): void {
    const base = entity.input.caster;
    const specs = entity.effects.map((effect) => effect.spec);
    entity.sheet = buildCasterStatSheet({
      ...base,
      bonusSources: [
        ...(base.bonusSources ?? []),
        ...specs.map((spec) => spec.bonuses),
      ],
      damagePercentBuffs: [
        ...(base.damagePercentBuffs ?? []),
        ...specs.map((spec) => spec.damagePercent),
      ],
      magicDamagePercentBuffs: [
        ...(base.magicDamagePercentBuffs ?? []),
        ...specs.map((spec) => spec.magicDamagePercent),
      ],
    });
    const mana = entity.input.resourceKind === "mana";
    const maximum = mana ? entity.sheet.mana : entity.sheet.energy;
    const recovery = entity.input.resourceRecovery;
    entity.resource = {
      ...entity.resource,
      maximum,
      current: Math.min(entity.resource.current, maximum),
      recoveryPerTick: resourceRecoveryPerTick({
        base: recovery.base,
        passivePercent: recovery.passivePercent,
        buffPercent: specs.reduce(
          (total, spec) =>
            total +
            (mana ? spec.manaRecoveryPercent : spec.energyRecoveryPercent),
          0,
        ),
        flatBonus:
          recovery.equipmentFlat +
          specs.reduce(
            (total, spec) =>
              total + (mana ? spec.manaRecoveryFlat : spec.energyRecoveryFlat),
            0,
          ),
        maximum,
      }),
    };
  }

  private targetStats(): HitTarget {
    return {
      ...targetStatsWithEffects(this.target.input.stats, this.target.effects),
      currentHealth: this.target.currentHealth,
      maximumHealth: this.target.input.maximumHealth,
    };
  }

  private hitCaster(entity: EntityState): HitCaster {
    return {
      kind: entity.input.kind,
      classId: entity.input.classId,
      level: entity.input.caster.level,
      damage: entity.sheet.damage,
      magicDamage: entity.sheet.magicDamage,
      accuracy: entity.sheet.accuracy,
      criticalChance: entity.sheet.criticalChance,
      dexterity: entity.sheet.attributes.dexterity,
      energyCurrent:
        entity.resource.kind === "energy" ? entity.resource.current : 0,
      manaCurrent:
        entity.resource.kind === "mana" ? entity.resource.current : 0,
      weapons: entity.input.weapons,
      ammunition: Object.fromEntries(entity.ammunition),
      endlessQuiver: entity.input.endlessQuiver,
      enhancedBackstab: entity.input.enhancedBackstab,
    };
  }

  private gate(entity: EntityState, action: EngineAction): ActionGate {
    const cooldownReady = entity.cooldownReadyAt.get(action.id) ?? 0;
    const readyAt =
      action.defaultAttack && entity.input.kind === "player"
        ? Math.max(cooldownReady, entity.nextDefaultAttackAt)
        : cooldownReady;
    const refusal = action.damage
      ? hitRefusal(this.hitCaster(entity), this.targetStats(), action.damage)
      : weaponGateRefusal(this.hitCaster(entity), action);
    const affordable = entity.resource.current >= action.resourceCost;
    return { readyAt, refusal, affordable };
  }

  private view(entity: EntityState): EntityView {
    return {
      id: entity.input.id,
      kind: entity.input.kind,
      classId: entity.input.classId,
      actions: entity.input.actions,
      resource: entity.resource,
      hasHeals: entity.input.hasHeals,
      nextDefaultAttackAt: entity.nextDefaultAttackAt,
      nextSpecialAt: entity.nextSpecialAt,
      targetCurrentHealth: this.target.currentHealth,
      gate: (action) => this.gate(entity, action),
      targetHasEffect: (spec) =>
        this.target.effects.some(
          (effect) =>
            effect.spec.skillId === spec.skillId ||
            (spec.category.length > 0 &&
              effect.spec.category === spec.category),
        ),
      setNextSpecialAt: (at) => {
        entity.nextSpecialAt = at;
      },
    };
  }

  private scheduleDecide(entity: EntityState, at: number): void {
    if (entity.castingUntil !== null && entity.castingUntil > at) return;
    if (entity.decideScheduledAt !== null && entity.decideScheduledAt <= at)
      return;
    entity.decideScheduledAt = at;
    this.queue.push({ at, kind: "decide", entityId: entity.input.id });
  }

  private onDecide(entity: EntityState, now: number): void {
    if (entity.decideScheduledAt !== now) return;
    entity.decideScheduledAt = null;
    if (this.target.diedAt !== null) return;
    if (entity.castingUntil !== null && entity.castingUntil > now) return;
    if (entity.decideBurst.at === now) {
      entity.decideBurst.count += 1;
      if (entity.decideBurst.count > 4 * (entity.input.actions.length + 2))
        throw new Error(`${entity.input.id} policy did not advance at ${now}`);
    } else {
      entity.decideBurst = { at: now, count: 1 };
    }
    const decision = entity.input.policy.decide(
      this.view(entity),
      now,
      this.random,
    );
    switch (decision.kind) {
      case "wait":
        if (
          decision.until !== null &&
          decision.until > now &&
          decision.until <= this.input.horizon
        )
          this.scheduleDecide(entity, decision.until);
        return;
      case "refuse":
        this.recordRefusal(entity, decision.action, decision.reason, now);
        this.scheduleDecide(entity, now);
        return;
      case "cast": {
        const gate = this.gate(entity, decision.action);
        if (gate.readyAt > now) {
          this.scheduleDecide(entity, gate.readyAt);
          return;
        }
        if (gate.refusal !== null || !gate.affordable) {
          this.recordRefusal(
            entity,
            decision.action,
            gate.refusal ?? `insufficient ${entity.resource.kind}`,
            now,
          );
          this.scheduleDecide(entity, now);
          return;
        }
        const castTime = effectiveCastTime(
          decision.action.castTime,
          decision.action.isSpell,
          entity.sheet.spellHaste,
        );
        entity.castingUntil = now + castTime;
        this.result.trace.push({
          at: now,
          kind: "cast_start",
          entityId: entity.input.id,
          actionId: decision.action.id,
        });
        this.queue.push({
          at: now + castTime,
          kind: "complete",
          entityId: entity.input.id,
          actionId: decision.action.id,
        });
      }
    }
  }

  /** Source: server-scripts/Skills.cs:1023-1136. */
  private onComplete(entity: EntityState, actionId: string, now: number): void {
    entity.castingUntil = null;
    const action = entity.actionsById.get(actionId)!;
    if (this.target.diedAt !== null) return;
    if (entity.resource.current < action.resourceCost) {
      this.recordRefusal(
        entity,
        action,
        `insufficient ${entity.resource.kind} at completion`,
        now,
      );
      this.scheduleDecide(entity, now);
      return;
    }
    this.counts(entity, action.id).cast += 1;
    this.result.trace.push({
      at: now,
      kind: "cast_complete",
      entityId: entity.input.id,
      actionId: action.id,
    });

    if (action.damage) {
      const hit = prepareHit(
        this.hitCaster(entity),
        this.targetStats(),
        action.damage,
        action.hitOptions,
      );
      if (hit.refused !== null) {
        this.recordRefusal(entity, action, hit.refused, now);
      } else {
        if (hit.intent.resourceSpent) {
          this.setResource(entity, 0, now, `${action.id} burn`);
        }
        this.consumeAmmunition(entity, action.damage, hit.ammunitionPerCast);
        if (action.projectileTravelSeconds > 0) {
          this.queue.push({
            at: now + action.projectileTravelSeconds,
            kind: "arrive",
            entityId: entity.input.id,
            actionId: action.id,
            hit,
          });
        } else {
          this.resolveHit(entity, action.id, hit, now);
        }
      }
    }
    if (action.effect) this.castEffect(entity, action, action.effect, now);

    if (action.resourceCost > 0)
      this.setResource(
        entity,
        entity.resource.current - action.resourceCost,
        now,
        `${action.id} cost`,
      );
    entity.cooldownReadyAt.set(
      action.id,
      now +
        effectiveSkillCooldown(action, entity.input.kind, entity.sheet.haste),
    );
    if (entity.input.kind === "player") {
      entity.nextDefaultAttackAt =
        now +
        playerSkillRefractory(
          action,
          entity.input.weaponDelay,
          entity.sheet.haste,
        );
    }
    this.scheduleDecide(entity, now);
  }

  private castEffect(
    entity: EntityState,
    action: EngineAction,
    spec: EffectSpec,
    now: number,
  ): void {
    if (spec.recipient === "self") {
      this.applyEffectTo(entity.input.id, {
        spec,
        sourceId: entity.input.id,
        recipientId: entity.input.id,
        appliedAt: now,
        expiresAt: now + spec.duration,
      });
      if (spec.cooldownReductionPercent > 0) {
        entity.cooldownReadyAt = applyCooldownReduction(
          entity.cooldownReadyAt,
          now,
          spec.cooldownReductionPercent,
        );
      }
      return;
    }
    if (spec.school === null)
      throw new Error(
        `${action.id} targets an enemy but declares no resist school`,
      );
    const probability = debuffLandingProbability({
      target: this.targetStats(),
      casterLevel: entity.input.caster.level,
      casterAccuracy: entity.sheet.accuracy,
      school: spec.school,
      decreasesResists: spec.decreasesResists,
    });
    if (!this.random.bernoulli(probability)) {
      this.result.trace.push({
        at: now,
        kind: "effect_resisted",
        sourceId: entity.input.id,
        recipientId: this.target.input.id,
        skillId: spec.skillId,
      });
      return;
    }
    const appliedSpec = scaleTargetDebuff(spec, entity.sheet.attributes);
    this.applyEffectTo(this.target.input.id, {
      spec: appliedSpec,
      sourceId: entity.input.id,
      recipientId: this.target.input.id,
      appliedAt: now,
      expiresAt: now + appliedSpec.duration,
    });
  }

  private applyEffectTo(recipientId: string, effect: TimedEffect): void {
    const now = effect.appliedAt;
    this.queue.push({ at: effect.expiresAt, kind: "expire", recipientId });
    if (recipientId === this.target.input.id) {
      const applied = applyEffect(this.target.effects, effect);
      this.target.effects = applied.effects;
      this.closeUptime(applied.replaced, now);
      this.recordApplied(effect, applied.replaced);
      return;
    }
    const entity = this.entity(recipientId);
    const applied = applyEffect(entity.effects, effect);
    entity.effects = applied.effects;
    this.closeUptime(applied.replaced, now);
    this.recordApplied(effect, applied.replaced);
    this.refreshSheet(entity);
  }

  private recordApplied(
    effect: TimedEffect,
    replaced: readonly TimedEffect[],
  ): void {
    this.result.trace.push({
      at: effect.appliedAt,
      kind: "effect_applied",
      sourceId: effect.sourceId,
      recipientId: effect.recipientId,
      skillId: effect.spec.skillId,
      replaced: replaced.map((entry) => entry.spec.skillId),
    });
  }

  private resolveHit(
    entity: EntityState,
    actionId: string,
    hit: Extract<PreparedHit, { refused: null }>,
    now: number,
  ): void {
    const counts = this.counts(entity, actionId);
    if (this.target.diedAt !== null) return;
    counts.hits += 1;
    const outcome = sampleHit(hit, this.random);
    const school = hit.intent.damageType;
    this.result.trace.push({
      at: now,
      kind: "hit",
      entityId: entity.input.id,
      actionId,
      school,
      intent: hit.intent.amount,
      damage: outcome.damage,
      avoided: outcome.avoided,
      critical: outcome.critical,
    });
    if (outcome.avoided) {
      counts.avoided += 1;
      return;
    }
    counts.landed += 1;
    if (outcome.critical) counts.critical += 1;
    const healthBefore = this.target.currentHealth;
    const dealt = Math.min(outcome.damage, healthBefore);
    this.target.currentHealth = healthBefore - dealt;
    this.addDamage(entity.input.id, actionId, school, dealt);
    const action = entity.actionsById.get(actionId)!;
    const returned = applyOutgoingDamageReturn({
      state: entity.resource,
      classId: entity.input.classId,
      skillId: actionId,
      followupDefaultAttack: action.followupDefaultAttack,
      landedDamage: outcome.damage,
      targetCurrentHealth: healthBefore,
    });
    if (returned.amount > 0)
      this.setResource(
        entity,
        returned.state.current,
        now,
        `${actionId} return`,
      );
    if (this.target.currentHealth <= 0) {
      this.target.diedAt = now;
      this.result.targetDiedAt = now;
      this.result.trace.push({ at: now, kind: "target_died" });
    }
  }

  /** Source: server-scripts/TargetProjectileSkill.cs:44-104. */
  private consumeAmmunition(
    entity: EntityState,
    skill: DamageSkillSpec,
    perCast: number,
  ): void {
    if (perCast <= 0) return;
    const itemId = requiredAmmunitionForSkill(this.hitCaster(entity), skill);
    if (itemId === null) return;
    if (entity.input.endlessQuiver && this.random.next() > 0.5) return;
    entity.ammunition.set(itemId, (entity.ammunition.get(itemId) ?? 0) - 1);
  }

  private onIncoming(
    entity: EntityState,
    amount: number,
    damageType: DamageKind,
    now: number,
  ): void {
    const returned = applyIncomingDamageReturn({
      state: entity.resource,
      classId: entity.input.classId,
      damage: amount,
      damageType,
    });
    if (returned.amount > 0)
      this.setResource(
        entity,
        returned.state.current,
        now,
        "incoming damage return",
      );
  }

  /** Source: server-scripts/Skills.cs:712-717,1248-1307. */
  private onExpire(recipientId: string, now: number): void {
    const isTarget = recipientId === this.target.input.id;
    const entity = isTarget ? null : this.entity(recipientId);
    const cleaned = cleanupExpiredEffects(
      entity ? entity.effects : this.target.effects,
      now,
    );
    if (cleaned.expired.length === 0) return;
    if (entity) entity.effects = cleaned.effects;
    else this.target.effects = cleaned.effects;
    this.closeUptime(cleaned.expired, now);
    for (const expired of cleaned.expired) {
      this.result.trace.push({
        at: now,
        kind: "effect_expired",
        recipientId,
        skillId: expired.spec.skillId,
      });
    }
    if (entity) {
      this.refreshSheet(entity);
      this.scheduleDecide(entity, now);
    }
  }

  private onTick(now: number): void {
    for (const entity of this.entities.values()) {
      const recovered = recoverResourceTick(entity.resource);
      if (recovered.current !== entity.resource.current)
        this.setResource(entity, recovered.current, now, "recovery tick");
    }
    for (const entity of this.entities.values())
      this.scheduleDecide(entity, now);
  }

  private setResource(
    entity: EntityState,
    current: number,
    now: number,
    cause: string,
  ): void {
    const before = entity.resource.current;
    entity.resource = setResourceCurrent(entity.resource, current);
    if (entity.resource.current === before) return;
    this.result.trace.push({
      at: now,
      kind: "resource",
      entityId: entity.input.id,
      delta: entity.resource.current - before,
      current: entity.resource.current,
      cause,
    });
  }

  private recordRefusal(
    entity: EntityState,
    action: EngineAction,
    reason: string,
    now: number,
  ): void {
    this.counts(entity, action.id).refused += 1;
    this.result.trace.push({
      at: now,
      kind: "refused",
      entityId: entity.input.id,
      actionId: action.id,
      reason,
    });
  }

  private counts(entity: EntityState, actionId: string): ActionCounts {
    const byAction = this.result.counts.get(entity.input.id)!;
    let counts = byAction.get(actionId);
    if (!counts) {
      counts = {
        cast: 0,
        refused: 0,
        hits: 0,
        avoided: 0,
        critical: 0,
        landed: 0,
      };
      byAction.set(actionId, counts);
    }
    return counts;
  }

  private addDamage(
    entityId: string,
    actionId: string,
    school: DamageKind,
    amount: number,
  ): void {
    this.result.damageByEntity.set(
      entityId,
      this.result.damageByEntity.get(entityId)! + amount,
    );
    const byAbility = this.result.damageByAbility.get(entityId)!;
    byAbility.set(actionId, (byAbility.get(actionId) ?? 0) + amount);
    const bySchool = this.result.damageBySchool.get(entityId)!;
    bySchool.set(school, (bySchool.get(school) ?? 0) + amount);
  }

  private closeUptime(effects: readonly TimedEffect[], now: number): void {
    for (const effect of effects) {
      const end = Math.min(now, this.input.horizon);
      let byRecipient = this.result.effectUptime.get(effect.recipientId);
      if (!byRecipient) {
        byRecipient = new Map();
        this.result.effectUptime.set(effect.recipientId, byRecipient);
      }
      byRecipient.set(
        effect.spec.skillId,
        (byRecipient.get(effect.spec.skillId) ?? 0) +
          Math.max(0, end - effect.appliedAt),
      );
    }
  }

  private closeEffectUptime(horizon: number): void {
    for (const entity of this.entities.values())
      this.closeUptime(entity.effects, horizon);
    this.closeUptime(this.target.effects, horizon);
  }
}
