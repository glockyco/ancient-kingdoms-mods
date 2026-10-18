<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import type {
    MethodView,
    EvaluatedQuantity,
    ProviderView,
    ProbabilityResult,
    RequirementRoot,
  } from "$lib/acquisition/types";
  import type { PopupAcquisition } from "$lib/queries/popup";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import {
    distinctSubzoneName,
    formatPercent,
    formatNumber,
    getQualityTextColorClass,
  } from "$lib/utils/format";
  import { MAP_PROVIDER_CATEGORY } from "$lib/map/acquisition";
  import {
    CODE_DEFINED_RULES,
    BASELINE_ASSUMPTIONS,
    calculateMethodProbabilities,
    evaluateAllCarriedBatch,
  } from "$lib/acquisition/rules";
  import {
    methodLabel,
    deliveryText,
    expectedQuantityText,
    PROBABILITY_EVENT_LABELS,
    probabilityScenarioText,
    methodOutcomes,
    methodPresentationRequirements,
    costTimingText,
    costLabel,
  } from "$lib/components/acquisition/display";

  let {
    data,
    onSelectItem,
    onSelectProvider,
    selectedItemId,
    showRequirements = true,
    selectedProviderId,
    selectedQuestId,
  }: {
    data: PopupAcquisition;
    onSelectItem: (id: string) => void;
    onSelectProvider?: (provider: ProviderView) => void;
    selectedItemId?: string;
    showRequirements?: boolean;
    selectedProviderId?: string;
    selectedQuestId?: string;
  } = $props();
  let scenarioEnabled = $state(false);
  let professionPercent = $state(0);
  let toolQuality = $state(0);
  let costumePieces = $state(0);
  let treasureHunter = $state(0);
  let fatecharm = $state(false);
  let chestAccess = $state<"key" | "lockpick" | "unknown">("unknown");
  let carriedRunes = $state<number | undefined>(undefined);
  let completeRuneCount = $state(false);
  const expandedGroups = new SvelteSet<string>();
  const expandedMethods = new SvelteSet<string>();
  const methodGroups = $derived.by(() => {
    const groups: Record<
      string,
      {
        key: string;
        label: string;
        altarTiers: boolean;
        methods: MethodView[];
      }
    > = Object.create(null);
    for (const view of data.methods) {
      if (view.kind === "kill" && methodOutcomes(view).length === 0) continue;
      const label = methodLabel(view);
      const altarTiers =
        view.ruleId === "altar_final_loot" &&
        view.requirements.some(
          (root) =>
            root.expression.kind === "predicate" &&
            root.expression.predicate.kind === "altar_tier",
        ) &&
        typeof view.detail.altar_id === "string" &&
        typeof view.detail.monster_id === "string";
      const key = altarTiers
        ? JSON.stringify([
            label,
            view.detail.altar_id,
            view.detail.monster_id,
            view.detail.wave_number,
            view.detail.wave_member_index,
            view.setupMethod?.methodId,
          ])
        : label;
      const group = groups[key];
      if (group) group.methods.push(view);
      else groups[key] = { key, label, altarTiers, methods: [view] };
    }
    return Object.values(groups);
  });
  const altarGroupCount = $derived(
    methodGroups.reduce((count, group) => count + Number(group.altarTiers), 0),
  );
  const needsProfession = $derived(
    data.methods.some((view) => view.probabilityFactors.includes("profession")),
  );
  const needsTool = $derived(
    data.methods.some((view) => view.probabilityFactors.includes("tool")),
  );
  const needsTreasureHunter = $derived(
    data.methods.some((view) =>
      view.probabilityFactors.includes("treasure_hunter"),
    ),
  );
  const needsChestAccess = $derived(
    data.methods.some((view) =>
      view.probabilityFactors.includes("chest_access"),
    ),
  );
  function supportsFatecharm(view: MethodView): boolean {
    return view.probabilityFactors.includes("fatecharm");
  }
  const hasFatecharmScenario = $derived(data.methods.some(supportsFatecharm));
  const validScenario = $derived(
    Number.isFinite(professionPercent) &&
      professionPercent >= 0 &&
      professionPercent <= 100 &&
      Number.isInteger(toolQuality) &&
      toolQuality >= 0 &&
      Number.isInteger(costumePieces) &&
      costumePieces >= 0 &&
      Number.isFinite(treasureHunter) &&
      treasureHunter >= 0 &&
      treasureHunter <= 100,
  );
  const scenarioResults = $derived.by(() => {
    const results: Record<string, readonly ProbabilityResult[]> =
      Object.create(null);
    if (!scenarioEnabled || !validScenario) return results;
    for (const view of data.methods) {
      const method = data.model.methods.get(view.methodId);
      if (!method)
        throw new Error(`Missing acquisition method ${view.methodId}`);
      results[view.methodId] = calculateMethodProbabilities(
        data.model.rows,
        method,
        view.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: professionPercent / 100,
            toolQuality,
            costumePieces,
            treasureHunter: treasureHunter / 100,
            fatecharm: fatecharm && supportsFatecharm(view),
            chestAccess,
          },
        },
      );
    }
    return results;
  });
  const runeBatch = $derived(
    carriedRunes !== undefined &&
      Number.isInteger(carriedRunes) &&
      carriedRunes >= 0
      ? evaluateAllCarriedBatch(carriedRunes, completeRuneCount)
      : null,
  );
  function quantity(value: EvaluatedQuantity): string {
    if (value.kind === "exact") return formatNumber(value.value);
    if (value.kind === "range")
      return value.max === null
        ? `at least ${formatNumber(value.min)}`
        : `${formatNumber(value.min)} to ${formatNumber(value.max)}`;
    return "Quantity unknown";
  }
  function probabilities(view: MethodView): readonly ProbabilityResult[] {
    return scenarioResults[view.methodId] ?? view.probabilityResults;
  }
  function outcomeRows(view: MethodView) {
    const results = probabilities(view);
    return methodOutcomes(
      results === view.probabilityResults
        ? view
        : { ...view, probabilityResults: results },
    ).filter((row) => !selectedItemId || row.itemId === selectedItemId);
  }
  function providerLabel(provider: ProviderView): string {
    const location = provider.location;
    const zone = location?.zoneId
      ? (data.names[`zones:${location.zoneId}`] ?? data.names[location.zoneId])
      : null;
    const subZone = location?.subZoneId
      ? (data.names[`sub_zones:${location.subZoneId}`] ??
        data.names[location.subZoneId])
      : null;
    const area = [zone, distinctSubzoneName(zone, subZone)]
      .filter(Boolean)
      .join(", ");
    return `${provider.name}${area ? ` (${area})` : ""}`;
  }
  function providerGroups(providers: readonly ProviderView[]) {
    return [...Map.groupBy(providers, providerLabel)];
  }
  function scenarioNotes(view: MethodView): readonly string[] {
    const factors =
      showRequirements && tierRequirements(view).length
        ? view.probabilityFactors.filter((factor) => factor !== "altar_tier")
        : view.probabilityFactors;
    return [
      ...new Set(
        probabilities(view)
          .map((result) => probabilityScenarioText(result, factors))
          .filter(Boolean),
      ),
    ];
  }
  function tierRequirements(view: MethodView): readonly RequirementRoot[] {
    return view.requirements.filter(
      (root) =>
        root.expression.kind === "predicate" &&
        root.expression.predicate.kind === "altar_tier",
    );
  }
</script>

{#snippet item(id: string | null, withheld = false)}
  {#if id && data.items[id]}
    <MapItemLink
      itemId={id}
      itemName={data.items[id].name}
      tooltipHtml={data.items[id].tooltipHtml}
      imageAvailable={data.items[id].iconPath}
      colorClass={getQualityTextColorClass(data.items[id].quality)}
      onSelect={onSelectItem}
    />
  {:else}<span
      >{withheld
        ? "Unpublished item"
        : id
          ? (data.names[id] ?? id)
          : "Gold"}</span
    >{/if}
{/snippet}

{#snippet providerLink(
  provider: ProviderView,
  view: MethodView,
  label = providerLabel(provider),
)}
  {@const category = MAP_PROVIDER_CATEGORY[provider.ref.kind]}
  <div>
    {#if provider.ref.id !== selectedProviderId}
      {#if category && onSelectProvider}
        <MapEntityLink
          href={buildEntityUrl(provider.ref.id, category)}
          onSelect={() => onSelectProvider?.(provider)}>{label}</MapEntityLink
        >
      {:else}<span>{label}</span>{/if}
    {/if}
    {#if provider.location?.approximate}<span class="text-muted-foreground">
        near the parent spawn area</span
      >{/if}
    {#if showRequirements}<Requirements
        roots={provider.requirements.filter(
          (root) => !view.requirements.includes(root),
        )}
        names={data.names}
      />{/if}
  </div>
{/snippet}

{#snippet methodSummary(
  view: MethodView,
  hideSubject = false,
  tierRange: string | null = null,
)}
  {@const subjectId =
    view.detail.monster_id ??
    view.detail.quest_id ??
    view.detail.offered_item_id ??
    view.detail.declared_result_item_id ??
    view.detail.item_id}
  {@const subject =
    view.kind === "vendor" &&
    !view.providers.some((provider) => provider.ref.id === selectedProviderId)
      ? view.providers[0]?.name
      : (data.names[String(subjectId)] ?? view.providers[0]?.name)}
  {@const zoneId = view.providers[0]?.location?.zoneId}
  {@const tierResult =
    view.ruleId === "altar_final_loot"
      ? probabilities(view).find(
          (result) =>
            result.assumptions.altarTier !== null &&
            result.assumptions.altarTier !== undefined,
        )
      : undefined}
  {#if tierResult || tierRange}
    <span
      >{tierResult
        ? probabilityScenarioText(tierResult, ["altar_tier"])
        : ""}{tierRange ? ` ${tierRange}` : ""}</span
    >
  {/if}
  {#if !hideSubject && (!tierResult || !view.providers.some((provider) => provider.ref.id === selectedProviderId))}
    <span>{subject ?? methodLabel(view)}</span>
    {#if zoneId && data.names[zoneId] && !view.providers.some((provider) => provider.ref.id === selectedProviderId)}<span
        class="text-muted-foreground"
      >
        ({data.names[zoneId]})</span
      >{/if}
  {/if}
  {#if selectedItemId && !expandedMethods.has(view.methodId)}
    {#each (scenarioResults[view.methodId] ?? view.probabilityResults).filter((result) => result.target.kind === "item" && result.target.itemId === selectedItemId) as result (`${result.outcomeKey}:${result.event}`)}
      {#if result.probability !== null}
        <span class="sr-only">, </span>
        <span class="text-muted-foreground">
          {formatPercent(result.probability, {
            decimals: 2,
            trailingZeros: false,
            preserveNonzero: true,
          })}
          per {PROBABILITY_EVENT_LABELS[result.event]}
        </span>
      {/if}
    {/each}
  {/if}
{/snippet}

{#snippet method(
  view: MethodView,
  setup = false,
  summaryRequirements: readonly RequirementRoot[] | null = null,
  sharedSetupMethodId: string | null = null,
)}
  {@const selectedProvider = view.providers.find(
    (provider) => provider.ref.id === selectedProviderId,
  )}
  {@const otherProviders = view.providers.filter(
    (provider) => provider !== selectedProvider,
  )}
  {@const rows = outcomeRows(view)}
  <section class="space-y-2 border-t pt-2 text-sm">
    {#if summaryRequirements === null}
      <div class="font-medium">
        {methodLabel(view)}
      </div>
    {/if}
    {#if selectedProvider}{@render providerLink(selectedProvider, view)}{/if}
    {#if otherProviders.length === 1 && !selectedProvider}
      {@render providerLink(otherProviders[0], view)}
    {:else if otherProviders.length}
      <details class="rounded border p-2">
        <summary class="cursor-pointer text-muted-foreground">
          {selectedProvider ? "Other locations" : "Sources"} ({otherProviders.length})
        </summary>
        <div class="max-h-40 space-y-2 overflow-y-auto overscroll-contain pt-2">
          {#each providerGroups(otherProviders) as [label, providers] (label)}
            {#if providers.length === 1}
              {@render providerLink(providers[0], view)}
            {:else}
              <details>
                <summary class="cursor-pointer"
                  >{label} ({providers.length} locations)</summary
                >
                <div class="space-y-1 pl-2">
                  {#each providers as provider, index (`${provider.ref.kind}:${provider.ref.id}:${index}`)}
                    {@render providerLink(
                      provider,
                      view,
                      `Location ${index + 1}`,
                    )}
                  {/each}
                </div>
              </details>
            {/if}
          {/each}
        </div>
      </details>
    {/if}
    {#each view.homeProviders as home (home.id)}
      <div>
        {view.providers.length ? "Or use " : "Use "}{@render item(
          String(home.structure_item_id),
        )} in your house.
      </div>
    {/each}
    {#if view.kind === "vendor" && typeof view.detail.offered_item_id === "string" && !view.outputs.some((output) => output.item_id === view.detail.offered_item_id)}
      <div class="text-muted-foreground">
        Offer: {@render item(view.detail.offered_item_id)}
      </div>
    {/if}
    {#if (view.kind === "quest_accept" || view.kind === "quest_complete") && view.detail.quest_id !== selectedQuestId}
      <a
        class="text-blue-400 underline"
        href={`/quests/${String(view.detail.quest_id)}`}
        >{data.names[String(view.detail.quest_id)] ?? "Quest"}</a
      >
    {/if}
    {#if view.kind === "recipe"}<p>
        Tier {String(view.detail.tier)}{#if view.detail.experience !== null}, {String(
            view.detail.experience,
          )} experience{/if}.
      </p>{/if}
    {#if view.kind === "world_chest"}
      <p>
        Lockpicking has a {formatPercent(
          CODE_DEFINED_RULES.worldChest.lockpickSuccess,
          { decimals: 2, preserveNonzero: true },
        )} success chance.
      </p>
    {/if}
    {#if view.kind === "kill" && view.detail.event_kind === "placeholder"}<p>
        After the parent spawns this monster. Its loot chance is conditional on
        killing the spawned monster.
      </p>{/if}
    {#if view.kind === "cap_xp"}<p>
        Once you have {CODE_DEFINED_RULES.capXp.minimumTotalVeteranPoints} veteran
        points, earn another {CODE_DEFINED_RULES.capXp.cycleAtBoundary.toLocaleString(
          "en-US",
        )} XP for this reward. The XP is spent even if a full inventory prevents you
        from receiving the item.
      </p>{/if}
    {#if showRequirements}<Requirements
        roots={methodPresentationRequirements(view).filter(
          (root) => !summaryRequirements?.includes(root),
        )}
        names={data.names}
      />{/if}
    {#each rows as row (row.key)}
      <div class="space-y-1">
        <div
          class="flex flex-wrap items-baseline gap-x-2"
          class:font-medium={row.itemId === selectedItemId}
        >
          {@render item(row.itemId, row.resourceKind === "item" && !row.itemId)}
          {#if row.resourceKind === "gold" && view.ruleId === "altar_final_loot" && row.outputs.every((output) => output.quantity.kind === "unknown")}
            <span class="text-muted-foreground">
              {`${CODE_DEFINED_RULES.altar.goldPerLevel} × the activating player's level + ${CODE_DEFINED_RULES.altar.goldPerVeteranPoint} × their total veteran points`}
            </span>
          {/if}
          {#each row.outputs as output (output.id)}
            {#if output.quantity.kind !== "unknown"}<span
                >{quantity(output.quantity)}</span
              >{/if}
            {#if output.delivery !== "inventory" && output.delivery !== "corpse"}
              <span class="text-muted-foreground"
                >{deliveryText(output.delivery, output.slot)}</span
              >
            {/if}
            {#if showRequirements}<Requirements
                roots={output.requirements.filter(
                  (root) => !view.requirements.includes(root),
                )}
                names={data.names}
              />{/if}
          {/each}
          {#if !row.outputs.length && row.delivery !== "inventory" && row.delivery !== "corpse"}
            <span class="text-muted-foreground"
              >{deliveryText(row.delivery)}</span
            >
          {/if}
          {#each row.probabilities as result, index (`${result.outcomeKey}:${result.event}:${index}`)}
            {@const fixedQuantity = row.outputs.some(
              (output) => output.quantity.kind === "exact",
            )}
            {#if result.probability !== null && !(result.probability === 1 && result.quantityMeaning === "fixed_units" && fixedQuantity)}
              <span class="text-muted-foreground">
                {formatPercent(result.probability, {
                  decimals: 2,
                  trailingZeros: false,
                  preserveNonzero: true,
                })} per {PROBABILITY_EVENT_LABELS[result.event]}
              </span>
            {/if}
            {#if expectedQuantityText(result)}<span
                class="text-muted-foreground"
                >{expectedQuantityText(result)}</span
              >{/if}
          {/each}
        </div>
      </div>
    {/each}
    {#each scenarioNotes(view) as note (note)}<p class="text-muted-foreground">
        {note}
      </p>{/each}
    {#each view.costGroups as group (group.id)}
      <div class="rounded bg-muted/40 p-2">
        <div>
          {costLabel(group, view)}
        </div>
        <div class="flex flex-wrap items-center gap-x-2">
          {#each group.inputs as input, index (input.id)}
            {#if index > 0}<span>and</span>{/if}<span>{input.amount} x</span
            >{@render item(input.item_id, Boolean(input.withheld))}
          {/each}
        </div>
        {#if costTimingText(group, view)}<div class="text-muted-foreground">
            {costTimingText(group, view)}
          </div>{/if}
      </div>
    {/each}
    {#each view.effects as effect (effect.id)}<p>
        Faction: {data.names[String(effect.faction_id)] ??
          "Unpublished faction"}
        {Number(effect.delta) > 0 ? "+" : ""}{String(effect.delta)} ({String(
          effect.event,
        ).replaceAll("_", " ")}).
      </p>{/each}
    {#if view.repeatability.kind === "once_per_character"}
      <p class="text-muted-foreground">Once per character.</p>
    {/if}
    {#if view.setupMethod && !setup && view.setupMethod.methodId !== sharedSetupMethodId && !data.methods.some((method) => method.methodId === view.setupMethod?.methodId)}
      {@render method(view.setupMethod, true)}
    {/if}
  </section>
{/snippet}

<div class="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-2">
  {#if showRequirements}<Requirements
      roots={data.requirements}
      names={data.names}
    />{/if}
  {#if needsProfession || needsTreasureHunter || hasFatecharmScenario || needsChestAccess}
    <details class="rounded border p-2 text-sm">
      <summary class="cursor-pointer font-medium">Calculate chances</summary>
      <label class="flex items-center gap-2 py-1"
        ><input type="checkbox" bind:checked={scenarioEnabled} />Use these
        values</label
      >
      {#if needsProfession}
        <label class="flex items-center justify-between gap-2 py-1"
          >Profession skill (%)<input
            class="w-20 rounded border bg-background px-2 py-1"
            type="number"
            min="0"
            max="100"
            bind:value={professionPercent}
          /></label
        >
        {#if needsTool}
          <label class="flex items-center justify-between gap-2 py-1"
            >Tool quality<input
              class="w-20 rounded border bg-background px-2 py-1"
              type="number"
              min="0"
              step="1"
              bind:value={toolQuality}
            /></label
          >
        {/if}
        {#if data.methods.some((view) => view.ruleId === "fishing")}<label
            class="flex items-center justify-between gap-2 py-1"
            >Fisherman costume pieces<input
              class="w-20 rounded border bg-background px-2 py-1"
              type="number"
              min="0"
              step="1"
              bind:value={costumePieces}
            /></label
          >{/if}
      {/if}
      {#if needsTreasureHunter}<label
          class="flex items-center justify-between gap-2 py-1"
          >Treasure Hunter (%)<input
            class="w-20 rounded border bg-background px-2 py-1"
            type="number"
            min="0"
            max="100"
            bind:value={treasureHunter}
          /></label
        >{/if}
      {#if hasFatecharmScenario}<label class="flex items-center gap-2 py-1"
          ><input type="checkbox" bind:checked={fatecharm} />Matching dungeon
          Fatecharm (consumed)</label
        >{/if}
      {#if needsChestAccess}<label
          class="flex items-center justify-between gap-2 py-1"
          >Chest access<select
            class="rounded border bg-background px-2 py-1"
            bind:value={chestAccess}
            ><option value="unknown">Unknown</option><option value="key"
              >Matching carried key</option
            ><option value="lockpick">Qualified Lockpicking</option></select
          ></label
        >{/if}
      {#if scenarioEnabled && !validScenario}<p class="text-destructive">
          Enter valid amounts. Results remain the baseline until the inputs are
          valid.
        </p>{/if}
    </details>
  {/if}
  {#if data.methods.some((view) => view.kind === "blessing")}
    <div class="space-y-1 rounded border p-2 text-sm">
      <label class="flex items-center justify-between gap-2"
        >Carried runes in this scenario<input
          class="w-20 rounded border bg-background px-2 py-1"
          type="number"
          min="0"
          step="1"
          bind:value={carriedRunes}
        /></label
      >
      <label class="flex items-center gap-2"
        ><input type="checkbox" bind:checked={completeRuneCount} />This is the
        complete carried count</label
      >
      {#if runeBatch}<p>
          {quantity(runeBatch.runes)} runes converted, {quantity(
            runeBatch.gold,
          )} gold. The normal action converts every carried rune.
        </p>{/if}
    </div>
  {/if}
  {#each methodGroups as { key, label, methods, altarTiers } (key)}
    {@const sharedSetupMethod =
      altarTiers &&
      methods[0].setupMethod &&
      methods.every(
        (view) =>
          view.setupMethod?.methodId === methods[0].setupMethod?.methodId,
      )
        ? methods[0].setupMethod
        : null}
    {@const zoneName =
      data.names[methods[0].providers[0]?.location?.zoneId ?? ""]}
    {@const groupLabel =
      altarTiers && (!selectedProviderId || altarGroupCount > 1)
        ? `${label}: ${data.names[String(methods[0].detail.monster_id)] ?? "Monster"}${zoneName ? ` (${zoneName})` : ""}`
        : label}
    {@const recipes = methods.every((view) => view.kind === "recipe")}
    {@const countLabel = altarTiers
      ? "reward tiers"
      : methods.every((view) => view.kind === "vendor")
        ? "offers"
        : "sources"}
    {#if methods.length > 1}
      <details
        class="rounded border p-2 text-sm"
        ontoggle={(event) => {
          if (event.currentTarget.open) expandedGroups.add(key);
          else expandedGroups.delete(key);
        }}
      >
        <summary class="cursor-pointer font-medium">
          {recipes
            ? `${groupLabel}s (${methods.length})`
            : `${groupLabel} (${methods.length} ${countLabel})`}
        </summary>
        {#if expandedGroups.has(key)}
          {#if sharedSetupMethod && !data.methods.some((view) => view.methodId === sharedSetupMethod.methodId)}
            {@render method(sharedSetupMethod, true)}
          {/if}
          {#if altarTiers && showRequirements}
            <p class="pt-2 text-muted-foreground">
              Activating player's level + total veteran points
            </p>
          {/if}
          {#each methods as view (view.methodId)}
            {@const summaryRequirements =
              showRequirements && view.ruleId === "altar_final_loot"
                ? tierRequirements(view)
                : []}
            {@const tierExpression = summaryRequirements[0]?.expression}
            {@const tierRange =
              altarTiers &&
              summaryRequirements.length === 1 &&
              summaryRequirements[0].phase === "loot" &&
              tierExpression?.kind === "predicate" &&
              tierExpression.predicate.kind === "altar_tier"
                ? tierExpression.predicate.maximumScore === null
                  ? `${tierExpression.predicate.minimumScore}+`
                  : `${tierExpression.predicate.minimumScore} to ${tierExpression.predicate.maximumScore}`
                : null}
            <details
              class="border-t py-2"
              ontoggle={(event) => {
                if (event.currentTarget.open)
                  expandedMethods.add(view.methodId);
                else expandedMethods.delete(view.methodId);
              }}
            >
              <summary class="cursor-pointer space-x-1">
                {@render methodSummary(view, altarTiers, tierRange)}
                {#if !tierRange}
                  <Requirements
                    roots={summaryRequirements}
                    names={data.names}
                  />
                {/if}
              </summary>
              {#if expandedMethods.has(view.methodId)}
                {@render method(
                  view,
                  false,
                  summaryRequirements,
                  sharedSetupMethod?.methodId,
                )}
              {/if}
            </details>
          {/each}
        {/if}
      </details>
    {:else}
      {#each methods as view (view.methodId)}{@render method(view)}{/each}
    {/if}
  {/each}
</div>
