import type Database from "better-sqlite3";
import type { AcquisitionModel, MethodView } from "$lib/acquisition/types";
import type { MonsterDrop } from "$lib/types/monsters";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import {
  formatAltarRequirement,
  type AltarThresholds,
} from "$lib/calculation/altar";

export function contextualMonsterDrops(
  db: Database.Database,
  methods: readonly MethodView[],
  model: AcquisitionModel,
): MonsterDrop[] {
  const drops: MonsterDrop[] = [];
  for (const method of methods) {
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
      const hasFatecharm =
        method.detail.is_boss === 1 &&
        !!db
          .prepare(
            `
        SELECT 1 FROM items charm JOIN zones z ON z.id = charm.luck_token_zone_id
        WHERE charm.luck_token_zone_id = ? AND charm.luck_token_bonus > 0
        AND z.is_dungeon = 1 AND z.zone_id > 0
      `,
          )
          .get(method.detail.loot_zone_id);
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
        is_bestiary: Boolean(item.is_bestiary_drop),
        rate: chance,
        ...(chance === null ? {} : { per_kill_chance: chance }),
        ...(boosted == null ? {} : { per_kill_chance_with_fatecharm: boosted }),
        method_id: method.methodId,
        ...(typeof method.detail.altar_id === "string"
          ? { altar_id: method.detail.altar_id }
          : {}),
      });
    }
  }
  return drops;
}
