<script lang="ts">
  import type {
    AnyMapEntity,
    MonsterMapEntity,
    PortalMapEntity,
  } from "$lib/types/map";

  interface Props {
    entity: AnyMapEntity;
    x: number;
    y: number;
    isHoveringDestination?: boolean;
  }

  let { entity, x, y, isHoveringDestination = false }: Props = $props();

  function getEntityTypeName(entity: AnyMapEntity): string {
    switch (entity.type) {
      case "monster":
        return "Monster";
      case "boss":
        return "Boss";
      case "elite":
        return "Elite";
      case "hunt":
        return "Hunt";
      case "npc":
        return "NPC";
      case "portal":
        return isHoveringDestination ? "Portal Destination" : "Portal";
      case "chest":
        return "Chest";
      case "altar":
        return "Altar";
      case "gathering_plant":
        return "Plant";
      case "gathering_mineral":
        return "Mineral";
      case "gathering_spark":
        return "Spark";
      case "alchemy_table":
        return "Alchemy Table";
      case "crafting_station":
        return "Crafting Station";
      default:
        return "Unknown";
    }
  }

  function getPortalDescription(entity: AnyMapEntity): string | null {
    if (entity.type !== "portal") return null;
    const portal = entity as PortalMapEntity;
    if (isHoveringDestination) {
      return `From ${portal.zoneName}`;
    } else if (portal.destinationZoneName) {
      return `To ${portal.destinationZoneName}`;
    }
    return null;
  }
</script>

<div
  class="pointer-events-none fixed z-50 rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg"
  style="left: {x + 12}px; top: {y + 12}px;"
>
  <div class="font-medium">{entity.name}</div>
  <div class="text-muted-foreground">
    {getEntityTypeName(entity)}
    {#if entity.type === "monster" || entity.type === "boss" || entity.type === "elite" || entity.type === "hunt"}
      {@const monster = entity as MonsterMapEntity}
      <span class="ml-1">Lv. {monster.level}</span>
    {/if}
  </div>
  {#if entity.type === "portal"}
    {@const portalDesc = getPortalDescription(entity)}
    {#if portalDesc}
      <div class="text-xs text-muted-foreground">{portalDesc}</div>
    {/if}
  {:else}
    <div class="text-xs text-muted-foreground">{entity.zoneName}</div>
  {/if}
</div>
