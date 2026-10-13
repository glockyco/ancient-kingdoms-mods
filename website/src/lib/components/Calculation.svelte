<!--
  A game calculation as named steps, with a worked example the reader can rerun
  with their own numbers.

  Each step names the quantity it produces in game terms and says how the game
  computes it in words: real stat names, never single letters or code names;
  percentages for multipliers; "at least" and "at most" for bounds. Rounding is
  a field, so every block words it the same way, and the page defines "rounded"
  once, at its first use. The example is evaluated with the game's arithmetic,
  never typed by hand. Without JavaScript the example stays static.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import {
    forget,
    loadRemembered,
    remember,
    rememberedValue,
  } from "$lib/calculation/remembered.svelte";
  import type {
    Calculation,
    CalculationInput,
    CalculationStep,
  } from "$lib/types/calculation";

  let { calculation }: { calculation: Calculation } = $props();

  const ROUNDING_TEXT = {
    nearest: "rounded",
    down: "rounded down",
    up: "rounded up",
  } as const;

  const inputs = $derived(calculation.inputs ?? []);
  // Values this block's reader typed that are not character stats.
  let situational = $state<Record<string, number>>({});
  let editing = $state(false);

  const values = $derived(
    Object.fromEntries(inputs.map((input) => [input.key, valueOf(input)])),
  );
  const example = $derived(calculation.example?.(values));
  const changed = $derived(
    inputs.some((input) => values[input.key] !== input.value),
  );
  const roundsToNearest = $derived(
    calculation.steps.some((step) => step.rounding === "nearest"),
  );

  onMount(loadRemembered);

  function valueOf(input: CalculationInput): number {
    const own = input.remember
      ? rememberedValue(input.key)
      : situational[input.key];
    return own === undefined ? input.value : clamp(input, own);
  }

  function clamp(input: CalculationInput, value: number): number {
    return Math.min(input.max, Math.max(input.min, value));
  }

  function shown(input: CalculationInput): number {
    const value = values[input.key];
    // Strip float noise such as 62.50000000000001 without hiding real fractions.
    return input.unit === "%" ? Number((value * 100).toFixed(4)) : value;
  }

  function toValue(input: CalculationInput, typed: number): number {
    return input.unit === "%" ? typed / 100 : typed;
  }

  // While typing, apply only in-range values: clamping each keystroke would
  // turn the "1" of "10" into the minimum before the "0" arrives.
  function preview(input: CalculationInput, typed: number) {
    if (!Number.isFinite(typed)) return;
    const value = toValue(input, typed);
    if (value === clamp(input, value)) update(input, value);
  }

  function commit(input: CalculationInput, field: HTMLInputElement) {
    const typed = field.valueAsNumber;
    if (Number.isFinite(typed))
      update(input, clamp(input, toValue(input, typed)));
    field.value = String(shown(input));
  }

  function update(input: CalculationInput, value: number) {
    if (input.remember) remember(input.key, value);
    else situational = { ...situational, [input.key]: value };
  }

  function reset() {
    situational = {};
    for (const input of inputs) if (input.remember) forget(input.key);
  }

  function describe(step: CalculationStep): string {
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
  {#if calculation.note}
    <p class="text-muted-foreground">{calculation.note}</p>
  {/if}
  {#if example}
    <div class="space-y-2 border-t border-border/60 pt-3">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p class="text-muted-foreground">
          <span class="font-medium text-foreground"
            >{changed ? "Your numbers" : "Example"}</span
          >
          {#if !editing}
            {#each example.given as input (input)}
              <span aria-hidden="true" class="mx-1.5">·</span><span
                class="sr-only"
                >,
              </span>{input}
            {/each}
          {/if}
        </p>
        {#if inputs.length > 0}
          <div class="js-only ml-auto flex gap-1">
            {#if changed}
              <Button variant="ghost" size="sm" onclick={reset}>Reset</Button>
            {/if}
            <Button
              variant="outline"
              size="sm"
              aria-expanded={editing}
              onclick={() => (editing = !editing)}
              >{editing ? "Done" : "Use your numbers"}</Button
            >
          </div>
        {/if}
      </div>
      {#if editing}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each inputs as input (input.key)}
            <label class="space-y-1">
              <span class="block text-muted-foreground"
                >{input.label}{input.unit ? ` (${input.unit})` : ""}</span
              >
              {#if input.options || input.choices}
                <select
                  class="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                  value={values[input.key]}
                  onchange={(event) =>
                    update(
                      input,
                      clamp(input, Number(event.currentTarget.value)),
                    )}
                >
                  {#if input.choices}
                    {#each input.choices as choice (choice.value)}
                      <option value={choice.value}>{choice.label}</option>
                    {/each}
                  {:else}
                    {#each input.options ?? [] as option (option)}
                      <option value={option}>{option}</option>
                    {/each}
                  {/if}
                </select>
              {:else}
                <Input
                  type="number"
                  inputmode="decimal"
                  min={input.unit === "%" ? input.min * 100 : input.min}
                  max={input.unit === "%" ? input.max * 100 : input.max}
                  step={input.unit === "%" ? "any" : input.step}
                  value={shown(input)}
                  oninput={(event) =>
                    preview(input, event.currentTarget.valueAsNumber)}
                  onchange={(event) => commit(input, event.currentTarget)}
                />
              {/if}
            </label>
          {/each}
        </div>
      {/if}
      <p class="font-semibold text-foreground" aria-live="polite">
        {example.result}
      </p>
      {#each example.working as line (line)}
        <p class="text-muted-foreground">{line}</p>
      {/each}
    </div>
  {/if}
  {#if roundsToNearest}
    <RoundingDefinition />
  {/if}
</div>
