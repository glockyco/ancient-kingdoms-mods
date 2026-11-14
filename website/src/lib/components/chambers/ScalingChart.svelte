<!--
  Health targets or Power across the three chambers and the final guardian. Each bar
  starts from zero and ends at the most likely enemy level's value, so the guardian's
  multiple reads at a glance. The line on it runs from the lowest to the highest enemy
  level the entry can draw. The numbers sit beside each bar, so no value depends on the
  picture.
-->
<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import type { ChamberScaling } from "./model";

  let {
    chambers,
    metric,
    title,
    note,
    swatch,
    class: className = "",
  }: {
    chambers: readonly ChamberScaling[];
    metric: "health" | "power";
    title: string;
    /** One sentence on what the number is. */
    note: string;
    /** CSS color of the bars. */
    swatch: string;
    class?: string;
  } = $props();

  const low = (row: ChamberScaling) =>
    metric === "health" ? row.healthMin : row.powerMin;
  const high = (row: ChamberScaling) =>
    metric === "health" ? row.healthMax : row.powerMax;
  const likely = (row: ChamberScaling) =>
    metric === "health" ? row.likely.health : row.likely.power;
  const ceiling = $derived(Math.max(...chambers.map(high)));
  const at = (value: number) => `${(value / ceiling) * 100}%`;
</script>

<figure class="min-w-0 {className}">
  <figcaption class="mb-3">
    <span class="font-semibold text-foreground">{title}</span>
    <span class="block text-sm text-muted-foreground">{note}</span>
  </figcaption>
  <ul class="space-y-3">
    {#each chambers as row (row.label)}
      <li
        class="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[5.25rem_minmax(0,1fr)_9.5rem]"
      >
        <span class="text-sm font-medium whitespace-nowrap text-foreground"
          >{row.label}</span
        >
        <div class="relative h-5 rounded-sm bg-muted/60" aria-hidden="true">
          <div
            class="absolute inset-y-0.5 left-0 rounded-sm opacity-85"
            style:width={at(likely(row))}
            style:background={swatch}
          ></div>
          <div
            class="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground"
            style:left={at(low(row))}
            style:width={`max(2px, ${((high(row) - low(row)) / ceiling) * 100}%)`}
          ></div>
          <div
            class="absolute top-1 bottom-1 w-0.5 bg-foreground"
            style:left={at(low(row))}
          ></div>
          <div
            class="absolute top-1 bottom-1 w-0.5 bg-foreground"
            style:left={`calc(${at(high(row))} - 2px)`}
          ></div>
        </div>
        <p
          class="col-start-2 text-sm tabular-nums text-muted-foreground sm:col-start-3"
        >
          <span class="font-semibold text-foreground"
            >{formatNumber(likely(row))}</span
          >
          <span class="text-xs">most likely</span><br />
          {formatNumber(low(row))} - {formatNumber(high(row))}
        </p>
      </li>
    {/each}
  </ul>
  <p class="mt-3 text-xs text-muted-foreground">
    Bar: most likely level. Line: lowest to highest level. Values are rounded to
    whole numbers.
  </p>
</figure>
