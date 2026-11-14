<!--
  The two character values every scaling panel on the page reads: the level the
  character enters at and its total veteran points. Both are numbers the
  character window shows. Veteran points are shared with every other
  calculation on the site, so a value set here shows there too.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { loadRemembered } from "$lib/calculation/remembered.svelte";
  import NumberField from "$lib/components/NumberField.svelte";
  import type { Planner } from "./planner.svelte";

  let { planner, class: className = "" }: { planner: Planner; class?: string } =
    $props();

  onMount(loadRemembered);
</script>

<div
  class="rounded-lg border bg-card p-4 {className}"
  role="group"
  aria-label="Your entry"
>
  <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
    <NumberField
      label="Entry Level"
      hint={`${planner.minimumLevel} - ${planner.maximumLevel}`}
      value={planner.entryLevel}
      min={planner.minimumLevel}
      max={planner.maximumLevel}
      onchange={(value) => planner.setEntryLevel(value)}
    />
    <NumberField
      label="Total Veteran Points"
      hint={`0 - ${planner.maximumVeteranPoints}`}
      value={planner.veteranPoints}
      min={0}
      max={planner.maximumVeteranPoints}
      onchange={(value) => planner.setVeteranPoints(value)}
    />
  </div>
  <p class="mt-4 text-xs text-muted-foreground">
    Find both in the character window: your level, and the VT number next to it,
    as in "Level 50 (VT 20)". Enter 0 if no VT shows.
  </p>
  {#if planner.error}
    <p class="mt-2 text-xs text-destructive" role="alert">
      The numbers for {planner.veteranPoints} veteran points could not be loaded.
      The panels still show {planner.view.veteranPoints}.
    </p>
  {/if}
</div>
