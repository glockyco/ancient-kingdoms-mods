<!--
  How likely each enemy level is. One bar per level, labelled with its chance.
  The caller passes one scale for several charts, so a bar in one chart is as
  tall as an equal chance in another.
-->
<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import type { EnemyLevelChance } from "$lib/calculation/chambers";

  let {
    title,
    chances,
    entryLevel,
    scaleMax,
    tone = "bg-primary/60",
    class: className = "",
  }: {
    title: string;
    chances: readonly EnemyLevelChance[];
    entryLevel: number;
    /** The probability that fills the chart's height. */
    scaleMax: number;
    tone?: string;
    class?: string;
  } = $props();

  const percent = (value: number) =>
    formatPercent(value, { decimals: 1, trailingZeros: true });
  const lowest = $derived(chances[0].level);
  const highest = $derived(chances[chances.length - 1].level);
</script>

<figure class="min-w-0 {className}">
  <figcaption class="mb-2 flex flex-wrap items-baseline gap-x-2">
    <span class="font-semibold text-foreground">{title}</span>
    <span class="text-sm tabular-nums text-muted-foreground"
      >Level {lowest} - {highest}</span
    >
  </figcaption>
  <div class="flex h-40 items-end gap-1 border-b">
    {#each chances as row (row.level)}
      <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
        <span
          class="mb-0.5 text-[11px] font-medium tabular-nums text-foreground"
          >{percent(row.probability)}</span
        >
        <div
          class="w-full max-w-10 rounded-t-sm {tone}"
          style:height={`${(row.probability / scaleMax) * 100 * 0.8}%`}
        ></div>
      </div>
    {/each}
  </div>
  <div class="flex gap-1">
    {#each chances as row (row.level)}
      <div
        class="min-w-0 flex-1 pt-1 text-center text-xs tabular-nums {row.level ===
        entryLevel
          ? 'font-semibold text-foreground'
          : 'text-muted-foreground'}"
      >
        {row.level}
        {#if row.level === entryLevel}
          <span class="block text-[10px] font-normal leading-tight"
            >your level</span
          >
        {/if}
      </div>
    {/each}
  </div>
  <!-- The caption renders outside the table's box, so the wrapper hides both. -->
  <div class="sr-only">
    <table>
      <caption>{title}: chance of each enemy level</caption>
      <thead
        ><tr><th>Enemy Level</th><th>Levels Above Yours</th><th>Chance</th></tr
        ></thead
      >
      <tbody>
        {#each chances as row (row.level)}
          <tr
            ><td>{row.level}</td><td>{row.offset}</td><td
              >{percent(row.probability)}</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</figure>
