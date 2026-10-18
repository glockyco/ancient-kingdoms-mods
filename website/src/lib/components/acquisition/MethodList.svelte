<script lang="ts">
  import type { MethodView } from "$lib/acquisition/types";
  import MethodCards from "./MethodCards.svelte";
  import ScrollRegion from "./ScrollRegion.svelte";
  import {
    methodLabel,
    methodGroupKey,
    quantityText,
    PROBABILITY_EVENT_LABELS,
    type DisplayItems,
  } from "./display";
  let {
    methods,
    items = {},
    names = {},
    selectedItemId,
    parentScroll = false,
  }: {
    methods: readonly MethodView[];
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
    selectedItemId?: string;
    parentScroll?: boolean;
  } = $props();
  const groups = $derived([...Map.groupBy(methods, methodGroupKey).values()]);
</script>

{#snippet alternatives(
  group: readonly MethodView[],
  withinScrollRegion: boolean,
)}
  {#each group as method (method.methodId)}
    {@const inputNames = method.costGroups
      .flatMap((cost) => cost.inputs)
      .filter((input) => input.item_id)
      .map(
        (input) =>
          items[input.item_id!]?.name ??
          names[input.item_id!] ??
          input.item_id!.replaceAll("_", " "),
      )}
    {@const providerNames = [
      ...new Set(method.providers.map((provider) => provider.name)),
    ]}
    {@const zoneNames = [
      ...new Set(
        method.providers
          .map((provider) => provider.location?.zoneId)
          .filter((id): id is string => !!id)
          .map((id) => names[`zones:${id}`] ?? names[id])
          .filter(Boolean),
      ),
    ]}
    {@const output =
      method.outputs.find((output) => output.item_id === selectedItemId) ??
      method.outputs[0]}
    {@const chance = method.probabilityResults.find(
      (result) =>
        result.probability !== null &&
        result.probability !== 1 &&
        (!selectedItemId ||
          (result.target.kind === "item" &&
            result.target.itemId === selectedItemId)),
    )}
    {@const costs =
      (method.kind === "vendor" || method.kind === "blessing") &&
      method.costGroups.length === 1 &&
      method.costGroups[0].selection_rule === "always"
        ? method.costGroups[0].inputs
        : []}
    <details class="border-b py-2 last:border-b-0">
      <summary class="cursor-pointer">
        <span>
          {#if method.kind === "essence"}{inputNames.join(" + ")}
          {:else if providerNames.length === 1}{providerNames[0]}
          {:else}{methodLabel(method)}{/if}
        </span>
        {#if zoneNames.length}<span class="text-sm text-muted-foreground"
            >&#32;·&#32;{zoneNames.join(", ")}</span
          >{/if}
        {#if costs.length}
          <span class="text-sm text-muted-foreground">
            &#32;-&#32;{costs
              .map((input) =>
                input.resource_kind === "gold"
                  ? `${input.amount.toLocaleString("en-US", { maximumFractionDigits: 20 })} gold`
                  : `${input.withheld ? "Unpublished item" : (items[input.item_id ?? ""]?.name ?? names[input.item_id ?? ""] ?? input.item_id?.replaceAll("_", " "))} ×${input.amount}`,
              )
              .join(" + ")}{method.kind === "blessing" ? " per rune" : ""}
          </span>
        {:else if chance}
          <span class="text-sm text-muted-foreground">
            &#32;-&#32;{(chance.probability! * 100).toLocaleString("en-US", {
              maximumSignificantDigits: 5,
            })}% per {PROBABILITY_EVENT_LABELS[chance.event]}
          </span>
        {:else if output && (!selectedItemId || output.quantity.kind !== "exact" || output.quantity.value !== 1)}
          <span class="text-sm text-muted-foreground">
            {#if output.quantity.kind !== "unknown"}
              - ×{quantityText(output.quantity)}{/if}
            {#if !selectedItemId}
              {output.resource_kind === "gold"
                ? "gold"
                : (items[output.item_id ?? ""]?.name ??
                  names[output.item_id ?? ""] ??
                  output.item_id?.replaceAll("_", " "))}
            {/if}
          </span>
        {/if}
      </summary>
      <div class="mt-3">
        <MethodCards
          methods={[method]}
          {items}
          {names}
          {selectedItemId}
          parentScroll={withinScrollRegion}
        />
      </div>
    </details>
  {/each}
{/snippet}

<div class="space-y-3">
  {#each groups as group (methodGroupKey(group[0]))}
    {#if group.length === 1 || (group.length <= 6 && !["vendor", "blessing", "essence"].includes(group[0].kind))}
      <MethodCards
        methods={group}
        {items}
        {names}
        {selectedItemId}
        {parentScroll}
      />
    {:else}
      <section class="rounded-md border bg-muted/30 p-4 space-y-2">
        <h3 class="font-semibold">{methodLabel(group[0])}</h3>
        {#if group[0].kind === "essence"}
          <p class="text-sm text-muted-foreground">
            Exchange one item with durability remaining.
          </p>
        {/if}
        {#if group.length > 6}
          <details>
            <summary
              class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
            >
              {group[0].kind === "essence"
                ? `Eligible items (${group.length.toLocaleString("en-US")})`
                : `Show all ${group.length.toLocaleString("en-US")} sources`}
            </summary>
            <ScrollRegion
              className="mt-3 max-h-[32rem] overflow-y-auto pr-2"
              label="Source alternatives"
              {parentScroll}>{@render alternatives(group, true)}</ScrollRegion
            >
          </details>
        {:else}
          {@render alternatives(group, parentScroll)}
        {/if}
      </section>
    {/if}
  {/each}
</div>
