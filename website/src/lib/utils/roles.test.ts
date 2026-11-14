import { describe, expect, it } from "vitest";
import { NPC_ROLE_BITS } from "$lib/types/map";
import type { NpcRoles } from "$lib/types/npcs";
import { getNpcRoles } from "$lib/utils/tooltip";
import { missingAnchors } from "$lib/testing/route-anchors";
import { npcDescription } from "$lib/server/meta-description";
import { NPC_FACETS } from "$lib/map/marker-registry";
import { FILTERED_LISTS } from "$lib/search/lists";
import {
  normalizeRoles,
  ROLE_CONFIG,
  ROLE_DESCRIPTIONS,
  ROLE_RULES,
} from "./roles";

describe("NPC role configuration", () => {
  it("preserves the keeper service across defaults, badges, map facets and descriptions", () => {
    expect(normalizeRoles({}).is_chambers_of_chaos_keeper).toBe(false);
    const roles = normalizeRoles({
      is_chambers_of_chaos_keeper: true,
      is_quest_giver: true,
    });
    expect(
      ROLE_CONFIG.find((role) => role.key === "is_chambers_of_chaos_keeper"),
    ).toMatchObject({ label: "Chambers of Chaos Keeper", category: "travel" });
    expect(NPC_ROLE_BITS.isChambersOfChaosKeeper).toBe(22);
    expect(NPC_ROLE_BITS.isBarber).toBe(21);
    expect(getNpcRoles(1 << 22)).toEqual(["Chambers of Chaos Keeper"]);
    expect(FILTERED_LISTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filter: { kind: "npc-role", value: "is_chambers_of_chaos_keeper" },
        }),
      ]),
    );
    expect(NPC_FACETS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ visibilityKey: "npcChambersOfChaosKeepers" }),
      ]),
    );
    expect(ROLE_DESCRIPTIONS.is_chambers_of_chaos_keeper?.description).toBe(
      "Offers entry to the Chambers of Chaos.",
    );
    expect(ROLE_RULES.is_chambers_of_chaos_keeper?.href).toBe(
      "/mechanics/chambers-of-chaos",
    );
    expect(
      npcDescription({ name: "Keeper", faction: null, roles }, ["Zone"]),
    ).toBe("Chambers of Chaos Keeper in Zone. Also: Quest Giver.");
  });

  it("surfaces guild management NPCs in role config and map bitmasks", () => {
    const roles = normalizeRoles({
      is_guild_management: true,
    } as Partial<NpcRoles>);

    expect(roles.is_guild_management).toBe(true);
    expect(
      ROLE_CONFIG.find((config) => config.key === "is_guild_management"),
    ).toMatchObject({ label: "Guild Manager", category: "service" });

    const bit = (NPC_ROLE_BITS as Record<string, number>).isGuildManagement;
    expect(bit).toBe(20);
    expect(getNpcRoles(1 << bit)).toContain("Guild Manager");
  });

  it("surfaces barber NPCs in role config and map bitmasks", () => {
    const roles = normalizeRoles({
      is_barber: true,
    } as Partial<NpcRoles>);

    expect(roles.is_barber).toBe(true);
    expect(
      ROLE_CONFIG.find((config) => config.key === "is_barber"),
    ).toMatchObject({ label: "Barber", category: "service" });

    const bit = (NPC_ROLE_BITS as Record<string, number>).isBarber;
    expect(bit).toBe(21);
    expect(getNpcRoles(1 << bit)).toContain("Barber");
  });

  it("groups service prices and reputation requirements", () => {
    expect(ROLE_DESCRIPTIONS.is_faction_vendor!.details![0]).toContain(
      "15\u202F000 reputation",
    );
    expect(ROLE_DESCRIPTIONS.is_faction_vendor!.details![0]).toContain(
      "Friendly 14\u202F000 / 20\u202F000",
    );
    expect(ROLE_DESCRIPTIONS.is_bank!.details![1]).toContain(
      "100\u202F000 gold",
    );
    expect(ROLE_DESCRIPTIONS.is_augmenter!.details![0]).toContain(
      "10\u202F000 gold",
    );
  });

  it("links every service to a section that exists", () => {
    const hrefs = Object.values(ROLE_RULES).map((rules) => rules!.href);
    expect(missingAnchors(hrefs)).toEqual([]);
  });
});
