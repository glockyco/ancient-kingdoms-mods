<script lang="ts">
  import type { ItemUseView } from "$lib/acquisition/types";
  import Requirements from "./Requirements.svelte";
  import MethodList from "./MethodList.svelte";
  import MapLink from "../MapLink.svelte";
  import { useRoleLabel, type DisplayItems } from "./display";
  let {
    uses,
    items = {},
    names: suppliedNames = {},
    parentScroll = false,
  }: {
    uses: readonly ItemUseView[];
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
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
  {#each uses as use (use)}
    {#if use.method}
      <MethodList methods={[use.method]} {items} {names} {parentScroll} />
    {:else}
      <article class="rounded-md border bg-muted/30 p-4 space-y-2">
        <h3 class="font-semibold">
          {use.entity?.kind === "portal"
            ? "Portal key"
            : useRoleLabel(use.role, use.method)}
        </h3>
        {#if use.compatibility}
          <div class="space-y-2">
            <p>
              {#if use.compatibility.categoryRule === "in"}Compatible equipment
                categories: {use.compatibility.categories.join(
                  ", ",
                )}.{:else}Compatible with equipment outside these categories: {use.compatibility.categories.join(
                  ", ",
                )}.{/if}{#if use.compatibility.excludedItemTypes.length}
                Excludes {use.compatibility.excludedItemTypes.join(", ")} items.{/if}
            </p>
            {#if use.compatibility.recoverable}<p>
                Recover this augment through an Augmenter for {use.compatibility.normalRecoveryGold.toLocaleString(
                  "en-US",
                )} gold. Recovery returns the augment to inventory.
              </p>{/if}
          </div>
        {:else if use.role === "retained" && use.entity?.kind === "portal"}
          <p>Not consumed.</p>
        {/if}
        {#if use.entity?.kind === "summon_trigger"}
          <p>{names[use.entity.id] ?? "Summoning condition"}</p>
        {:else if use.entity && (use.entity.kind !== "portal" || !use.useLocations.length)}
          <a
            class="text-blue-600 hover:underline dark:text-blue-400"
            href={use.entity.kind === "portal"
              ? `/map?entity=${use.entity.id}&etype=portal`
              : `/${use.entity.kind === "quest" ? "quests" : use.entity.kind === "skill" ? "skills" : use.entity.kind === "resource" ? "gather-items" : "items"}/${use.entity.id}`}
            >{names[use.entity.id] ?? use.entity.kind}</a
          >
        {/if}
        <Requirements roots={use.requirements} {names} />
        {#each use.useLocations as location (`${location.provider.kind}:${location.provider.id}`)}
          <div class="flex items-center flex-wrap gap-2">
            {location.name}{#if location.geometryVisibility === "visible" && location.provider.kind === "treasure_locations"}<MapLink
                entityId={location.provider.id}
                entityType="treasure"
                compact
              />{:else if location.geometryVisibility === "visible" && location.provider.kind === "portals"}<MapLink
                entityId={location.provider.id}
                entityType="portal"
                compact
              />{:else if location.geometryVisibility === "suppressed"}<span
                class="text-sm text-muted-foreground"
                >location not published</span
              >{/if}
          </div>
        {/each}
      </article>
    {/if}
  {/each}
</div>
