<script lang="ts">
  import type { ItemUseView } from "$lib/acquisition/types";
  import UseCards from "./UseCards.svelte";
  import ScrollRegion from "./ScrollRegion.svelte";
  import {
    methodGroupKey,
    methodLabel,
    useRoleLabel,
    USE_ENTITY_LABELS,
    type DisplayItems,
  } from "./display";
  let {
    uses,
    items = {},
    names = {},
  }: {
    uses: readonly ItemUseView[];
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
  } = $props();
  const groups = $derived([...Map.groupBy(uses, useGroupKey).values()]);

  function useGroupKey(use: ItemUseView): string {
    return use.method
      ? methodGroupKey(use.method)
      : (use.entity?.kind ?? use.kind);
  }

  function chestUseLabel(use: ItemUseView): string {
    const zones: Record<string, true> = Object.create(null);
    for (const provider of use.method?.providers ?? []) {
      const zoneId = provider.location?.zoneId;
      const zone = zoneId && (names[`zones:${zoneId}`] ?? names[zoneId]);
      if (zone) zones[zone] = true;
    }
    const zoneNames = Object.keys(zones);
    return zoneNames.length ? `Chest in ${zoneNames.join(", ")}` : "Chest";
  }
</script>

<div class="space-y-3">
  {#each groups as group (useGroupKey(group[0]))}
    {#if group.length <= 6}<UseCards uses={group} {items} {names} />
    {:else}
      <details class="rounded-md border bg-muted/30 p-4">
        <summary
          class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
          >Show all {group.length.toLocaleString("en-US")}
          {group[0].method
            ? methodLabel(group[0].method).toLowerCase()
            : group[0].entity
              ? USE_ENTITY_LABELS[group[0].entity.kind]
              : useRoleLabel(group[0].role).toLowerCase()} uses</summary
        >
        <ScrollRegion
          className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-2"
          label="All uses"
        >
          {#each group as use (use)}
            {@const output = use.method?.outputs.find(
              (output) => output.item_id,
            )}
            <details class="rounded-md border bg-background p-3">
              <summary class="cursor-pointer"
                >{use.method?.kind === "world_chest"
                  ? chestUseLabel(use)
                  : output?.item_id
                    ? (items[output.item_id]?.name ??
                      output.item_id.replaceAll("_", " "))
                    : use.entity
                      ? (names[use.entity.id] ?? use.entity.kind)
                      : useRoleLabel(use.role, use.method)}</summary
              >
              <div class="mt-3">
                <UseCards uses={[use]} {items} {names} parentScroll />
              </div>
            </details>
          {/each}
        </ScrollRegion>
      </details>
    {/if}
  {/each}
</div>
