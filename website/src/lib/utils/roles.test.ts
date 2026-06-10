import { describe, expect, it } from "vitest";
import { NPC_ROLE_BITS } from "$lib/types/map";
import type { NpcRoles } from "$lib/types/npcs";
import { getNpcRoles } from "$lib/utils/tooltip";
import { normalizeRoles, ROLE_CONFIG } from "./roles";

describe("NPC role configuration", () => {
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
});
