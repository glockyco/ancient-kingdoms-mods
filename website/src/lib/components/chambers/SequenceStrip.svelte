<!--
  The three chambers of a run in one row, and the draw the first two chambers share.
  The kinds and their counts come from the export. The last chamber is always the
  final guardian.
-->
<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { TRIAL_BY_KIND, type TrialKind } from "./trials";
  import type { TrialDraw } from "./model";

  let {
    draws,
    roomCount,
    finalKind,
    class: className = "",
  }: {
    draws: readonly TrialDraw[];
    roomCount: number;
    finalKind: string;
    class?: string;
  } = $props();

  const slots = $derived(draws.reduce((sum, draw) => sum + draw.count, 0));
  const chambers = $derived(
    Array.from({ length: roomCount }, (_, index) => index + 1),
  );
  const final = $derived(TRIAL_BY_KIND[finalKind as TrialKind]);
  const label = (draw: TrialDraw) =>
    TRIAL_BY_KIND[draw.kind as TrialKind].label;
  // A kind with more than one slot can be drawn for both chambers.
  const repeating = $derived(draws.filter((draw) => draw.count > 1).map(label));
  const single = $derived(draws.filter((draw) => draw.count === 1).map(label));
  const list = (items: readonly string[]) =>
    items.length < 2
      ? items.join("")
      : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
</script>

<div class="space-y-3 {className}">
  <ol class="flex flex-wrap items-center gap-x-2 gap-y-2">
    {#each chambers as chamber (chamber)}
      <li class="flex items-center gap-2">
        {#if chamber > 1}
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        {/if}
        <span
          class="rounded-full border px-3 py-1 text-sm {chamber === roomCount
            ? 'border-amber-500/60 bg-amber-500/10 text-foreground'
            : 'bg-card text-foreground'}"
        >
          <span class="font-semibold">Chamber {chamber}/{roomCount}</span>
          <span class="text-muted-foreground">
            {chamber === roomCount ? final.label : "Trial"}</span
          >
        </span>
      </li>
    {/each}
  </ol>
  <!-- Source: server-scripts/MadMageTowerRules.cs:Trials — chambers 1 and 2 take the first two entries of one shuffled bag of seven, so a kind with two entries can repeat. The last chamber is always the final guardian. -->
  <p class="text-muted-foreground">
    Chambers 1 and 2 each get a trial from the same {slots} slots: {draws
      .map((draw) => `${draw.count}\u00a0${label(draw)}`)
      .join(", ")}. {list(repeating)} can come up in both chambers. {list(
      single,
    )} come up at most once.
  </p>
</div>
