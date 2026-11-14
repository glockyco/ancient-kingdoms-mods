<!--
  The run's one timer. It starts when chamber 1 opens and covers all three chambers, so
  the bar has no per-chamber boundaries to show. The marks read at five-minute steps from
  the exported duration.
-->
<script lang="ts">
  import DoorOpen from "@lucide/svelte/icons/door-open";
  import Flag from "@lucide/svelte/icons/flag";
  import Hourglass from "@lucide/svelte/icons/hourglass";

  let {
    seconds,
    roomCount,
    class: className = "",
  }: { seconds: number; roomCount: number; class?: string } = $props();

  const clock = (value: number) =>
    `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  const marks = $derived(
    Array.from(
      { length: Math.floor(seconds / 300) + 1 },
      (_, index) => index * 300,
    ),
  );
</script>

<div class="space-y-2 {className}">
  <div
    class="flex items-center justify-between gap-3 text-xs text-muted-foreground"
  >
    <span class="flex items-center gap-1.5"
      ><DoorOpen class="size-3.5" aria-hidden="true" /> Chamber 1 opens</span
    >
    <span class="hidden text-center sm:block"
      >One timer for all {roomCount} chambers</span
    >
    <span class="flex items-center gap-1.5"
      ><Hourglass class="size-3.5" aria-hidden="true" /> Time is up</span
    >
  </div>
  <div
    class="relative h-4 overflow-hidden rounded-full bg-muted"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/70 via-amber-500/70 to-red-500/70"
    ></div>
  </div>
  <div
    class="relative h-5 text-xs tabular-nums text-muted-foreground"
    aria-hidden="true"
  >
    {#each marks as mark, index (mark)}
      <span
        class="absolute top-0 {index === 0
          ? ''
          : index === marks.length - 1
            ? '-translate-x-full'
            : '-translate-x-1/2'}"
        style:left={`${(mark / seconds) * 100}%`}>{clock(mark)}</span
      >
    {/each}
  </div>
  <p class="text-sm text-muted-foreground sm:hidden">
    One timer for all {roomCount} chambers.
  </p>
  <p class="sr-only">
    The timer starts at 0:00 when chamber 1 opens and ends the run at {clock(
      seconds,
    )}.
  </p>
  <!-- Source: server-scripts/MadMageTower.cs:StartTrial,Expired — the timer starts when chamber 1 begins and stops ending the run once the guardian's reward has been given. -->
  <p class="flex items-start gap-2 text-sm">
    <Flag class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span
      >Kill the final guardian before {clock(seconds)}. After it dies the timer
      no longer ends your run.</span
    >
  </p>
</div>
