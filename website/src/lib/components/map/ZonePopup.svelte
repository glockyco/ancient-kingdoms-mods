<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import type { ParentZoneBoundary } from "$lib/types/map";
  import {
    loadZonePopupDetails,
    type ZonePopupDetails,
  } from "$lib/queries/popup";

  interface Props {
    zone: ParentZoneBoundary;
    onClose: () => void;
  }

  let { zone, onClose }: Props = $props();

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

<Card.Root
  class="absolute right-4 top-4 z-10 w-80 gap-0 bg-background/95 py-0 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="!gap-0 border-b !py-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <Card.Title class="text-base">{zone.name}</Card.Title>
        {#if zone.isDungeon}
          <p class="text-sm text-muted-foreground">Dungeon</p>
        {/if}
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

  <Card.Content class="space-y-1.5 py-2 text-sm">
    <!-- Level Range -->
    {#if levelRange}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Level</span>
        <span>{levelRange}</span>
      </div>
    {/if}

    {#if isLoading}
      <div class="text-muted-foreground py-2 text-center text-xs">
        Loading...
      </div>
    {:else if details}
      <!-- Bosses -->
      {#if details.bosses.length > 0}
        <div class="border-t pt-2">
          <div class="text-muted-foreground mb-1 text-xs font-medium">
            Bosses
          </div>
          <ul class="space-y-0.5">
            {#each details.bosses as boss (boss.id)}
              <li class="flex items-center justify-between gap-2">
                <a
                  href="/monsters/{boss.id}"
                  class="truncate text-cyan-400 hover:underline"
                >
                  {boss.name}
                </a>
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
          <div class="text-muted-foreground mb-1 text-xs font-medium">
            Elites
          </div>
          <ul class="space-y-0.5">
            {#each details.elites as elite (elite.id)}
              <li class="flex items-center justify-between gap-2">
                <a
                  href="/monsters/{elite.id}"
                  class="truncate text-purple-400 hover:underline"
                >
                  {elite.name}
                </a>
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
          <div class="text-muted-foreground mb-1 text-xs font-medium">
            Altars
          </div>
          <ul class="space-y-0.5">
            {#each details.altars as altar (altar.id)}
              <li>
                <a
                  href="/altars/{altar.id}"
                  class="text-orange-400 hover:underline"
                >
                  {altar.name}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Renewal Sage -->
      {#if details.renewalSage}
        <div class="border-t pt-2">
          <div class="text-muted-foreground mb-1 text-xs font-medium">
            Renewal Sage
          </div>
          <div class="flex items-center justify-between gap-2">
            <a
              href="/npcs/{details.renewalSage.id}"
              class="truncate text-blue-400 hover:underline"
            >
              {details.renewalSage.name}
            </a>
            <span class="text-muted-foreground shrink-0 text-xs">
              in {details.renewalSage.zoneName}
            </span>
          </div>
          {#if details.renewalSage.goldCost > 0}
            <div class="text-muted-foreground text-xs">
              Reset cost: {details.renewalSage.goldCost.toLocaleString()} gold
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </Card.Content>

  <a
    href="/zones/{zone.zoneId}"
    class="block border-t py-2 text-center text-sm text-primary hover:underline"
  >
    View Details
  </a>
</Card.Root>
