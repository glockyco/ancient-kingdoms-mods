<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import type {
    AnyMapEntity,
    MonsterMapEntity,
    NpcMapEntity,
    PortalMapEntity,
    ChestMapEntity,
    AltarMapEntity,
    GatheringMapEntity,
  } from "$lib/types/map";

  interface Props {
    entity: AnyMapEntity;
    onClose: () => void;
  }

  let { entity, onClose }: Props = $props();

  function getEntityUrl(entity: AnyMapEntity): string | null {
    switch (entity.type) {
      case "monster":
      case "boss":
      case "elite":
        return `/monsters/${entity.id}`;
      case "npc":
        return `/npcs/${entity.id}`;
      case "chest":
        return `/chests/${entity.id}`;
      case "altar":
        return `/altars/${entity.id}`;
      default:
        return null;
    }
  }

  function getEntityTypeName(entity: AnyMapEntity): string {
    switch (entity.type) {
      case "monster":
        return "Monster";
      case "boss":
        return "Boss";
      case "elite":
        return "Elite";
      case "npc":
        return "NPC";
      case "portal":
        return "Portal";
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

  const url = $derived(getEntityUrl(entity));
</script>

<Card.Root
  class="absolute right-4 top-4 z-10 w-72 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="pb-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <Card.Title class="text-base">{entity.name}</Card.Title>
        <p class="text-sm text-muted-foreground">{getEntityTypeName(entity)}</p>
      </div>
      <Button variant="ghost" size="sm" onclick={onClose} class="h-6 w-6 p-0">
        <span class="sr-only">Close</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </Button>
    </div>
  </Card.Header>
  <Card.Content class="space-y-2 pb-3 text-sm">
    <div class="flex justify-between">
      <span class="text-muted-foreground">Zone</span>
      <span>{entity.zoneName}</span>
    </div>

    {#if entity.type === "monster" || entity.type === "boss" || entity.type === "elite"}
      {@const monster = entity as MonsterMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Level</span>
        <span>{monster.level}</span>
      </div>
    {/if}

    {#if entity.type === "npc"}
      {@const npc = entity as NpcMapEntity}
      {#if npc.isVendor || npc.isQuestGiver}
        <div class="flex gap-2">
          {#if npc.isVendor}
            <span
              class="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400"
              >Vendor</span
            >
          {/if}
          {#if npc.isQuestGiver}
            <span
              class="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400"
              >Quests</span
            >
          {/if}
        </div>
      {/if}
    {/if}

    {#if entity.type === "portal"}
      {@const portal = entity as PortalMapEntity}
      {#if portal.destinationZoneName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Destination</span>
          <span>{portal.destinationZoneName}</span>
        </div>
      {/if}
      {#if portal.isClosed}
        <span class="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400"
          >Closed</span
        >
      {/if}
    {/if}

    {#if entity.type === "chest"}
      {@const chest = entity as ChestMapEntity}
      {#if chest.keyRequiredName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Key Required</span>
          <span>{chest.keyRequiredName}</span>
        </div>
      {/if}
    {/if}

    {#if entity.type === "altar"}
      {@const altar = entity as AltarMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Type</span>
        <span class="capitalize">{altar.altarType}</span>
      </div>
      {#if altar.minLevel > 0}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Min Level</span>
          <span>{altar.minLevel}</span>
        </div>
      {/if}
    {/if}

    {#if entity.type === "gathering_plant" || entity.type === "gathering_mineral" || entity.type === "gathering_spark"}
      {@const gathering = entity as GatheringMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Level</span>
        <span>{gathering.level}</span>
      </div>
    {/if}

    <div class="flex justify-between">
      <span class="text-muted-foreground">Position</span>
      <span class="font-mono text-xs"
        >{entity.position[0].toFixed(0)}, {entity.position[1].toFixed(0)}</span
      >
    </div>

    {#if url}
      <a
        href={url}
        class="mt-2 block text-center text-sm text-primary hover:underline"
      >
        View Details
      </a>
    {/if}
  </Card.Content>
</Card.Root>
