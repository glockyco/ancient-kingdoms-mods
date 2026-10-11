<!--
  A game calculation as named steps, with an optional worked example.

  Each step names the quantity it produces in game terms and says how the game
  computes it in words: real stat names, never single letters or code names;
  percentages for multipliers; "at least" and "at most" for bounds. Rounding is
  a field, not prose, so every block words it the same way and defines
  "rounded" once. The example is evaluated with the game's arithmetic, never
  typed by hand.
-->
<script lang="ts">
  import type { Calculation } from "$lib/types/calculation";

  let { calculation }: { calculation: Calculation } = $props();

  const ROUNDING_TEXT = {
    nearest: "rounded",
    down: "rounded down",
    up: "rounded up",
  } as const;

  const roundsToNearest = $derived(
    calculation.steps.some((step) => step.rounding === "nearest"),
  );

  function describe(step: Calculation["steps"][number]): string {
    return [
      step.expression,
      step.rounding ? ROUNDING_TEXT[step.rounding] : null,
      step.limit ?? null,
    ]
      .filter((part) => part !== null)
      .join(", ");
  }
</script>

<div class="space-y-3 rounded-md border border-border/60 bg-background/40 p-4">
  <dl
    class="grid gap-x-6 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-y-2"
  >
    {#each calculation.steps as step (step.name)}
      <dt class="font-medium text-foreground">{step.name}</dt>
      <dd class="mb-2 last:mb-0 sm:mb-0">{describe(step)}</dd>
    {/each}
  </dl>
  {#if calculation.example}
    {@const example = calculation.example}
    <div class="space-y-1 border-t border-border/60 pt-3">
      <p class="text-muted-foreground">
        <span class="font-medium text-foreground">Example</span>
        {#each example.given as input (input)}
          <span aria-hidden="true" class="mx-1.5">·</span><span class="sr-only"
            >,
          </span>{input}
        {/each}
      </p>
      <p class="font-semibold text-foreground">{example.result}</p>
      {#each example.working as line (line)}
        <p class="text-muted-foreground">{line}</p>
      {/each}
    </div>
  {/if}
  {#if roundsToNearest}
    <p class="text-muted-foreground">
      Rounded means to the nearest whole number. Exact halves go to the even
      number, so 2.5 becomes 2.
    </p>
  {/if}
</div>
