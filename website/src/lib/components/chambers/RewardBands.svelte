<!--
  How many of the guardian's reward a run drops, by the entry's level and total veteran
  points. The reward is excluded from the compendium, so every amount carries the
  existing "Redacted item" placeholder. The band that holds the current entry is
  marked.
-->
<script lang="ts">
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import type { ChambersRewardBand } from "$lib/calculation/chambers";
  import { bandCovers, quantityLabel } from "./model";

  let {
    bands,
    entryLevel,
    veteranPoints,
    class: className = "",
  }: {
    bands: readonly ChambersRewardBand[];
    entryLevel: number;
    veteranPoints: number;
    class?: string;
  } = $props();

  const ceiling = $derived(
    Math.max(...bands.map((band) => band.maximumQuantity)),
  );

  function levels(band: ChambersRewardBand): string {
    return band.maximumLevel === null
      ? `Level ${band.minimumLevel} or higher`
      : band.minimumLevel === band.maximumLevel
        ? `Level ${band.minimumLevel}`
        : `Level ${band.minimumLevel} - ${band.maximumLevel}`;
  }

  function veterans(band: ChambersRewardBand) {
    if (band.minimumVeteranPoints === 0 && band.maximumVeteranPoints === null)
      return "Any veteran points";
    return band.maximumVeteranPoints === null
      ? `${band.minimumVeteranPoints} or more veteran points`
      : `${band.minimumVeteranPoints} - ${band.maximumVeteranPoints} veteran points`;
  }
</script>

<ul class="space-y-2 {className}">
  {#each bands as band (band.minimumLevel + ":" + band.minimumVeteranPoints)}
    {@const current = bandCovers(band, entryLevel, veteranPoints)}
    <li
      class="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] {current
        ? 'border-amber-500/70 bg-amber-500/5'
        : 'bg-card'}"
      aria-current={current ? "true" : undefined}
    >
      <div>
        <p class="font-medium text-foreground">
          {levels(band)}
          {#if current}
            <span
              class="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
              >Your entry</span
            >
          {/if}
        </p>
        <p class="text-sm text-muted-foreground">{veterans(band)}</p>
      </div>
      <div class="space-y-1">
        <p class="flex flex-wrap items-center gap-x-2 text-sm tabular-nums">
          <span class="font-semibold text-foreground"
            >{quantityLabel(band)}</span
          >
          <RedactedEntry kind="item" />
        </p>
        <div class="relative h-2 rounded-full bg-muted" aria-hidden="true">
          <div
            class="absolute inset-y-0 rounded-full bg-amber-500"
            style:left={`${((band.minimumQuantity - 1) / ceiling) * 100}%`}
            style:width={`${((band.maximumQuantity - band.minimumQuantity + 1) / ceiling) * 100}%`}
          ></div>
        </div>
      </div>
    </li>
  {/each}
</ul>
