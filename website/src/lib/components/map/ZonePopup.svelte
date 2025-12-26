<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityButton from "./MapEntityButton.svelte";
  import type { ParentZoneBoundary } from "$lib/types/map";
  import {
    loadZonePopupDetails,
    type ZonePopupDetails,
  } from "$lib/queries/popup";

  interface Props {
    zone: ParentZoneBoundary;
    onClose: () => void;
    onSelectMonster: (monsterId: string) => void;
    onSelectAltar: (altarId: string) => void;
    onSelectNpc: (npcId: string) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    onHoverAltar?: (altarId: string | null) => void;
    onHoverNpc?: (npcId: string | null) => void;
  }

  let {
    zone,
    onClose,
    onSelectMonster,
    onSelectAltar,
    onSelectNpc,
    onHoverMonster,
    onHoverAltar,
    onHoverNpc,
  }: Props = $props();

  // Lazy-loaded details state
  let details = $state<ZonePopupDetails | null>(null);
  let isLoading = $state(false);

  // Load details when zone changes
  $effect(() => {
    const currentZone = zone;
    details = null;

    async function loadDetails() {
      isLoading = true;
      try {
        details = await loadZonePopupDetails(currentZone.zoneId);
      } finally {
        isLoading = false;
      }
    }

    loadDetails();
  });

  // Format level range
  function formatLevelRange(
    min: number | null,
    max: number | null,
  ): string | null {
    if (min === null && max === null) return null;
    if (min === max) return `${min}`;
    return `${min ?? "?"} – ${max ?? "?"}`;
  }

  let levelRange = $derived(formatLevelRange(zone.levelMin, zone.levelMax));
</script>

<PopupCard
  title={zone.name}
  subtitle={zone.isDungeon ? "Dungeon" : undefined}
  detailsUrl="/zones/{zone.zoneId}"
  {onClose}
>
  <!-- Level Range -->
  {#if levelRange}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Level</span>
      <span>{levelRange}</span>
    </div>
  {/if}

  {#if isLoading}
    <div class="text-muted-foreground py-2 text-center text-xs">Loading...</div>
  {:else if details}
    <!-- Bosses -->
    {#if details.bosses.length > 0}
      <div class="border-t pt-2">
        <div class="text-muted-foreground mb-1 text-xs font-medium">Bosses</div>
        <ul class="space-y-0.5">
          {#each details.bosses as boss (boss.id)}
            <li class="flex items-center justify-between gap-2">
              <MapEntityButton
                onSelect={() => onSelectMonster(boss.id)}
                onHoverStart={() => onHoverMonster?.(boss.id)}
                onHoverEnd={() => onHoverMonster?.(null)}
                class="truncate text-cyan-400"
              >
                {boss.name}
              </MapEntityButton>
              <span class="text-muted-foreground shrink-0 text-xs">
                Lv. {boss.level}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Elites -->
    {#if details.elites.length > 0}
      <div class="border-t pt-2">
        <div class="text-muted-foreground mb-1 text-xs font-medium">Elites</div>
        <ul class="space-y-0.5">
          {#each details.elites as elite (elite.id)}
            <li class="flex items-center justify-between gap-2">
              <MapEntityButton
                onSelect={() => onSelectMonster(elite.id)}
                onHoverStart={() => onHoverMonster?.(elite.id)}
                onHoverEnd={() => onHoverMonster?.(null)}
                class="truncate text-purple-400"
              >
                {elite.name}
              </MapEntityButton>
              <span class="text-muted-foreground shrink-0 text-xs">
                Lv. {elite.level}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Altars -->
    {#if details.altars.length > 0}
      <div class="border-t pt-2">
        <div class="text-muted-foreground mb-1 text-xs font-medium">Altars</div>
        <ul class="space-y-0.5">
          {#each details.altars as altar (altar.id)}
            <li>
              <MapEntityButton
                onSelect={() => onSelectAltar(altar.id)}
                onHoverStart={() => onHoverAltar?.(altar.id)}
                onHoverEnd={() => onHoverAltar?.(null)}
                class="text-orange-400"
              >
                {altar.name}
              </MapEntityButton>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Renewal Sage -->
    {#if details.renewalSage}
      {@const sage = details.renewalSage}
      <div class="border-t pt-2">
        <div class="text-muted-foreground mb-1 text-xs font-medium">
          Renewal Sage
        </div>
        <div class="flex items-center justify-between gap-2">
          <MapEntityButton
            onSelect={() => onSelectNpc(sage.id)}
            onHoverStart={() => onHoverNpc?.(sage.id)}
            onHoverEnd={() => onHoverNpc?.(null)}
            class="truncate text-blue-400"
          >
            {sage.name}
          </MapEntityButton>
          <span class="text-muted-foreground shrink-0 text-xs">
            in {sage.zoneName}
          </span>
        </div>
        {#if sage.goldCost > 0}
          <div class="text-muted-foreground text-xs">
            Reset cost: {sage.goldCost.toLocaleString()} gold
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</PopupCard>
