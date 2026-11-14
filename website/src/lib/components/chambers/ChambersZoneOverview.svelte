<!--
  The Chambers of Chaos zone overview. The zone has no world map, spawn rows or enemy
  counts, because every run generates its own rooms, so the overview shows a real capture,
  how to enter, what the final guardian drops, and the monsters that fill the chambers.
  The entry item and the reward are excluded from the compendium and show as the
  existing "Redacted item" placeholder.
-->
<script lang="ts">
  import { resolve } from "$app/paths";
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import { formatRange } from "$lib/utils/format";
  import CaptureFigure from "./CaptureFigure.svelte";
  import KeeperCard from "./KeeperCard.svelte";
  import PoolList from "./PoolList.svelte";
  import type { ChambersOverview } from "./model";

  let { overview }: { overview: ChambersOverview } = $props();

  const shot = $derived(
    overview.captures.find((entry) => entry.kind === "shot"),
  );
  const range = $derived(overview.rewardRange);
</script>

<section class="space-y-6" aria-label="Chambers of Chaos overview">
  <div class="grid items-center gap-6 lg:grid-cols-2">
    <div class="space-y-4">
      <!-- Source: server-scripts/MadMageTower.cs:Prepare,Spawn; MadMageTowerScenes.cs:Create — every run builds its own rooms and spawns its enemies in a private scene, so the zone has no authored map, spawn points or enemy counts. -->
      <p class="text-muted-foreground">
        The Chambers of Chaos have no map, fixed spawns or enemy counts, because
        every run generates its own rooms.
      </p>
      <!-- Source: server-scripts/MadMageTower.cs:Begin,Ready — entry needs level 40, no other player in the party, and one entry item, which is taken when chamber 1 opens. -->
      <p class="text-muted-foreground">
        Mordrath lets you in alone at level {overview.definition.minimumLevel} and
        up, for
        <span class="whitespace-nowrap"
          >1 <RedactedEntry kind="item" slot={false} /></span
        >. You clear {overview.definition.roomCount} chambers within {overview
          .definition.runDurationSeconds / 60} minutes.
      </p>
      <KeeperCard keeper={overview.keeper} />
      <!-- Source: server-scripts/MadMageTowerRules.cs:Reward; MadMageTower.cs:MonsterDied — the final guardian drops the reward in an amount rolled at entry from the entry level and total veteran points. -->
      <p class="text-muted-foreground">
        The final guardian drops
        <span class="whitespace-nowrap"
          >{formatRange(range.minimum, range.maximum)}
          <RedactedEntry kind="item" slot={false} /></span
        >, depending on your level and total veteran points.
      </p>
      <p>
        <a
          href={resolve("/mechanics/chambers-of-chaos")}
          class="text-blue-600 hover:underline dark:text-blue-400"
          >How a run works</a
        >
      </p>
    </div>
    {#if shot}
      <CaptureFigure
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt="A pale stone hall seen from above, with skeletons, orcs and constructs standing among stone vases."
        caption="Real run: the first hall of a Battle chamber."
        priority
      />
    {/if}
  </div>

  <div class="space-y-3">
    <h2 class="text-xl font-semibold">Guardians</h2>
    <p class="text-muted-foreground">
      Chamber guardians are world monsters, rescaled for the Chambers. Their own
      pages describe the world versions.
    </p>
    <PoolList groups={overview.groups} />
  </div>
</section>
