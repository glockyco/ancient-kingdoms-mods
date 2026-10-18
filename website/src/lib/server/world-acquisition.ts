import type Database from "better-sqlite3";
import type { AcquisitionModel, MethodView } from "$lib/acquisition/types";
import type { MonsterDrop } from "$lib/types/monsters";
import { evaluateOutputQuantity } from "$lib/acquisition/rules";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import {
  formatAltarRequirement,
  type AltarThresholds,
} from "$lib/calculation/altar";
import { monsterFatecharm } from "$lib/utils/fatecharm";

export function contextualMonsterDrops(
  db: Database.Database,
  methods: readonly MethodView[],
  model: AcquisitionModel,
): Array<MonsterDrop & { method_id: string; chance_event: string }> {
  const drops: Array<
    MonsterDrop & { method_id: string; chance_event: string }
  > = [];
  for (const method of methods) {
    const hasFatecharm = monsterFatecharm(model, method) !== null;
    // The in-game bestiary lists a monster's own drop entries; items resolved
    // through a distribution wrapper such as Random Map are not among them.
    const ownPoolIds = [
      ...model.rows.methodPools
        .filter((binding) => binding.method_id === method.methodId)
        .map((binding) => String(binding.pool_id)),
      ...(typeof method.detail.loot_pool_id === "string"
        ? [method.detail.loot_pool_id]
        : []),
    ];
    const directItemIds = new Set(
      ownPoolIds.flatMap((poolId) =>
        (model.entriesByPool.get(poolId) ?? []).flatMap((entry) =>
          entry.resolution === "direct" && entry.item_id ? [entry.item_id] : [],
        ),
      ),
    );
    const itemIds = new Set(
      method.probabilityResults.flatMap((result) =>
        result.target.kind === "item" ? [result.target.itemId] : [],
      ),
    );
    for (const output of method.outputs)
      if (output.item_id) itemIds.add(output.item_id);
    for (const itemId of itemIds) {
      const conditional = method.outputs.find(
        (output) => output.item_id === itemId && output.condition_slot !== null,
      );
      const result = method.probabilityResults.find(
        (result) =>
          result.target.kind === "item" && result.target.itemId === itemId,
      );
      const row = model.methods.get(method.methodId);
      if (!row)
        throw new Error(`Missing acquisition method ${method.methodId}`);
      const neededQuestItemIds = new Set([itemId]);
      const scenario = {
        assumptions: {
          ...BASELINE_ASSUMPTIONS,
          scenario: "entered" as const,
          questNeed: "specified" as const,
        },
        neededQuestItemIds,
      };
      const chance =
        calculateMethodProbabilities(
          model.rows,
          row,
          method.detail,
          scenario,
        ).find(
          (value) =>
            value.target.kind === "item" && value.target.itemId === itemId,
        )?.probability ?? null;
      const boosted = hasFatecharm
        ? calculateMethodProbabilities(model.rows, row, method.detail, {
            ...scenario,
            assumptions: { ...scenario.assumptions, fatecharm: true },
          }).find(
            (value) =>
              value.target.kind === "item" && value.target.itemId === itemId,
          )?.probability
        : null;
      const item = db
        .prepare(
          `
        SELECT i.name, i.quality, i.tooltip_html, i.is_bestiary_drop, va.public_path
        FROM items i LEFT JOIN visual_assets va
        ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
        WHERE i.id = ?
      `,
        )
        .get(itemId) as
        | {
            name: string;
            quality: number;
            tooltip_html: string | null;
            is_bestiary_drop: number;
            public_path: string | null;
          }
        | undefined;
      if (!item) throw new Error(`Missing acquisition item ${itemId}`);
      const locations = [
        ...new Set(
          method.providers.map((provider) => {
            const zone = provider.location?.zoneId
              ? model.entities.get("zones")?.get(provider.location.zoneId)
              : null;
            return `${provider.name}${zone ? ` in ${String(zone.name)}` : ""}`;
          }),
        ),
      ].join(", ");
      const wave =
        typeof method.detail.wave_number === "number"
          ? `, wave ${method.detail.wave_number + 1}`
          : "";
      let tierNote: string | null = null;
      if (conditional && typeof method.detail.altar_id === "string") {
        const tier = (["common", "magic", "epic", "legendary"] as const)[
          conditional.condition_slot!
        ];
        if (!tier)
          throw new Error(`Invalid altar reward condition ${conditional.id}`);
        const altar = db
          .prepare(
            "SELECT magic_reward_threshold, epic_reward_threshold, legendary_reward_threshold FROM altars WHERE id = ?",
          )
          .get(method.detail.altar_id) as AltarThresholds | undefined;
        const progression = db
          .prepare("SELECT max_level FROM progression_rules WHERE id = 1")
          .get() as { max_level: number } | undefined;
        if (!altar || !progression)
          throw new Error(
            `Missing altar reward requirements ${method.methodId}`,
          );
        tierNote = formatAltarRequirement(tier, altar, progression.max_level);
      }
      drops.push({
        item_id: itemId,
        item_name: item.name,
        quality: item.quality,
        tooltip_html: item.tooltip_html,
        visual_public_path: item.public_path,
        note: `${locations || method.ruleId}${wave} (${(result?.event ?? "eligible_kill").replaceAll("_", " ")})${tierNote ? `: ${tierNote}` : ""}`,
        is_bestiary:
          Boolean(item.is_bestiary_drop) && directItemIds.has(itemId),
        rate: chance,
        ...(chance === null ? {} : { per_kill_chance: chance }),
        ...(boosted == null ? {} : { per_kill_chance_with_fatecharm: boosted }),
        chance_event: result?.event ?? "eligible_kill",
        method_id: method.methodId,
        ...(typeof method.detail.altar_id === "string"
          ? { altar_id: method.detail.altar_id }
          : {}),
      });
    }
  }
  return drops;
}

export function primaryRewardFields(
  methods: readonly MethodView[],
  items: Readonly<Record<string, { name: string }>>,
) {
  const outputs = methods.flatMap((method) =>
    method.outputs.filter(
      (output) =>
        output.resource_kind === "item" &&
        output.item_id &&
        !output.withheld &&
        output.yield_rule !== "pool" &&
        output.delivery === "inventory",
    ),
  );
  const identities = new Set(outputs.map((output) => output.item_id));
  const itemId = identities.size === 1 ? outputs[0].item_id : null;
  const quantities = outputs.map((output) => evaluateOutputQuantity(output));
  return {
    item_reward_id: itemId,
    item_reward_name: itemId ? (items[itemId]?.name ?? itemId) : null,
    item_reward_amount: itemId
      ? Math.max(
          ...quantities.map((quantity) =>
            quantity.kind === "exact"
              ? quantity.value
              : quantity.kind === "range"
                ? (quantity.max ?? quantity.min)
                : 1,
          ),
        )
      : 0,
  };
}

export function chestRewardFields(
  methods: readonly MethodView[],
  items: Readonly<Record<string, { name: string }>>,
) {
  const primary = primaryRewardFields(methods, items);
  const keyIds = new Set(
    methods.map((method) =>
      typeof method.detail.key_item_id === "string"
        ? method.detail.key_item_id
        : null,
    ),
  );
  const keyId = keyIds.size === 1 ? [...keyIds][0] : null;
  const gold = methods.flatMap((method) =>
    method.outputs
      .filter((output) => output.resource_kind === "gold")
      .map((output) => evaluateOutputQuantity(output)),
  );
  const lower = gold.map((quantity) =>
    quantity.kind === "exact"
      ? quantity.value
      : quantity.kind === "range"
        ? quantity.min
        : 0,
  );
  const upper = gold.map((quantity) =>
    quantity.kind === "exact"
      ? quantity.value
      : quantity.kind === "range"
        ? (quantity.max ?? quantity.min)
        : 0,
  );
  const chances = new Set(methods.map((method) => method.detail.outer_success));
  if (chances.size > 1) throw new Error("Conflicting chest opening chances");
  const chance = [...chances][0];
  return {
    ...primary,
    key_required_id: keyId,
    key_required_name: keyId ? (items[keyId]?.name ?? keyId) : null,
    gold_min: lower.length ? Math.min(...lower) : 0,
    gold_max: upper.length ? Math.max(...upper) : 0,
    chest_reward_probability: typeof chance === "number" ? chance : 1,
  };
}
