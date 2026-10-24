import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { load } from "./+page.server";
import { load as loadMonster } from "../../monsters/[id]/+page.server";

describe("regional event page data", () => {
  test("groups the exported attackers in wave order without losing invasions", () => {
    const data = load();
    const db = new Database("data/compendium.db", { readonly: true });
    const invasions = db
      .prepare("SELECT id FROM regional_invasions ORDER BY id")
      .all() as { id: string }[];
    const attackers = db
      .prepare(
        "SELECT invasion_id, ordinal, monster_id FROM regional_invasion_attackers ORDER BY invasion_id, ordinal",
      )
      .all();
    const settings = db
      .prepare(
        "SELECT enabled, activity_duration_minutes, prosperity_duration_minutes FROM regional_event_settings WHERE id = 1",
      )
      .get();
    db.close();

    expect(data.settings).toEqual(settings);
    expect(data.invasions.map(({ id }) => id).sort()).toEqual(
      invasions.map(({ id }) => id),
    );
    expect(
      data.invasions
        .flatMap(({ attackers }) => attackers)
        .map(({ invasion_id, ordinal, monster_id }) => ({
          invasion_id,
          ordinal,
          monster_id,
        }))
        .sort(
          (a, b) =>
            a.invasion_id.localeCompare(b.invasion_id) || a.ordinal - b.ordinal,
        ),
    ).toEqual(attackers);
    expect(
      data.invasions.every(
        (invasion) =>
          invasion.zone_name &&
          invasion.attackers.length > 0 &&
          invasion.attackers.every((attacker) => attacker.monster_name),
      ),
    ).toBe(true);
  });

  test("monster details list each matching invasion once and omit unrelated invasions", async () => {
    const data = load();
    const monsterId = data.invasions[0].attackers[0].monster_id;
    const expected = data.invasions
      .filter((invasion) =>
        invasion.attackers.some(
          (attacker) => attacker.monster_id === monsterId,
        ),
      )
      .map((invasion) => ({
        id: invasion.id,
        city: invasion.city,
        city_name: invasion.city_name,
        zone_id: invasion.zone_id,
        zone_name: invasion.zone_name,
        minimum_level: invasion.minimum_level,
        maximum_level: invasion.maximum_level,
        health_multiplier: invasion.health_multiplier,
      }));
    const monster = await loadMonster({
      params: { id: monsterId },
    } as Parameters<typeof loadMonster>[0]);
    const ordinaryMonster = await loadMonster({
      params: { id: "rat" },
    } as Parameters<typeof loadMonster>[0]);

    expect(monster?.regionalInvasions).toEqual(expected);
    expect(ordinaryMonster?.regionalInvasions).toEqual([]);
  });
});
