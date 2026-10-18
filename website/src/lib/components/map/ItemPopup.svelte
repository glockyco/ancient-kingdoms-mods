<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import AcquisitionMethods from "./AcquisitionMethods.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import {
    quantityText,
    useRoleLabel,
    additionalInspection,
    methodLabel,
    providerHref,
    recipeHref,
    expectedQuantityText,
    probabilityScenarioText,
    PROBABILITY_EVENT_LABELS,
    lifecycleText,
    acquisitionPlanNotes,
    ingredientQuantityText,
  } from "$lib/components/acquisition/display";
  import {
    loadItemPopupDetails,
    loadMapItems,
    type ItemPopupDetails,
    type PopupItem,
  } from "$lib/queries/popup";
  import {
    MAP_PROVIDER_CATEGORY,
    mapMethodIsVisible,
  } from "$lib/map/acquisition";
  import { browserAcquisitionQuery } from "$lib/acquisition/browser";
  import { expandAcquisition } from "$lib/acquisition/expand";
  import type {
    AcquisitionTree,
    InspectedOutcome,
    ProviderView,
    LocationRef,
  } from "$lib/acquisition/types";
  import type { MethodView } from "$lib/acquisition/types";
  import { getQualityTextColorClass, formatPercent } from "$lib/utils/format";
  import { buildEntityUrl } from "$lib/map/url-state";

  interface Props {
    itemId: string;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectLocation: (provider: LocationRef) => void;
    onSelectQuest: (id: string) => void;
    onSelectItem: (id: string) => void;
    mode?: "card" | "drawer";
  }
  let {
    itemId,
    onClose,
    onFocusClick,
    onSelectLocation,
    onSelectQuest,
    onSelectItem,
    mode = "card",
  }: Props = $props();
  let details = $state<ItemPopupDetails | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let requested = $state(1);
  let expansion = $state<AcquisitionTree | null>(null);
  let expanding = $state(false);
  let expansionError = $state<string | null>(null);
  let expandedItems = $state<Readonly<Record<string, PopupItem>>>({});
  const inspection = $derived(
    details ? additionalInspection(details.sources, details.usages) : null,
  );
  const isPack = $derived(
    details?.model.entities.get("items")?.get(itemId)?.item_type === "pack",
  );
  function expansionProviderLabel(
    provider: ProviderView,
    names: Readonly<Record<string, string>>,
  ): string {
    const zoneId = provider.location?.zoneId;
    const zone = zoneId ? names[`zones:${zoneId}`] : undefined;
    return zone ? `${provider.name} (${zone})` : provider.name;
  }
  function branchLabel(
    method: MethodView,
    names: Readonly<Record<string, string>>,
  ): string {
    const providers = method.providers;
    const locationLabel =
      providers.length === 1
        ? `: ${expansionProviderLabel(providers[0], names)}`
        : providers.length
          ? ` (${providers.length} locations)`
          : "";
    return `${methodLabel(method)}${locationLabel}${method.homeProviders.length ? " (at home)" : ""}`;
  }
  $effect(() => {
    const id = itemId;
    let cancelled = false;
    loading = true;
    error = null;
    details = null;
    expansion = null;
    requested = 1;
    expansionError = null;
    expandedItems = {};
    expanding = false;
    loadItemPopupDetails(id)
      .then((value) => {
        if (!cancelled) {
          details = value;
          if (!value) error = "Item not found";
        }
      })
      .catch(() => {
        if (!cancelled) error = "Refresh the page to try again.";
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });
  function selectProvider(provider: ProviderView) {
    onSelectLocation(provider.ref);
  }
  async function loadExpansion() {
    if (!Number.isInteger(requested) || requested < 1) return;
    const id = itemId;
    expanding = true;
    expansionError = null;
    try {
      const value = await expandAcquisition(browserAcquisitionQuery, {
        itemId: id,
        amount: requested,
        maxDepth: 8,
        maxNodes: 200,
      });
      const ids: string[] = [];
      const pending = [value];
      while (pending.length) {
        const node = pending.pop()!;
        ids.push(node.itemId);
        for (const branch of node.branches) {
          for (const home of branch.method.homeProviders)
            ids.push(home.structure_item_id);
          for (const ingredient of branch.ingredients) {
            if (ingredient.input.item_id) ids.push(ingredient.input.item_id);
            if (ingredient.acquisition) pending.push(ingredient.acquisition);
          }
        }
      }
      const items = await loadMapItems(ids);
      if (id === itemId) {
        expandedItems = items;
        expansion = value;
      }
    } catch {
      if (id === itemId)
        expansionError =
          "Could not load ingredients. Refresh the page to try again.";
    } finally {
      if (id === itemId) expanding = false;
    }
  }
</script>

{#snippet outcomes(title: string, values: readonly InspectedOutcome[])}
  {#if values.length && details}
    <section class="border-t pt-2">
      <h3 class="font-medium">{title}</h3>
      <div class="max-h-48 space-y-1 overflow-y-auto overscroll-contain pr-2">
        {#each values as outcome, index (index)}
          <div class="flex flex-wrap gap-x-2 text-sm">
            {#if outcome.itemId}<MapItemLink
                itemId={outcome.itemId}
                itemName={details.items[outcome.itemId]?.name ??
                  details.names[outcome.itemId] ??
                  "Item"}
                tooltipHtml={details.items[outcome.itemId]?.tooltipHtml}
                imageAvailable={details.items[outcome.itemId]?.iconPath}
                onSelect={onSelectItem}
              />{:else}<span>Unpublished outcome</span>{/if}
            {#if outcome.amount.kind === "exact"}<span
                >{outcome.amount.value} x</span
              >{:else if outcome.amount.kind === "range"}<span
                >{quantityText(outcome.amount)} units</span
              >{/if}
            {#if outcome.probability !== null && !(outcome.probability === 1 && outcome.amount.kind === "exact")}<span
                class="text-muted-foreground"
                >{formatPercent(outcome.probability, { decimals: 2 })}</span
              >{/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}
{/snippet}

{#snippet tree(node: AcquisitionTree)}
  <div class="space-y-2 border-l pl-2 text-sm">
    <MapItemLink
      itemId={node.itemId}
      itemName={expandedItems[node.itemId]?.name ??
        node.names[node.itemId] ??
        "Item"}
      tooltipHtml={expandedItems[node.itemId]?.tooltipHtml}
      imageAvailable={expandedItems[node.itemId]?.iconPath}
      onSelect={onSelectItem}
    /><span> x {node.amount}</span>
    {#if node.reason}<p class="text-muted-foreground">
        {node.reason === "cycle"
          ? "This ingredient leads back to an earlier item."
          : "Further ingredients are not expanded here."}
        <a href={node.inspectionLink} class="text-blue-400 underline"
          >Inspect item sources</a
        >.
      </p>{/if}
    {#each node.branches.filter( (branch) => mapMethodIsVisible(branch.method) ) as branch (branch.method.methodId)}
      {@const lifecycle = lifecycleText(branch.repeatability)}
      <details class="space-y-1">
        <summary class="cursor-pointer font-medium">
          {branchLabel(branch.method, node.names)}
        </summary>
        <div class="max-h-40 space-y-1 overflow-y-auto overscroll-contain">
          {#each branch.method.providers as provider (provider)}
            {@const category = MAP_PROVIDER_CATEGORY[provider.ref.kind]}
            <div>
              {#if category}<MapEntityLink
                  href={buildEntityUrl(provider.ref.id, category)}
                  onSelect={() => onSelectLocation(provider.ref)}
                  >{expansionProviderLabel(provider, node.names)}</MapEntityLink
                >{:else if providerHref(provider.ref)}<a
                  href={providerHref(provider.ref)}
                  class="text-blue-400 underline"
                  >{expansionProviderLabel(provider, node.names)}</a
                >{:else}<p>
                  {expansionProviderLabel(provider, node.names)}
                </p>{/if}
            </div>
          {/each}
          {#each branch.method.homeProviders as home (home)}
            <p>
              {branch.method.providers.length ? "Or use" : "Use"}
              <MapItemLink
                itemId={home.structure_item_id}
                itemName={expandedItems[home.structure_item_id]?.name ??
                  home.structure_item_id}
                tooltipHtml={expandedItems[home.structure_item_id]?.tooltipHtml}
                imageAvailable={expandedItems[home.structure_item_id]?.iconPath}
                onSelect={onSelectItem}
              /> in your house.
            </p>
          {/each}
        </div>
        {#if recipeHref(branch.method)}<a
            href={recipeHref(branch.method)}
            class="text-blue-400 underline">View recipe</a
          >{/if}
        {#each branch.method.probabilityResults.filter((result) => result.target.kind === "item" && result.target.itemId === node.itemId) as result (result)}
          {@const average = expectedQuantityText(result)}
          {@const showChance =
            result.probability !== null &&
            !(
              result.probability === 1 && branch.yieldedAmount.kind === "exact"
            )}
          {#if showChance || average}
            <p>
              {showChance
                ? `${formatPercent(result.probability!, {
                    decimals: 2,
                    preserveNonzero: true,
                  })} per ${PROBABILITY_EVENT_LABELS[result.event]}.${average ? ` ${average}` : ""}`
                : (average ?? "")}
            </p>
          {/if}
        {/each}
        {#each [...new Set(branch.method.probabilityResults
              .map( (result) => probabilityScenarioText(result, branch.method.probabilityFactors) )
              .filter(Boolean))] as note (note)}
          <p class="text-muted-foreground">{note}</p>
        {/each}
        {#if lifecycle}<p>{lifecycle}</p>{/if}
        {#each acquisitionPlanNotes(branch) as note (note)}
          <p>{note}</p>
        {/each}
        {#each branch.ingredients as ingredient (ingredient.input.id)}
          {#if ingredient.acquisition}{@render tree(
              ingredient.acquisition,
            )}{:else}
            {@const amount = ingredientQuantityText(branch, ingredient)}
            <p>
              {ingredient.input.withheld
                ? "Unpublished required item"
                : ingredient.input.resource_kind === "gold"
                  ? "Gold"
                  : (expandedItems[ingredient.input.item_id ?? ""]?.name ??
                    node.names[ingredient.input.item_id ?? ""] ??
                    "Item")}{#if amount}: {amount}{/if}
            </p>{/if}
        {/each}
      </details>
    {/each}
  </div>
{/snippet}

{#if loading}<PopupCard title="Loading..." {onClose} {mode}
    ><p>Loading item...</p></PopupCard
  >
{:else if error}<PopupCard title="Could not load item" {onClose} {mode}
    ><p class="text-destructive">{error}</p></PopupCard
  >
{:else if details}
  <PopupCard
    title={details.name}
    subtitle="Item"
    titleClass={getQualityTextColorClass(details.quality)}
    detailsUrl={`/items/${details.id}`}
    {onClose}
    {mode}
    onFocusClick={details.locations.length ? onFocusClick : undefined}
  >
    <h3 class="font-medium">Acquisition</h3>
    {#if !details.sources.hasKnownSource}<p
        class="text-sm text-muted-foreground"
      >
        {isPack && details.sources.inspection.offeredAssets.length
          ? "You receive the items inside, not the pack itself."
          : "No known source."}
      </p>{/if}
    <AcquisitionMethods
      data={details}
      {onSelectItem}
      onSelectProvider={selectProvider}
      selectedItemId={itemId}
    />
    {#if inspection?.offeredAssets.length}
      <h3 class="border-t pt-2 font-medium">Offers</h3>
      <AcquisitionMethods
        data={{
          ...details,
          methods: inspection.offeredAssets,
          requirements: [],
        }}
        {onSelectItem}
        onSelectProvider={selectProvider}
      />
    {/if}
    {#if inspection?.initiatingMemberships.length}
      <h3 class="border-t pt-2 font-medium">Using this carried item</h3>
      <AcquisitionMethods
        data={{
          ...details,
          methods: inspection.initiatingMemberships,
          requirements: [],
        }}
        {onSelectItem}
        onSelectProvider={selectProvider}
      />
    {/if}
    {@render outcomes("Fixed contents", inspection?.fixedContents ?? [])}
    {@render outcomes("Random rewards", inspection?.randomOutcomes ?? [])}
    {@render outcomes(
      "Portable chest outcomes",
      inspection?.portableChestOutcomes ?? [],
    )}
    {#if inspection?.randomOutcomes.length}<p
        class="text-sm text-muted-foreground"
      >
        One of these items is chosen for each reward.
      </p>{/if}
    {#if details.usages.length}
      <section class="space-y-2 border-t pt-2">
        <h3 class="font-medium">Used for</h3>
        <div class="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-2">
          {#each details.usages as use (use)}
            <div class="space-y-1 text-sm">
              {#if !use.method}
                <p>
                  {useRoleLabel(
                    use.role,
                    use.method,
                  )}{#if use.amount.kind !== "unknown"}
                    &#32;×{quantityText(use.amount)}{/if}
                </p>
              {/if}
              {#if !use.method && use.entity?.kind === "quest"}<MapEntityLink
                  href={buildEntityUrl(use.entity.id, "quest")}
                  onSelect={() => onSelectQuest(use.entity!.id)}
                  >{details.names[use.entity.id] ?? "Quest"}</MapEntityLink
                >{/if}
              <Requirements
                roots={use.requirements.filter(
                  (root) =>
                    !use.method?.requirements.some(
                      (methodRoot) =>
                        JSON.stringify(methodRoot) === JSON.stringify(root),
                    ),
                )}
                names={details.names}
              />
              {#if !use.method}
                {#each use.useLocations as location (location)}
                  {@const category =
                    MAP_PROVIDER_CATEGORY[location.provider.kind]}
                  {#if category}<MapEntityLink
                      href={buildEntityUrl(location.provider.id, category)}
                      onSelect={() => onSelectLocation(location.provider)}
                      >Use at {location.name}</MapEntityLink
                    >{:else}<p>Use at {location.name}</p>{/if}
                {/each}
              {/if}
              {#if use.method}<AcquisitionMethods
                  data={{ ...details, methods: [use.method], requirements: [] }}
                  {onSelectItem}
                  onSelectProvider={selectProvider}
                />{/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
    {#if details.sources.methods.length}
      <section class="space-y-2 border-t pt-2">
        <label class="flex items-center justify-between gap-2 text-sm"
          >Requested amount <input
            class="w-24 rounded border bg-background px-2 py-1"
            type="number"
            min="1"
            step="1"
            bind:value={requested}
          /></label
        >
        <button
          type="button"
          class="text-sm text-blue-400 underline disabled:opacity-50"
          disabled={expanding || !Number.isInteger(requested) || requested < 1}
          onclick={loadExpansion}
          >{expanding
            ? "Loading ingredients..."
            : "Expand ingredient alternatives"}</button
        >
        {#if expansionError}<p class="text-destructive">
            {expansionError}
          </p>{/if}
        {#if expansion}<div class="max-h-64 overflow-y-auto overscroll-contain">
            {@render tree(expansion)}
          </div>{/if}
      </section>
    {/if}
  </PopupCard>
{/if}
