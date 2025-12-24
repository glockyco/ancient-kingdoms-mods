<script lang="ts">
  import type {
    AnyMapEntity,
    MonsterMapEntity,
    NpcMapEntity,
    PortalMapEntity,
    ChestMapEntity,
    AltarMapEntity,
    GatheringMapEntity,
    CraftingMapEntity,
  } from "$lib/types/map";
  import { toRomanNumeral } from "$lib/utils/format";
  import {
    calculateTooltipPosition,
    getNpcRoles,
    hasNpcRole,
  } from "$lib/utils/tooltip";
  import { ENTITY_BORDER_COLORS } from "$lib/map/config";

  interface Props {
    entity: AnyMapEntity;
    x: number;
    y: number;
    isHoveringDestination?: boolean;
  }

  let { entity, x, y, isHoveringDestination = false }: Props = $props();

  let tooltipRef: HTMLDivElement | null = $state(null);
  let tooltipWidth = $state(200);
  let tooltipHeight = $state(80);

  $effect(() => {
    if (tooltipRef) {
      tooltipWidth = tooltipRef.offsetWidth;
      tooltipHeight = tooltipRef.offsetHeight;
    }
  });

  let position = $derived(
    calculateTooltipPosition(x, y, tooltipWidth, tooltipHeight),
  );

  let borderColorClass = $derived(
    ENTITY_BORDER_COLORS[entity.type] ?? "border-l-gray-500",
  );

  let typeName = $derived(getEntityTypeName(entity));

  function getDisplayName(entity: AnyMapEntity): string {
    if (entity.type === "alchemy_table") return "Alchemy Table";
    if (entity.type === "crafting_station") {
      const crafting = entity as CraftingMapEntity;
      return crafting.isCookingOven ? "Cooking Oven" : "Forge";
    }
    return entity.name;
  }

  function getEntityTypeName(entity: AnyMapEntity): string | null {
    switch (entity.type) {
      case "monster":
        return "Creature";
      case "boss":
        return "Boss";
      case "elite":
        return "Elite";
      case "hunt":
        return "Hunt";
      case "npc":
        return "NPC";
      case "portal":
        return isHoveringDestination ? "Portal Destination" : null;
      case "gathering_plant":
        return "Plant";
      case "gathering_mineral":
        return "Mineral";
      case "alchemy_table":
      case "crafting_station":
        return "Crafting Station";
      case "chest":
      case "altar":
      case "gathering_spark":
        return null;
      default:
        return null;
    }
  }
</script>

<div
  bind:this={tooltipRef}
  class="pointer-events-none fixed z-50 rounded-lg border border-l-[3px] {borderColorClass} bg-popover px-3 py-2 text-sm shadow-lg"
  style="left: {position.left}px; top: {position.top}px;"
>
  <!-- Name -->
  <div class="font-medium">{getDisplayName(entity)}</div>

  <!-- Type + Level line (only for entities that have a type subtitle) -->
  {#if typeName || entity.type === "monster" || entity.type === "boss" || entity.type === "elite" || entity.type === "hunt" || entity.type === "gathering_plant" || entity.type === "gathering_mineral"}
    <div class="text-muted-foreground">
      {typeName ??
        ""}<!--
      -->{#if entity.type === "monster" || entity.type === "boss" || entity.type === "elite" || entity.type === "hunt"}<!--
        -->{@const monster =
          entity as MonsterMapEntity}<!--
        -->{#if typeName}<span
            class="ml-1">Lv. {monster.level}</span
          >{:else}Lv. {monster.level}{/if}<!--
      -->{:else if entity.type === "gathering_plant" || entity.type === "gathering_mineral"}<!--
        -->{@const gathering =
          entity as GatheringMapEntity}<!--
        -->, Tier {toRomanNumeral(
          gathering.level,
        )}<!--
      -->{/if}
    </div>
  {/if}

  <!-- Status indicators -->
  {#if entity.type === "npc"}
    {@const npc = entity as NpcMapEntity}
    {@const roles = getNpcRoles(npc.roleBitmask)}
    {#if roles.length > 0}
      <div class="mt-0.5 flex flex-wrap gap-1">
        {#each roles as role (role)}
          <span
            class="rounded bg-blue-500/20 px-1 py-0.5 text-[10px] text-blue-400"
          >
            {role}
          </span>
        {/each}
      </div>
    {/if}
    {#if npc.renewalDungeonName && hasNpcRole(npc.roleBitmask, "isRenewalSage")}
      <div class="text-xs text-muted-foreground">
        Resets: {npc.renewalDungeonName}
      </div>
    {/if}
  {:else if entity.type === "chest"}
    {@const chest = entity as ChestMapEntity}
    {#if chest.keyRequiredName}
      <div class="text-xs text-amber-400">Key: {chest.keyRequiredName}</div>
    {/if}
  {:else if entity.type === "altar"}
    {@const altar = entity as AltarMapEntity}
    {#if altar.activationItemName}
      <div class="text-xs text-amber-400">
        Requires: {altar.activationItemName}
      </div>
    {/if}
    {#if altar.minLevel > 0}
      <div class="text-xs text-muted-foreground">Lv. {altar.minLevel}+</div>
    {/if}
  {:else if entity.type === "monster" || entity.type === "boss" || entity.type === "elite" || entity.type === "hunt"}
    {@const monster = entity as MonsterMapEntity}
    {#if monster.spawnType === "placeholder" && monster.sourceMonsterName}
      <div class="text-xs text-cyan-400">
        Kill: {monster.sourceMonsterName}
      </div>
    {/if}
    {#if monster.isPatrolling}
      <div class="text-xs text-muted-foreground">Patrolling</div>
    {/if}
  {:else if entity.type === "portal"}
    {@const portal = entity as PortalMapEntity}
    {#if portal.isClosed}
      <div class="text-xs text-red-400">Closed</div>
    {:else}
      {#if portal.requiredItemName}
        <div class="text-xs text-amber-400">Key: {portal.requiredItemName}</div>
      {/if}
      {#if portal.needMonsterDeadName}
        <div class="text-xs text-amber-400">
          Kill: {portal.needMonsterDeadName}
        </div>
      {/if}
      {#if portal.requiredLevel > 0}
        <div class="text-xs text-muted-foreground">
          Lv. {portal.requiredLevel}+
        </div>
      {/if}
      {#if portal.requiredItemLevel > 0}
        <div class="text-xs text-muted-foreground">
          Item Lv. {portal.requiredItemLevel}+
        </div>
      {/if}
    {/if}
  {/if}

  <!-- Zone -->
  <div class="text-xs text-muted-foreground">{entity.zoneName}</div>
</div>
