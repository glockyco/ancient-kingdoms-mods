<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import PopupCard from "./PopupCard.svelte";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";
  import DropChance from "$lib/components/DropChance.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import { formatAltarRewardTier } from "$lib/calculation/altar";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import SeasonLabel from "$lib/components/SeasonLabel.svelte";
  import { SEASON_ORDER, type Season } from "$lib/data/seasonal-events";
  import {
    loadItemPopupDetails,
    loadMapItemIconPaths,
    type ItemPopupDetails,
    type ItemPopupVendor,
  } from "$lib/queries/popup";
  import {
    getQualityTextColorClass,
    formatPercent,
    formatNumber,
  } from "$lib/utils/format";

  interface Props {
    itemId: string;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectMonster: (monsterId: string) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    onSelectAltar: (altarId: string) => void;
    onHoverAltar?: (altarId: string | null) => void;
    onSelectNpc: (npcId: string) => void;
    onHoverNpc?: (npcId: string | null) => void;
    onSelectChest: (chestId: string) => void;
    onHoverChest?: (chestId: string | null) => void;
    onSelectGathering: (resourceId: string) => void;
    onHoverGathering?: (resourceId: string | null) => void;
    onSelectZone: (zoneId: string) => void;
    onHoverZone?: (zoneId: string | null) => void;
    onSelectQuest: (questId: string) => void;
    onSelectItem: (itemId: string) => void;
    mode?: "card" | "drawer";
  }

  let {
    itemId,
    onClose,
    onFocusClick,
    onSelectMonster,
    onHoverMonster,
    onSelectAltar,
    onHoverAltar,
    onSelectNpc,
    onHoverNpc,
    onSelectChest,
    onHoverChest,
    onSelectGathering,
    onHoverGathering,
    onSelectZone,
    onHoverZone,
    onSelectQuest,
    onSelectItem,
    mode = "card",
  }: Props = $props();

  const seasons = (Object.keys(SEASON_ORDER) as Season[]).sort(
    (a, b) => SEASON_ORDER[a] - SEASON_ORDER[b],
  );

  function groupVendors(vendors: ItemPopupVendor[]) {
    const groups = new SvelteMap<
      string,
      { offer: ItemPopupVendor; merchants: ItemPopupVendor[] }
    >();
    for (const offer of vendors) {
      const key = JSON.stringify([
        offer.price,
        offer.currencyItemId,
        offer.resultAmount,
      ]);
      const group = groups.get(key);
      if (group) group.merchants.push(offer);
      else groups.set(key, { offer, merchants: [offer] });
    }
    return [...groups.values()];
  }

  function formatFishingChanceRange(
    minChance: number | null,
    maxChance: number | null,
  ): string | null {
    if (minChance == null || maxChance == null) return null;
    if (Math.abs(minChance - maxChance) < 0.000001) {
      return `${formatPercent(minChance, { decimals: 1, trailingZeros: true })} per cast`;
    }
    return `${formatPercent(minChance, { decimals: 1, trailingZeros: true })}–${formatPercent(maxChance, { decimals: 1, trailingZeros: true })} per cast`;
  }

  function formatFishingSourceLabel(
    minChance: number | null,
    maxChance: number | null,
  ): string | null {
    return formatFishingChanceRange(minChance, maxChance);
  }

  let details = $state<ItemPopupDetails | null>(null);
  /** A row names its seasons only when they differ from the seasons in the popup header. */
  function seasonsBeyondHeader(seasons: readonly Season[]): readonly Season[] {
    const header = details?.seasons ?? [];
    const same =
      seasons.length === header.length &&
      seasons.every((season) => header.includes(season));
    return same ? [] : seasons;
  }
  /**
   * Seasonal offers grouped by price and merchants. Seasons that sell the same
   * offer at the same merchants share one group instead of repeating the list.
   */
  const shopGroups = $derived.by(() => {
    const groups = new SvelteMap<
      string,
      {
        seasons: Season[];
        offer: ItemPopupVendor;
        merchants: ItemPopupVendor[];
      }
    >();
    for (const season of seasons) {
      const vendors = (details?.vendors ?? []).filter((vendor) =>
        vendor.seasons.includes(season),
      );
      for (const { offer, merchants } of groupVendors(vendors)) {
        const key = JSON.stringify([
          offer.price,
          offer.currencyItemId,
          offer.resultAmount,
          merchants.map((merchant) => merchant.npcId).sort(),
        ]);
        const group = groups.get(key);
        if (group) group.seasons.push(season);
        else groups.set(key, { seasons: [season], offer, merchants });
      }
    }
    return [...groups.values()];
  });
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let itemIconPaths = $state<Record<string, string | null> | null>(null);

  $effect(() => {
    isLoading = true;
    error = null;
    details = null;
    itemIconPaths = null;

    loadItemPopupDetails(itemId)
      .then(async (d) => {
        const paths = await loadMapItemIconPaths(
          d
            ? [
                ...d.treasureMapSources.map((source) => source.mapItemId),
                ...(d.treasureDestination?.rewardItemId
                  ? [d.treasureDestination.rewardItemId]
                  : []),
              ]
            : [],
        );
        itemIconPaths = paths;
        details = d;
        if (!d) error = "Item not found";
      })
      .catch((e) => {
        error = e instanceof Error ? e.message : "Failed to load item";
      })
      .finally(() => {
        isLoading = false;
      });
  });
</script>

{#snippet rowSeasons(seasons: readonly Season[], indent = "")}
  {@const shown = seasonsBeyondHeader(seasons)}
  {#if shown.length > 0}
    <div class="flex flex-wrap gap-x-3 gap-y-1 {indent}">
      {#each shown as season (season)}<SeasonLabel {season} />{/each}
    </div>
  {/if}
{/snippet}

{#if isLoading}
  <PopupCard title="Loading..." {onClose} {mode}>
    <div class="flex items-center justify-center py-4">
      <div
        class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>
  </PopupCard>
{:else if error}
  <PopupCard title="Error" {onClose} {mode}>
    <p class="text-destructive">{error}</p>
  </PopupCard>
{:else if details}
  <PopupCard
    title={details.name}
    subtitle="Item"
    titleClass={getQualityTextColorClass(details.quality)}
    detailsUrl="/items/{details.id}"
    {onClose}
    onFocusClick={details.canFocus ? onFocusClick : undefined}
    {mode}
  >
    {#if details.seasons.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each details.seasons as season (season)}
          <SeasonLabel {season} />
        {/each}
      </div>
    {/if}
    <!-- Dropped by -->
    {#if details.droppers.length > 0}
      <div>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Dropped by
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.droppers as dropper (dropper.monsterId)}
            <div
              class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-1 min-w-0">
                  <MonsterTypeIcon
                    isBoss={dropper.isBoss}
                    isFabled={dropper.isFabled}
                    isElite={dropper.isElite}
                    class="h-3.5 w-3.5 shrink-0"
                  />
                  <MapEntityLink
                    href={buildEntityUrl(dropper.monsterId, "monster")}
                    onSelect={() => onSelectMonster(dropper.monsterId)}
                    onHoverStart={() => onHoverMonster?.(dropper.monsterId)}
                    onHoverEnd={() => onHoverMonster?.(null)}
                    class={dropper.isBoss
                      ? "text-cyan-400"
                      : dropper.isElite
                        ? "text-purple-400"
                        : "text-red-400"}
                  >
                    <span class="truncate">{dropper.monsterName}</span>
                  </MapEntityLink>
                </div>
                {@render rowSeasons(dropper.seasons, "pl-[1.125rem]")}
              </div>
              <div
                class="flex items-center gap-2 shrink-0 text-sm text-muted-foreground"
              >
                <span
                  >Lv {dropper.levelMin}{dropper.levelMax !== dropper.levelMin
                    ? `-${dropper.levelMax}`
                    : ""}</span
                >
                <span>
                  <DropChance
                    chance={dropper.dropRate}
                    fatecharmChance={dropper.fatecharmDropRate}
                    fatecharm={dropper.fatecharm}
                    {onSelectItem}
                  />
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Sold by -->
    {#if details.vendors.some((vendor) => vendor.seasons.length === 0)}
      <div class={details.droppers.length > 0 ? "border-t pt-2" : ""}>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Sold by
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.vendors.filter((vendor) => vendor.seasons.length === 0) as vendor, i (i)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(vendor.npcId, "npc")}
                onSelect={() => onSelectNpc(vendor.npcId)}
                onHoverStart={() => onHoverNpc?.(vendor.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
              >
                <span class="truncate">{vendor.npcName}</span>
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground">
                {#if vendor.currencyItemName !== null}
                  {formatNumber(vendor.price)}x {vendor.currencyItemName}
                {:else}
                  {formatNumber(vendor.price)}g
                {/if}
                {#if vendor.resultAmount && vendor.resultAmount > 1}
                  ({formatNumber(vendor.resultAmount)}×)
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if shopGroups.length > 0}
      <div class="border-t pt-2 text-sm">
        <div class="mb-1 font-medium text-muted-foreground">Seasonal shop</div>
        {#each shopGroups as group, i (i)}
          <div class="mt-2 space-y-1">
            {@render rowSeasons(group.seasons)}
            <div class="text-muted-foreground">
              {formatNumber(group.offer.price)}
              {#if group.offer.currencyItemId && group.offer.currencyItemName}
                <MapItemLink
                  itemId={group.offer.currencyItemId}
                  itemName={group.offer.currencyItemName}
                  onSelect={onSelectItem}
                />
              {:else}g{/if}
              {#if group.offer.resultAmount && group.offer.resultAmount > 1}
                for {formatNumber(group.offer.resultAmount)}
              {/if}
            </div>
            <div class="max-h-40 space-y-1 overflow-y-auto pr-2">
              {#each group.merchants as vendor (vendor.npcId)}
                <div>
                  <MapEntityLink
                    href={buildEntityUrl(vendor.npcId, "npc")}
                    onSelect={() => onSelectNpc(vendor.npcId)}
                    onHoverStart={() => onHoverNpc?.(vendor.npcId)}
                    onHoverEnd={() => onHoverNpc?.(null)}
                    >{vendor.npcName}</MapEntityLink
                  >
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if details.packSources.length > 0}
      <div class="border-t pt-2 text-sm">
        <div class="mb-1 font-medium text-muted-foreground">Opened from</div>
        <div class="max-h-32 space-y-1 overflow-y-auto pr-2">
          {#each details.packSources as pack (pack.itemId)}
            <div class="flex items-start justify-between gap-2">
              <MapItemLink
                itemId={pack.itemId}
                itemName={pack.itemName}
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-muted-foreground"
                >{formatNumber(pack.resultAmount)}x</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Gathered from -->
    {#if details.gatheringSources.length > 0}
      <div
        class={details.droppers.length > 0 || details.vendors.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Gathered from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.gatheringSources as source (source.resourceId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(
                  source.resourceId,
                  source.resourceType === "chest" ? "chest" : "gathering",
                )}
                onSelect={() =>
                  source.resourceType === "chest"
                    ? onSelectChest(source.resourceId)
                    : onSelectGathering(source.resourceId)}
                onHoverStart={() =>
                  source.resourceType === "chest"
                    ? onHoverChest?.(source.resourceId)
                    : onHoverGathering?.(source.resourceId)}
                onHoverEnd={() =>
                  source.resourceType === "chest"
                    ? onHoverChest?.(null)
                    : onHoverGathering?.(null)}
              >
                <span class="truncate">
                  {source.resourceType === "chest"
                    ? "Chest"
                    : source.resourceName}
                </span>
              </MapEntityLink>
              <span
                class="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
              >
                {#if source.rateNote}
                  {source.rateNote}
                {:else if formatFishingSourceLabel(source.fishingChanceMin, source.fishingChanceMax)}
                  {formatFishingSourceLabel(
                    source.fishingChanceMin,
                    source.fishingChanceMax,
                  )}
                {:else}
                  {formatPercent(source.rate, {
                    decimals: 1,
                    trailingZeros: true,
                  })}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Altar Rewards -->
    {#if details.altarSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Altar Rewards
        </div>
        <div class="max-h-32 space-y-1 overflow-y-auto pr-2">
          {#each details.altarSources as altar, i (i)}
            <div>
              <MapEntityLink
                href={buildEntityUrl(altar.altarId, "altar")}
                onSelect={() => onSelectAltar(altar.altarId)}
                onHoverStart={() => onHoverAltar?.(altar.altarId)}
                onHoverEnd={() => onHoverAltar?.(null)}
                class="text-orange-400"
              >
                <span class="truncate">{altar.altarName}</span>
              </MapEntityLink>
              <div class="text-xs text-muted-foreground">
                {#if altar.tier}
                  {formatAltarRewardTier(altar.tier, altar, altar.maxLevel)}
                {/if}
                {#if altar.dropRate > 0 || altar.tier === null}
                  {#if altar.tier !== null}·{/if}
                  {#if altar.tier !== null || altar.isDistributionRoll}
                    {formatPercent(altar.dropRate, {
                      decimals: 1,
                      trailingZeros: true,
                    })}
                  {:else}
                    <DropChance
                      chance={altar.dropRate}
                      fatecharmChance={altar.fatecharmDropRate}
                      fatecharm={altar.fatecharm}
                      {onSelectItem}
                    />
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Found in Chests -->
    {#if details.chestSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Found in Chests
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.chestSources as chest (chest.chestId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(chest.chestId, "chest")}
                onSelect={() => onSelectChest(chest.chestId)}
                onHoverStart={() => onHoverChest?.(chest.chestId)}
                onHoverEnd={() => onHoverChest?.(null)}
              >
                {chest.chestName}
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground">
                {formatPercent(chest.rate, {
                  decimals: 1,
                  trailingZeros: true,
                })}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Quest Rewards -->
    {#if details.questRewards.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Quest Rewards
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.questRewards as quest (quest.questId)}
            <div
              class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm"
            >
              <div class="min-w-0">
                <MapEntityLink
                  href={buildEntityUrl(quest.questId, "quest")}
                  onSelect={() => onSelectQuest(quest.questId)}
                >
                  <span class="truncate">{quest.questName}</span>
                </MapEntityLink>
                {@render rowSeasons(quest.seasons)}
              </div>
              <span class="shrink-0 text-sm text-muted-foreground">
                Lv {quest.levelRecommended}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Crafted from -->
    {#if details.craftingSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Crafted from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.craftingSources as recipe, recipeIndex (recipeIndex)}
            {#each recipe.materials as material, materialIndex (materialIndex)}
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground"
                  >{formatNumber(material.amount)}x</span
                >
                <MapItemLink
                  itemId={material.itemId}
                  itemName={material.itemName}
                  onSelect={onSelectItem}
                />
              </div>
            {/each}
          {/each}
        </div>
      </div>
    {/if}

    <!-- Merged from -->
    {#if details.mergeSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0 ||
        details.craftingSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Merged from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.mergeSources as source, i (i)}
            <div>
              <MapItemLink
                itemId={source.itemId}
                itemName={source.itemName}
                onSelect={onSelectItem}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- From Treasure (for items that are rewards from treasure maps) -->
    {#if details.treasureMapSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0 ||
        details.craftingSources.length > 0 ||
        details.mergeSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          From Treasure
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.treasureMapSources as source (source.mapItemId)}
            <div class="flex items-center justify-between gap-2">
              <MapItemLink
                itemId={source.mapItemId}
                itemName={source.mapItemName}
                tooltipHtml={source.mapItemTooltipHtml}
                imageAvailable={itemIconPaths?.[source.mapItemId]}
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-xs text-muted-foreground">
                {source.zoneName}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Treasure Destination (for items that ARE treasure maps) -->
    {#if details.treasureDestination}
      {@const dest = details.treasureDestination}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Zone</span>
        <MapEntityLink
          href={buildEntityUrl(dest.zoneId, "zone")}
          onSelect={() => onSelectZone(dest.zoneId)}
          onHoverStart={() => onHoverZone?.(dest.zoneId)}
          onHoverEnd={() => onHoverZone?.(null)}
          class="text-blue-400"
        >
          {dest.zoneName}
        </MapEntityLink>
      </div>
      {#if dest.rewardItemId && dest.rewardItemName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Reward</span>
          <MapItemLink
            itemId={dest.rewardItemId}
            itemName={dest.rewardItemName}
            tooltipHtml={dest.rewardItemTooltipHtml}
            imageAvailable={itemIconPaths?.[dest.rewardItemId]}
            onSelect={onSelectItem}
          />
        </div>
      {/if}
    {/if}

    <!-- Tooltip -->
    {#if details.tooltipHtml}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0 ||
        details.craftingSources.length > 0 ||
        details.mergeSources.length > 0 ||
        details.treasureMapSources.length > 0 ||
        details.treasureDestination !== null
          ? "border-t pt-2"
          : ""}
      >
        <ItemTooltip
          tooltipHtml={details.tooltipHtml}
          visualAsset={details.visualAsset}
        />
      </div>
    {/if}
  </PopupCard>
{/if}
