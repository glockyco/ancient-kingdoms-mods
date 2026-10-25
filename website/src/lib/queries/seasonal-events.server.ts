import type {
  AcquisitionQuery,
  DataRow,
  MethodView,
} from "../acquisition/types";
import { loadAcquisition } from "../server/acquisition";
import {
  projectDefinitionInspection,
  projectItemSeasons,
  projectMethodSeasons,
} from "../acquisition/projections";
import type { Season } from "../data/seasonal-events";

export interface SeasonalItem {
  id: string;
  name: string;
  item_type: string;
  quality: number;
  tooltip_html: string | null;
  food_buff_id: string | null;
  food_buff_level: number;
  effect: string | null;
  seasons: readonly Season[];
}
export interface SeasonalShopOffer {
  seasons: readonly Season[];
  item_id: string;
  currency_id: string;
  price: number;
  received_id: string;
  amount: number;
}

/** Read the page's acquisition relationships through the same model as item pages. */
export async function getSeasonalEvents(execute: AcquisitionQuery) {
  const select = async <T>(
    sql: string,
    params: readonly (string | number | null)[] = [],
  ) => (await execute(sql, params)) as unknown as T[];
  const byIds = <T>(table: string, column: string, ids: readonly string[]) =>
    select<T>(
      `SELECT * FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?)) ORDER BY id`,
      [JSON.stringify(ids)],
    );
  const seasons = await select<{
    id: Season;
    buff_skill_id: string;
    buff_skill_name: string;
  }>(
    `SELECT s.id, s.buff_skill_id, k.name AS buff_skill_name
     FROM seasons s
     JOIN skills k ON k.id = s.buff_skill_id
     ORDER BY s.ordinal`,
  );
  const monsters = await select<{
    id: string;
    name: string;
    season: Season;
    spawn_time_start: number;
    spawn_time_end: number;
  }>(
    "SELECT id, name, season, spawn_time_start, spawn_time_end FROM monsters WHERE season IS NOT NULL ORDER BY name",
  );
  const npcRows = await select<{ id: string; name: string; season: Season }>(
    "SELECT id, name, season FROM npcs WHERE season IS NOT NULL ORDER BY name",
  );
  const memberships = await byIds<{ quest_id: string; role: string }>(
    "npc_quest_memberships",
    "npc_id",
    npcRows.map((n) => n.id),
  );
  const questIds = memberships
    .filter((m) => m.role === "offer")
    .map((m) => m.quest_id);
  const objectives = await byIds<{
    id: string;
    quest_id: string;
    kind: string;
    amount: number;
  }>("quest_objectives", "quest_id", questIds);
  const objectiveItems = await byIds<{ id: string; item_id: string }>(
    "quest_objective_items",
    "id",
    objectives.map((o) => o.id),
  );
  const seasonalIds = await select<{ item_id: string }>(
    "SELECT DISTINCT item_id FROM item_seasons ORDER BY item_id",
  );
  const model = await loadAcquisition(execute, {
    kind: "items",
    itemIds: [
      ...seasonalIds.map((i) => i.item_id),
      ...objectiveItems.map((i) => i.item_id),
    ],
  });
  const offersByItem = new Map<string, SeasonalShopOffer>();
  const currencyIds = new Set<string>();
  const questMethods = new Map<string, MethodView>();
  for (const method of model.methodViews.values()) {
    const methodSeasons = projectMethodSeasons(model, method);
    if (!methodSeasons.length) continue;
    if (
      method.kind === "quest_complete" &&
      questIds.includes(String(method.detail.quest_id))
    )
      questMethods.set(String(method.detail.quest_id), method);
    if (method.kind !== "vendor") continue;
    const input = method.costGroups
      .flatMap((g) => g.inputs)
      .find((i) => i.resource_kind === "item");
    const output = method.outputs.find((o) => o.item_id);
    if (!input?.item_id || !output?.item_id || output.quantity.kind !== "exact")
      continue;
    const itemId = String(method.detail.offered_item_id);
    const previous = offersByItem.get(itemId);
    if (
      previous &&
      (previous.currency_id !== input.item_id ||
        previous.price !== input.amount)
    )
      throw new Error(
        `Seasonal offer ${itemId} costs differently between seasons, so one row cannot show it`,
      );
    offersByItem.set(itemId, {
      item_id: itemId,
      seasons: [...new Set([...(previous?.seasons ?? []), ...methodSeasons])],
      currency_id: input.item_id,
      price: input.amount,
      received_id: output.item_id,
      amount: output.quantity.value,
    });
    currencyIds.add(input.item_id);
  }
  const offers = [...offersByItem.values()].sort((a, b) =>
    a.item_id.localeCompare(b.item_id),
  );
  const spawnRows = await byIds<{
    id: string;
    monster_id: string;
    zone_id: string;
    level: number;
  }>(
    "monster_spawns",
    "monster_id",
    monsters.map((m) => m.id),
  );
  const npcSpawns = await byIds<{
    id: string;
    npc_id: string;
    zone_id: string;
  }>(
    "npc_spawns",
    "npc_id",
    npcRows.map((n) => n.id),
  );
  const completers = await byIds<{
    quest_id: string;
    npc_id: string;
    role: string;
  }>("npc_quest_memberships", "quest_id", questIds);
  const turnInSpawns = await byIds<{
    id: string;
    npc_id: string;
    zone_id: string;
  }>(
    "npc_spawns",
    "npc_id",
    completers.map((n) => n.npc_id),
  );
  const zones = await select<{ id: string; name: string }>(
    "SELECT id, name FROM zones ORDER BY id",
  );
  const zoneName = (id: string) => zones.find((z) => z.id === id)!.name;
  const huntZones = [...new Set(spawnRows.map((s) => s.zone_id))]
    .map((id) => {
      const spawns = spawnRows.filter((s) => s.zone_id === id);
      return {
        id,
        name: zoneName(id),
        level_min: Math.min(...spawns.map((s) => s.level)),
        level_max: Math.max(...spawns.map((s) => s.level)),
        counts: Object.fromEntries(
          monsters.map((m) => [
            m.id,
            spawns.filter((s) => s.monster_id === m.id).length,
          ]),
        ),
      };
    })
    .sort((a, b) => a.level_min - b.level_min || a.name.localeCompare(b.name));
  // Every item a seasonal monster drops, with each monster's chance per kill.
  // Currencies come first, then the other drops by name.
  const dropChances = new Map<string, Record<string, number>>();
  for (const method of model.methodViews.values()) {
    if (method.kind !== "kill" || !projectMethodSeasons(model, method).length)
      continue;
    const monsterId = String(method.detail.monster_id);
    for (const result of method.probabilityResults) {
      if (
        result.target.kind !== "item" ||
        result.quantityMeaning !== "at_least_one"
      )
        continue;
      const chance = Number(result.probability!.toPrecision(12));
      const chances = dropChances.get(result.target.itemId) ?? {};
      if (chances[monsterId] !== undefined && chances[monsterId] !== chance)
        throw new Error(
          `${monsterId} drops ${result.target.itemId} at two chances, so one cell cannot show it`,
        );
      chances[monsterId] = chance;
      dropChances.set(result.target.itemId, chances);
    }
  }
  const drops = [...dropChances]
    .map(([item_id, chances]) => ({ item_id, chances }))
    .sort(
      (a, b) =>
        Number(currencyIds.has(b.item_id)) -
          Number(currencyIds.has(a.item_id)) ||
        String(model.entities.get("items")!.get(a.item_id)!.name).localeCompare(
          String(model.entities.get("items")!.get(b.item_id)!.name),
        ),
    );
  const entities = (table: string) => model.entities.get(table)!;
  const facts = (table: string) => model.rows.facts[table] ?? [];
  const objectiveMonsterSpawns = await byIds<{
    id: string;
    monster_id: string;
    zone_id: string;
  }>(
    "monster_spawns",
    "monster_id",
    facts("quest_objective_monsters").map((m) => String(m.monster_id)),
  );
  const quests = questIds
    .map((id) => {
      const q = entities("quests").get(id)!;
      const completer = completers.find(
        (n) => n.quest_id === id && n.role === "complete",
      )!;
      const npc = entities("npcs").get(completer.npc_id)!;
      const objective = objectives.find((o) => o.quest_id === id)!;
      const item = objectiveItems.find((i) => i.id === objective.id);
      const monster = facts("quest_objective_monsters").find(
        (m) => m.id === objective.id,
      );
      const location = facts("quest_objective_locations").find(
        (l) => l.id === objective.id,
      );
      let objectiveZones: string[] = [];
      if (item)
        objectiveZones = [
          ...new Set(
            [...model.methodViews.values()]
              .filter((m) => m.outputs.some((o) => o.item_id === item.item_id))
              .flatMap((m) =>
                m.providers.flatMap((p) =>
                  p.location?.zoneId ? [p.location.zoneId] : [],
                ),
              ),
          ),
        ];
      if (monster)
        objectiveZones = [
          ...new Set(
            objectiveMonsterSpawns
              .filter((s) => s.monster_id === monster.monster_id)
              .map((s) => s.zone_id),
          ),
        ];
      if (!item && !monster)
        objectiveZones = turnInSpawns
          .filter((s) => s.npc_id === completer.npc_id)
          .map((s) => s.zone_id);
      const rewards = questMethods.get(id)!.outputs.flatMap<{
        item_id: string;
        amount: number;
        pack_id: string | null;
      }>((o) => {
        if (!o.item_id || o.quantity.kind !== "exact") return [];
        const amount = o.quantity.value;
        const contents = projectDefinitionInspection(
          model,
          o.item_id,
        ).fixedContents;
        return contents.length
          ? contents.map((c) => {
              if (c.amount.kind !== "exact")
                throw new Error(
                  `Seasonal reward pack ${o.item_id} has no fixed quantity`,
                );
              return {
                item_id: c.itemId!,
                amount: c.amount.value * amount,
                pack_id: o.item_id!,
              };
            })
          : [{ item_id: o.item_id, amount, pack_id: null }];
      });
      return {
        id,
        name: String(q.name),
        level_recommended: Number(q.level_recommended),
        xp: Number(q.reward_experience),
        completer_id: npc.id,
        completer_name: String(npc.name),
        objective: item
          ? {
              verb: "Gather",
              amount: objective.amount,
              href: `/items/${item.item_id}`,
              name: String(entities("items").get(item.item_id)!.name),
            }
          : monster
            ? {
                verb: "Kill",
                amount: objective.amount,
                href: `/monsters/${monster.monster_id}`,
                name: String(
                  entities("monsters").get(String(monster.monster_id))!.name,
                ),
              }
            : { text: String(location!.tracking_quest_location) },
        zones: [...new Set(objectiveZones)].map((z) => ({
          id: z,
          name: zoneName(z),
        })),
        rewards: [
          ...new Map(rewards.map((r) => [JSON.stringify(r), r])).values(),
        ],
      };
    })
    .sort((a, b) => a.level_recommended - b.level_recommended);
  const itemIds = new Set([
    ...offers.flatMap((o) => [o.item_id, o.received_id, o.currency_id]),
    ...quests.flatMap((q) =>
      q.rewards.flatMap((r) => [r.item_id, ...(r.pack_id ? [r.pack_id] : [])]),
    ),
    ...drops.map((drop) => drop.item_id),
  ]);
  const items: Record<string, SeasonalItem> = Object.fromEntries(
    [...itemIds].map((id) => {
      const i = entities("items").get(id) as DataRow;
      return [
        id,
        {
          id,
          name: String(i.name),
          item_type: String(i.item_type),
          quality: Number(i.quality),
          tooltip_html: i.tooltip_html as string | null,
          food_buff_id: i.food_buff_id as string | null,
          food_buff_level: Number(i.food_buff_level),
          effect: null,
          seasons: projectItemSeasons(model, id),
        } satisfies SeasonalItem,
      ];
    }),
  );
  return {
    seasons,
    monsters,
    huntZones,
    npcs: npcSpawns.map((s) => ({
      ...npcRows.find((n) => n.id === s.npc_id)!,
      zone_id: s.zone_id,
      zone_name: zoneName(s.zone_id),
    })),
    quests,
    offers,
    drops,
    items,
  };
}
