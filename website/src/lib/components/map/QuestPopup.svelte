<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import AcquisitionMethods from "./AcquisitionMethods.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import {
    distinctSubzoneName,
    questPresentationRequirements,
  } from "$lib/components/acquisition/display";
  import { buildEntityUrl } from "$lib/map/url-state";
  import {
    loadQuestPopupDetails,
    type QuestPopupDetails,
  } from "$lib/queries/popup";
  import { formatNumber, getQualityTextColorClass } from "$lib/utils/format";
  interface Props {
    questId: string;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectNpc: (id: string) => void;
    onSelectMonster: (id: string) => void;
    onSelectItem: (id: string) => void;
    onDiscoveryLocationChange: (position: [number, number] | null) => void;
    onSelectDiscovery: () => void;
    onHoverNpc?: (id: string | null) => void;
    onHoverMonster?: (id: string | null) => void;
    mode?: "card" | "drawer";
  }
  let {
    questId,
    onClose,
    onFocusClick,
    onSelectNpc,
    onSelectMonster,
    onSelectItem,
    onDiscoveryLocationChange,
    onSelectDiscovery,
    onHoverNpc,
    onHoverMonster,
    mode = "card",
  }: Props = $props();
  let details = $state<QuestPopupDetails | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  const objectiveLabels: Record<string, string> = {
    kill_counter: "Kill",
    gather_counter: "Gather while this quest is active",
    inventory_primary: "Have in inventory or key ring",
    inventory_secondary: "Have in inventory, or one equipped, or in key ring",
    equipped: "Equip",
    brew_counter: "Successful brews while this quest is active",
    location_visit: "Visit",
  };
  const objectives = $derived(
    details?.objectives.filter(
      (objective) => objective.role !== "tracking_location",
    ) ?? [],
  );
  const locations = $derived(
    details?.objectives.filter(
      (objective) => objective.role === "tracking_location",
    ) ?? [],
  );
  const visibleRequirements = $derived(
    details
      ? questPresentationRequirements(details.requirements, details.id, {})
      : [],
  );
  const acquisitionData = $derived.by(() => {
    if (!details) return null;
    const currentQuestId = details.id;
    const shown = visibleRequirements.flatMap((root) => [
      JSON.stringify(root),
      ...(root.phase === "fulfill"
        ? [JSON.stringify({ ...root, phase: "complete" })]
        : []),
    ]);
    const remaining = (roots: QuestPopupDetails["requirements"]) =>
      questPresentationRequirements(roots, currentQuestId, {}).filter(
        (root) => !shown.includes(JSON.stringify(root)),
      );
    return {
      ...details,
      requirements: [],
      methods: details.methods.map((method) => ({
        ...method,
        requirements: remaining(method.requirements),
        providers: method.providers.map((provider) => ({
          ...provider,
          requirements: remaining(
            provider.requirements.filter(
              (root) => !method.requirements.includes(root),
            ),
          ),
        })),
      })),
    };
  });
  $effect(() => {
    let cancelled = false;
    onDiscoveryLocationChange(null);
    loading = true;
    error = null;
    details = null;
    loadQuestPopupDetails(questId)
      .then((value) => {
        if (cancelled) return;
        details = value;
        onDiscoveryLocationChange(
          value?.objectives.find((o) => o.kind === "location" && o.position)
            ?.position ?? null,
        );
        if (!value) error = "Quest not found";
      })
      .catch(() => {
        if (!cancelled) error = "Refresh the page to try again.";
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
      onDiscoveryLocationChange(null);
    };
  });
</script>

{#snippet objectiveTarget(objective: QuestPopupDetails["objectives"][number])}
  {@const distinctName =
    objective.kind === "location"
      ? distinctSubzoneName(objective.zoneName, objective.targetName)
      : objective.targetName}
  {@const name = distinctName || objective.zoneName || objective.targetName}
  {#if objective.kind === "monster" && objective.targetId}
    <MapEntityLink
      href={buildEntityUrl(objective.targetId, "monster")}
      onSelect={() => onSelectMonster(objective.targetId!)}
      onHoverStart={() => onHoverMonster?.(objective.targetId!)}
      onHoverEnd={() => onHoverMonster?.(null)}>{name}</MapEntityLink
    >
  {:else if (objective.kind === "item" || objective.kind === "brew") && objective.targetId}
    <MapItemLink
      itemId={objective.targetId}
      itemName={name}
      tooltipHtml={objective.tooltipHtml}
      imageAvailable={details?.items[objective.targetId]?.iconPath ?? null}
      colorClass={getQualityTextColorClass(objective.quality)}
      onSelect={onSelectItem}
    />
  {:else if objective.kind === "location" && objective.position}
    <button
      type="button"
      class="text-blue-400 underline"
      onclick={() => {
        onDiscoveryLocationChange(objective.position!);
        onSelectDiscovery();
      }}>{name}</button
    >
  {:else}
    <span>{name}</span>
  {/if}
  {#if objective.zoneName && distinctName}
    <span class="text-muted-foreground">({objective.zoneName})</span>
  {/if}
{/snippet}

{#if loading}<PopupCard title="Loading..." {onClose} {mode}
    ><p>Loading quest...</p></PopupCard
  >
{:else if error}<PopupCard title="Could not load quest" {onClose} {mode}
    ><p class="text-destructive">{error}</p></PopupCard
  >
{:else if details}
  <PopupCard
    title={details.name}
    subtitle={`Quest · Lv ${details.levelRecommended}`}
    detailsUrl={`/quests/${details.id}`}
    {onClose}
    {mode}
    onFocusClick={details.npcs.length ? onFocusClick : undefined}
  >
    {#if details.npcs.length}
      <section class="space-y-1">
        <h3 class="font-medium">Quest NPCs</h3>
        <div class="max-h-48 space-y-1 overflow-y-auto overscroll-contain pr-2">
          {#each details.npcs as npc, index (index)}
            <div class="flex flex-wrap justify-between gap-x-2 text-sm">
              <MapEntityLink
                href={buildEntityUrl(npc.npcId, "npc")}
                onSelect={() => onSelectNpc(npc.npcId)}
                onHoverStart={() => onHoverNpc?.(npc.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
                >{npc.npcName}</MapEntityLink
              >
              <span class="text-muted-foreground"
                >{`${
                  npc.isGiver && npc.isTurnIn
                    ? "Start and finish"
                    : npc.isGiver
                      ? "Start"
                      : "Finish"
                }${npc.zoneName ? ` (${npc.zoneName})` : ""}`}</span
              >
            </div>
          {/each}
        </div>
      </section>
    {/if}
    {#if objectives.length}
      <section class="space-y-2 border-t pt-2">
        <h3 class="font-medium">Objectives</h3>
        <div class="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-2">
          {#each objectives as objective (objective.id)}
            <div class="text-sm">
              <p class="text-muted-foreground">
                {objectiveLabels[
                  objective.role
                ]}{#if objective.amount !== null && objective.kind !== "location"}
                  {objective.amount} x{/if}
              </p>
              {@render objectiveTarget(objective)}
            </div>
          {/each}
        </div>
      </section>
    {/if}
    {#if locations.length}
      <section class="space-y-2 border-t pt-2">
        <h3 class="font-medium">Locations</h3>
        <div class="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-2">
          {#each locations as location (location.id)}
            <div class="text-sm">{@render objectiveTarget(location)}</div>
          {/each}
        </div>
      </section>
    {/if}
    <Requirements roots={visibleRequirements} names={details.names} />
    {#if details.exp > 0}<p class="border-t pt-2 text-sm">
        Experience: {formatNumber(details.exp)}
      </p>{/if}
    {#if acquisitionData}
      <AcquisitionMethods
        data={acquisitionData}
        selectedQuestId={details.id}
        {onSelectItem}
      />
    {/if}
  </PopupCard>
{/if}
