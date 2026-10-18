<script lang="ts">
  import type { MethodView } from "$lib/acquisition/types";
  import { methodLabel, providerHref, recipeHref } from "./acquisition/display";
  import ScrollRegion from "./acquisition/ScrollRegion.svelte";
  let {
    sources,
    emptyLabel = "Unknown",
    itemId,
    names = {},
  }: {
    sources: readonly MethodView[];
    emptyLabel?: string;
    itemId?: string;
    names?: Readonly<Record<string, string>>;
  } = $props();
  const groups = $derived(
    [
      ...Map.groupBy(sources, (method) =>
        method.kind === "recipe"
          ? `recipe:${method.detail.display_kind}`
          : method.kind,
      ).values(),
    ].map((group) => {
      if (group[0].kind !== "kill" && group[0].kind !== "gather") return group;
      return [
        ...Map.groupBy(group, (method) =>
          String(
            method.kind === "kill"
              ? method.detail.monster_id
              : method.detail.resource_id,
          ),
        ).values(),
      ].map(([method]) => method);
    }),
  );
</script>

{#snippet links(method: MethodView)}
  <span>
    {#if method.kind === "kill"}<a
        class="text-blue-600 hover:underline dark:text-blue-400"
        href="/monsters/{method.detail.monster_id}"
        >{names[`monsters:${method.detail.monster_id}`] ??
          names[String(method.detail.monster_id)] ??
          method.providers[0]?.name}</a
      >
    {:else if method.kind === "gather"}<a
        class="text-blue-600 hover:underline dark:text-blue-400"
        href="/gather-items/{method.detail.resource_id}"
        >{names[`gathering_resources:${method.detail.resource_id}`] ??
          names[String(method.detail.resource_id)] ??
          method.providers[0]?.name}</a
      >
    {:else if method.providers.length}
      {#each method.providers as provider, index (provider)}
        {#if providerHref(provider.ref)}<a
            class="text-blue-600 hover:underline dark:text-blue-400"
            href={providerHref(provider.ref)}>{provider.name}</a
          >{:else}{provider.name}{/if}{index < method.providers.length - 1
          ? ", "
          : ""}
      {/each}
    {:else if recipeHref(method)}<a
        class="text-blue-600 hover:underline dark:text-blue-400"
        href={recipeHref(method)}
        >{names[String(method.detail.declared_result_item_id)] ??
          "Recipe details"}</a
      >
    {:else if method.homeProviders.length}home workstation
    {:else}{method.kind === "creation"
        ? "character creation"
        : method.kind === "housing"
          ? "house panel"
          : method.kind === "cap_xp"
            ? "XP cycle"
            : "carried-item action"}{/if}
  </span>
{/snippet}
{#if sources.length}
  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
    {#each groups as group (group[0].kind === "recipe" ? `recipe:${group[0].detail.display_kind}` : group[0].kind)}
      {@const providerCount =
        group[0].kind === "kill" || group[0].kind === "gather"
          ? group.length
          : new Set(
              group.flatMap((method) =>
                method.providers.map(
                  (provider) => `${provider.ref.kind}:${provider.ref.id}`,
                ),
              ),
            ).size}
      {#if group.length > 3 || providerCount > 4}
        <details>
          <summary
            class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
            >{methodLabel(group[0])}</summary
          >
          <ScrollRegion
            className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-2"
            label="All source links"
          >
            {#each group as method (method.methodId)}<div>
                {@render links(method)}
              </div>{/each}
            {#if itemId}<a
                class="block text-blue-600 hover:underline dark:text-blue-400"
                href="/items/{itemId}">Quantities, costs and requirements</a
              >{/if}
          </ScrollRegion>
        </details>
      {:else}
        <span
          ><span class="text-muted-foreground">{methodLabel(group[0])}:</span>
          {#each group as method, index (method.methodId)}{@render links(
              method,
            )}{index < group.length - 1 ? ", " : ""}{/each}</span
        >
      {/if}
    {/each}
  </div>
{:else}<span class="text-muted-foreground">{emptyLabel}</span>{/if}
