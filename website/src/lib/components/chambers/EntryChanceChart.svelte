<!--
  The chance that an eligible elite drops the entry item, by the elite's level.
  The item is excluded from the compendium, so it appears as the existing
  "Redacted item" placeholder. Every bar is one level. The slider reads one
  level's chance out in words, and the table under the chart lists every level.
-->
<script lang="ts">
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import { formatPercent } from "$lib/utils/format";
  import type { EntryChanceRow } from "./model";

  let {
    rows,
    initialLevel,
    class: className = "",
  }: {
    rows: readonly EntryChanceRow[];
    /** The level the readout starts on. */
    initialLevel: number;
    class?: string;
  } = $props();

  const first = $derived(rows[0].level);
  const last = $derived(rows[rows.length - 1].level);
  const top = $derived(Math.max(...rows.map((row) => row.chance)));
  // Whole-percent gridlines up to the first one above the highest chance.
  const scale = $derived(Math.ceil(top * 100 + 1e-9) / 100 + 0.02);
  const gridlines = $derived(
    [0.05, 0.1, 0.15].filter((value) => value < scale && value <= top + 0.05),
  );

  const firstChance = $derived(rows.find((row) => row.chance > 0));
  const plateau = $derived(rows.find((row) => row.chance >= top - 1e-9));
  // A level where the chance's slope changes, so the chart labels the bends too.
  const bends = $derived(
    rows.filter((row, index) => {
      const before = rows[index - 1];
      const after = rows[index + 1];
      if (!before || !after || row.chance <= 0 || row.chance >= top - 1e-9)
        return false;
      const rising = row.chance - before.chance;
      const next = after.chance - row.chance;
      return Math.abs(rising - next) > 1e-6;
    }),
  );
  const labelled = $derived(
    new Set(
      [
        firstChance?.level,
        plateau?.level,
        ...bends.map((row) => row.level),
      ].filter((level): level is number => level !== undefined),
    ),
  );

  let chosen = $state<number | null>(null);
  const level = $derived(
    Math.min(last, Math.max(first, chosen ?? initialLevel)),
  );
  const chance = $derived(rows.find((row) => row.level === level)?.chance ?? 0);
  const percent = (value: number) =>
    formatPercent(value, { decimals: 1, trailingZeros: true });
  const wholePercent = (value: number) =>
    formatPercent(value, { decimals: Number.isInteger(value * 100) ? 0 : 1 });
</script>

<figure class="space-y-3 {className}">
  <figcaption class="text-sm text-pretty text-muted-foreground">
    How likely an elite, non-boss monster of each level is to drop
    <span class="whitespace-nowrap"
      >1 <RedactedEntry kind="item" slot={false} /></span
    >.
  </figcaption>

  <div class="flex gap-2">
    <div
      class="relative h-44 w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      aria-hidden="true"
    >
      {#each gridlines as value (value)}
        <span
          class="absolute right-0 translate-y-1/2"
          style:bottom={`${(value / scale) * 100}%`}>{wholePercent(value)}</span
        >
      {/each}
      <span class="absolute right-0 bottom-0 translate-y-1/2">0%</span>
    </div>
    <div class="min-w-0 flex-1">
      <div
        class="relative h-44 border-b border-l"
        role="img"
        aria-label={`Drop chance by elite level, ${first} to ${last}. See the table below for every value.`}
      >
        {#each gridlines as value (value)}
          <div
            class="absolute inset-x-0 border-t border-dashed border-border/70"
            style:bottom={`${(value / scale) * 100}%`}
          ></div>
        {/each}
        <div class="absolute inset-0 flex items-end">
          {#each rows as row (row.level)}
            <div
              class="relative flex h-full flex-1 items-end justify-center"
              title={`Level ${row.level}: ${percent(row.chance)}`}
            >
              <div
                class="w-[70%] rounded-t-sm {row.level === level
                  ? 'bg-amber-500'
                  : 'bg-primary/55'}"
                style:height={`${(row.chance / scale) * 100}%`}
              ></div>
              {#if labelled.has(row.level)}
                <span
                  class="absolute text-[11px] font-medium tabular-nums text-foreground {row.chance <
                  top - 1e-9
                    ? '-translate-x-[85%]'
                    : '-translate-x-1/2'}"
                  style:left="50%"
                  style:bottom={`calc(${(row.chance / scale) * 100}% + 2px)`}
                  >{wholePercent(row.chance)}</span
                >
              {/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="flex" aria-hidden="true">
        {#each rows as row (row.level)}
          <div
            class="relative flex-1 pt-1 text-center text-[11px] tabular-nums text-muted-foreground"
          >
            {#if row.level % 5 === 0}
              <span class="absolute left-1/2 -translate-x-1/2">{row.level}</span
              >
            {/if}
          </div>
        {/each}
      </div>
      <p class="mt-5 text-center text-xs text-muted-foreground">
        Monster level
      </p>
    </div>
  </div>

  <div class="js-only rounded-md border bg-muted/30 p-3">
    <p class="text-sm">
      <span class="font-medium text-foreground">Monster Level {level}:</span>
      <span class="tabular-nums" aria-live="polite">
        {#if chance === 0}
          no chance
        {:else}
          {percent(chance)}
        {/if}
      </span>
    </p>
    <RangeSlider
      value={level}
      min={first}
      max={last}
      label="Monster level"
      onchange={(value) => (chosen = value)}
    />
  </div>

  <details class="text-sm">
    <summary class="cursor-pointer text-muted-foreground hover:text-foreground"
      >Chance at every level</summary
    >
    <div class="mt-2 max-h-64 overflow-auto rounded-md border">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-card"
          ><tr class="border-b"
            ><th class="p-2 text-left font-medium text-foreground"
              >Monster Level</th
            ><th class="p-2 text-right font-medium text-foreground">Chance</th
            ></tr
          ></thead
        >
        <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
          {#each rows as row (row.level)}
            <tr class="border-b last:border-0"
              ><td class="p-2 tabular-nums">{row.level}</td><td
                class="p-2 text-right tabular-nums">{percent(row.chance)}</td
              ></tr
            >
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</figure>
