<script lang="ts">
  import type { MethodView } from "$lib/acquisition/types";
  import { CODE_DEFINED_RULES } from "$lib/acquisition/rules";
  import ItemLink from "../ItemLink.svelte";
  import ProviderLocations from "./ProviderLocations.svelte";
  import Requirements from "./Requirements.svelte";
  import MethodList from "./MethodList.svelte";
  import {
    methodLabel,
    quantityText,
    lifecycleText,
    recipeHref,
    deliveryText,
    probabilityScenarioText,
    expectedQuantityText,
    PROBABILITY_EVENT_LABELS,
    methodOutcomes,
    methodPresentationRequirements,
    costTimingText,
    costLabel,
    type DisplayItems,
  } from "./display";
  let {
    methods,
    items = {},
    names: suppliedNames = {},
    selectedItemId,
    parentScroll = false,
  }: {
    methods: readonly MethodView[];
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
    selectedItemId?: string;
    parentScroll?: boolean;
  } = $props();
  const names = $derived({
    ...Object.fromEntries(
      Object.entries(items).map(([id, item]) => [id, item.name]),
    ),
    ...suppliedNames,
  });
</script>

<div class="space-y-3">
  {#each methods as method (method.methodId)}
    {@const outcomes = methodOutcomes(method).filter(
      (outcome) =>
        (!selectedItemId || outcome.itemId === selectedItemId) &&
        (!selectedItemId ||
          outcome.delivery !== "inventory" ||
          outcome.outputs.some(
            (output) =>
              output.quantity.kind !== "unknown" ||
              output.requirements.some(
                (root) => !method.requirements.includes(root),
              ),
          ) ||
          outcome.probabilities.some(
            (result) =>
              (result.probability !== null &&
                (result.probability !== 1 ||
                  result.quantityMeaning === "at_least_one")) ||
              !!expectedQuantityText(result),
          )),
    )}
    {@const commonDelivery = outcomes[0]?.delivery}
    {@const sameDelivery = outcomes.every(
      (outcome) => outcome.delivery === commonDelivery,
    )}
    {@const scenarioResult = method.probabilityResults.find(
      (result) =>
        (!selectedItemId ||
          (result.target.kind === "item" &&
            result.target.itemId === selectedItemId)) &&
        result.probability !== null &&
        (result.probability !== 1 || result.quantityMeaning === "at_least_one"),
    )}
    {@const subjectName =
      method.kind === "kill"
        ? (names[`monsters:${method.detail.monster_id}`] ??
          names[String(method.detail.monster_id)])
        : method.kind === "gather"
          ? (names[`gathering_resources:${method.detail.resource_id}`] ??
            names[String(method.detail.resource_id)])
          : method.kind === "world_chest"
            ? "Chest"
            : undefined}
    {@const visibleProviders = method.providers.filter(
      (provider) =>
        provider.ref.kind !== "items" ||
        !provider.requirements.every((root) =>
          method.requirements.includes(root),
        ) ||
        !method.costGroups.some((group) =>
          group.inputs.some(
            (input) =>
              !input.withheld &&
              input.item_id === provider.ref.id &&
              input.amount > 0,
          ),
        ),
    )}
    <article class="rounded-md border bg-muted/30 p-4 space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="font-semibold">
          {#if recipeHref(method)}<a
              class="text-blue-600 hover:underline dark:text-blue-400"
              href={recipeHref(method)}>{methodLabel(method)}</a
            >{:else}{methodLabel(method)}{/if}
        </h3>
        {#if lifecycleText(method.repeatability)}<span
            class="text-sm text-muted-foreground"
            >{lifecycleText(method.repeatability)}</span
          >{/if}
      </div>
      {#if method.kind === "kill"}<a
          class="text-blue-600 hover:underline dark:text-blue-400"
          href="/monsters/{method.detail.monster_id}"
          >{names[`monsters:${method.detail.monster_id}`] ??
            names[String(method.detail.monster_id)] ??
            "Monster details"}</a
        >{/if}
      {#if method.kind === "quest_accept" || method.kind === "quest_complete"}<a
          class="text-blue-600 hover:underline dark:text-blue-400"
          href="/quests/{method.detail.quest_id}"
          >{names[`quests:${method.detail.quest_id}`] ??
            names[String(method.detail.quest_id)] ??
            "Quest details"}</a
        >{/if}
      {#if method.kind === "gather"}<a
          class="text-blue-600 hover:underline dark:text-blue-400"
          href="/gather-items/{method.detail.resource_id}"
          >{names[`gathering_resources:${method.detail.resource_id}`] ??
            names[String(method.detail.resource_id)] ??
            "Resource details"}</a
        >{/if}
      {#if visibleProviders.length}<ProviderLocations
          providers={visibleProviders}
          {names}
          {subjectName}
          sharedRequirements={method.requirements}
          {parentScroll}
        />{/if}
      {#each method.homeProviders as home (home.id)}
        <div class="space-y-1">
          <p>
            {method.providers.length ? "Or use " : "Use "}<a
              class="text-blue-600 hover:underline dark:text-blue-400"
              href="/items/{home.structure_item_id}"
              >{items[String(home.structure_item_id)]?.name ??
                "home workstation"}</a
            > in your house.
          </p>
        </div>
      {/each}
      {#if outcomes.length}
        <div class="space-y-2">
          <h4 class="text-sm text-muted-foreground">
            {sameDelivery && commonDelivery === "corpse"
              ? "Loot"
              : sameDelivery && commonDelivery === "quest_progress"
                ? "Quest progress"
                : sameDelivery && commonDelivery === "keyring"
                  ? "Key-ring rewards"
                  : "Rewards"}
          </h4>
          {#each outcomes as outcome (outcome.key)}
            <div class="space-y-1">
              <div class="flex flex-wrap items-baseline gap-x-2">
                {#if outcome.resourceKind === "gold"}<span>Gold</span>
                {:else if outcome.itemId}
                  {#if outcome.itemId !== selectedItemId}
                    <ItemLink
                      itemId={outcome.itemId}
                      itemName={items[outcome.itemId]?.name ??
                        names[outcome.itemId] ??
                        outcome.itemId.replaceAll("_", " ")}
                      imageAvailable={items[outcome.itemId]?.icon_path}
                    />
                  {/if}
                {:else}<span>Unpublished item</span>{/if}
                {#if outcome.outputs.length === 1}
                  {@const output = outcome.outputs[0]}
                  {#if output.quantity.kind !== "unknown"}<span
                      >×{quantityText(output.quantity)}</span
                    >{/if}
                  {#if output.delivery === "equipment" || (!sameDelivery && output.delivery !== "inventory")}
                    <span class="text-sm text-muted-foreground"
                      >{deliveryText(output.delivery, output.slot)}</span
                    >
                  {:else if sameDelivery && output.delivery === "placed_structure"}
                    <span class="text-sm text-muted-foreground"
                      >{deliveryText(output.delivery, output.slot)}</span
                    >
                  {/if}
                {/if}
                {#each outcome.probabilities as result (`${result.outcomeKey}:${result.event}`)}
                  {@const average = expectedQuantityText(result)}
                  {#if result.probability !== null && (result.probability !== 1 || result.quantityMeaning === "at_least_one")}
                    <span class="text-sm"
                      >{(result.probability * 100).toLocaleString("en-US", {
                        maximumSignificantDigits: 5,
                      })}% per {PROBABILITY_EVENT_LABELS[
                        result.event
                      ]}{#if average}.&#32;{average}{/if}</span
                    >
                  {:else if average}<span class="text-sm">{average}</span>{/if}
                {/each}
              </div>
              {#each outcome.outputs as output (output.id)}
                {#if outcome.outputs.length > 1}
                  <div class="flex flex-wrap items-baseline gap-x-2">
                    {#if output.quantity.kind !== "unknown"}<span
                        >×{quantityText(output.quantity)}</span
                      >{/if}
                    {#if output.delivery !== "inventory"}<span
                        class="text-sm text-muted-foreground"
                        >{deliveryText(output.delivery, output.slot)}</span
                      >{/if}
                  </div>
                {/if}
                <Requirements
                  roots={output.requirements.filter(
                    (root) => !method.requirements.includes(root),
                  )}
                  {names}
                />
              {/each}
            </div>
          {/each}
          {#if scenarioResult && method.probabilityFactors.length}
            <p class="text-sm text-muted-foreground">
              {probabilityScenarioText(
                scenarioResult,
                method.probabilityFactors,
              )}
            </p>
          {/if}
        </div>
      {/if}
      {#each method.costGroups as group (group.id)}
        {@const timing = costTimingText(group, method)}
        <div class="space-y-1">
          <h4 class="text-sm text-muted-foreground">
            {costLabel(group, method)}
          </h4>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            {#each group.inputs as input (input.id)}
              <span
                >{#if input.resource_kind === "gold"}Gold{:else if input.item_id}<ItemLink
                    itemId={input.item_id}
                    itemName={items[input.item_id]?.name ??
                      input.item_id.replaceAll("_", " ")}
                    imageAvailable={items[input.item_id]?.icon_path}
                  />{:else}Unpublished required item{/if}&#32;×{input.amount}</span
              >
            {/each}
          </div>
          {#if timing}<p class="text-sm text-muted-foreground">{timing}</p>{/if}
        </div>
      {/each}
      <Requirements roots={methodPresentationRequirements(method)} {names} />
      {#each method.effects as effect (effect.id)}<p class="text-sm">
          Reputation with {names[`factions:${effect.faction_id}`] ??
            names[String(effect.faction_id)] ??
            String(effect.faction_id).replaceAll("_", " ")}: {Number(
            effect.delta,
          ) > 0
            ? "+"
            : ""}{effect.delta} ({String(effect.event).replaceAll("_", " ")}).
        </p>{/each}
      {#if method.kind === "cap_xp"}
        <p class="text-sm text-muted-foreground">
          Once you have {CODE_DEFINED_RULES.capXp.minimumTotalVeteranPoints} veteran
          points, earn another {CODE_DEFINED_RULES.capXp.cycleAtBoundary.toLocaleString(
            "en-US",
          )} XP for this reward. The XP is spent even if a full inventory prevents
          you from receiving the item.
        </p>
      {/if}
      {#if method.setupMethod}<details>
          <summary class="cursor-pointer"
            >Event setup, charged once per activation</summary
          >
          <div class="mt-2">
            <MethodList
              methods={[method.setupMethod]}
              {items}
              {names}
              {parentScroll}
            />
          </div>
        </details>{/if}
    </article>
  {/each}
</div>
