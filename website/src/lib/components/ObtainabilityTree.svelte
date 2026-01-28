<script lang="ts">
  import type {
    ObtainabilityNode,
    ObtainabilitySourceType,
  } from "$lib/types/recipes";
  import ObtainabilityTree from "./ObtainabilityTree.svelte";
  import ItemLink from "./ItemLink.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Skull from "@lucide/svelte/icons/skull";
  import Store from "@lucide/svelte/icons/store";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Box from "@lucide/svelte/icons/box";
  import Package from "@lucide/svelte/icons/package";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Combine from "@lucide/svelte/icons/combine";
  import Flame from "@lucide/svelte/icons/flame";
  import Shovel from "@lucide/svelte/icons/shovel";
  import Hammer from "@lucide/svelte/icons/hammer";
  import Dices from "@lucide/svelte/icons/dices";
  import BookOpen from "@lucide/svelte/icons/book-open";

  interface Props {
    node: ObtainabilityNode;
    defaultExpanded?: boolean;
    hideRootLink?: boolean;
  }

  let { node, defaultExpanded = true, hideRootLink = false }: Props = $props();
  // Capture initial prop value only - user controls toggle after mount
  let isExpanded = $state((() => defaultExpanded)());
  let isServiceExpanded = $state((() => defaultExpanded)());

  const hasRecipeChildren = $derived(
    !!node.recipe && node.recipe.materials.length > 0,
  );
  const hasServiceChildren = $derived(
    !!node.service && node.service.materials.length > 0,
  );
  const hasMergeChildren = $derived(
    !!node.merge && node.merge.materials.length > 0,
  );
  const hasLearningRequirement = $derived(!!node.recipe?.learningRequirement);
  const hasSources = $derived(node.sources.length > 0);
  const hasChildren = $derived(
    hasRecipeChildren ||
      hasServiceChildren ||
      hasMergeChildren ||
      hasLearningRequirement ||
      hasSources,
  );

  // Group sources by type
  const sourcesByType = $derived(
    Map.groupBy(node.sources, (source) => source.type),
  );

  const sourceConfig: Record<
    ObtainabilitySourceType,
    { icon: typeof Skull; color: string; label: string; linkPrefix: string }
  > = {
    drop: {
      icon: Skull,
      color: "text-red-500",
      label: "Drop",
      linkPrefix: "/monsters/",
    },
    vendor: {
      icon: Store,
      color: "text-green-500",
      label: "Vendor",
      linkPrefix: "/npcs/",
    },
    quest: {
      icon: ScrollText,
      color: "text-blue-500",
      label: "Quest",
      linkPrefix: "/quests/",
    },
    altar: {
      icon: Flame,
      color: "text-orange-500",
      label: "Altar",
      linkPrefix: "/altars/",
    },
    recipe: {
      icon: Hammer,
      color: "text-orange-500",
      label: "Recipe",
      linkPrefix: "/recipes/",
    },
    gather: {
      icon: Pickaxe,
      color: "text-amber-500",
      label: "Gather",
      linkPrefix: "/gather-items/",
    },
    chest: {
      icon: Box,
      color: "text-blue-500",
      label: "Chest",
      linkPrefix: "/chests/",
    },
    pack: {
      icon: Package,
      color: "text-cyan-500",
      label: "Pack",
      linkPrefix: "/items/",
    },
    random: {
      icon: Dices,
      color: "text-purple-500",
      label: "Random",
      linkPrefix: "/items/",
    },
    merge: {
      icon: Combine,
      color: "text-indigo-500",
      label: "Merge",
      linkPrefix: "/items/",
    },
    treasure_map: {
      icon: Shovel,
      color: "text-teal-500",
      label: "Treasure",
      linkPrefix: "/items/",
    },
    special: {
      icon: Sparkles,
      color: "text-purple-500",
      label: "Service",
      linkPrefix: "/npcs/",
    },
  };
</script>

{#snippet sourceList()}
  {#each sourcesByType as [type, sources] (type)}
    {@const config = sourceConfig[type]}
    {@const totalForType = node.sourceCountsByType[type] || sources.length}
    {@const moreCount = totalForType - sources.length}
    <div class="flex items-center gap-1.5 py-1 pl-4 whitespace-nowrap">
      <config.icon class="h-4 w-4 shrink-0 {config.color}" />
      <span class="text-muted-foreground">{config.label}:</span>
      <div class="flex items-center gap-1">
        {#each sources as source, i (source.id)}
          <a
            href="{config.linkPrefix}{source.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {source.name}
          </a>
          {#if i < sources.length - 1 || moreCount > 0}
            <span class="text-muted-foreground">,</span>
          {/if}
        {/each}
        {#if moreCount > 0}
          <span class="text-muted-foreground">
            +{moreCount} more
          </span>
        {/if}
      </div>
    </div>
  {/each}
{/snippet}

<div class={node.depth > 0 ? "ml-6" : ""}>
  <div class="flex items-center gap-2 py-1.5">
    {#if hasChildren}
      <button
        onclick={() => (isExpanded = !isExpanded)}
        class="p-0.5 rounded hover:bg-muted transition-colors"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {#if isExpanded}
          <ChevronDown class="h-4 w-4 text-muted-foreground" />
        {:else}
          <ChevronRight class="h-4 w-4 text-muted-foreground" />
        {/if}
      </button>
    {:else}
      <span class="w-5"></span>
    {/if}

    {#if hideRootLink && node.isRoot}
      <span>{node.item_name}</span>
    {:else}
      <ItemLink
        itemId={node.item_id}
        itemName={node.item_name}
        tooltipHtml={node.tooltip_html}
      />
    {/if}

    {#if node.amount > 1}
      <span class="text-muted-foreground text-sm">x{node.amount}</span>
    {/if}

    {#if !hasChildren}
      <span class="text-xs text-muted-foreground ml-2">Unknown source</span>
    {/if}
  </div>

  {#if hasChildren && isExpanded}
    <div class="border-l-2 border-muted ml-2.5">
      {#if hasRecipeChildren || hasLearningRequirement}
        {#each node.recipe?.materials ?? [] as child (child.item_id)}
          <ObtainabilityTree node={child} />
        {/each}
        {#if node.recipe?.learningRequirement}
          <div class="ml-6 py-1.5 flex items-center gap-1.5">
            <BookOpen class="h-4 w-4 shrink-0 text-orange-500" />
            <span class="text-muted-foreground text-sm">Requires recipe:</span>
          </div>
          <ObtainabilityTree node={node.recipe.learningRequirement} />
        {/if}
      {:else if hasServiceChildren}
        {#each sourcesByType as [type, sources] (type)}
          {@const config = sourceConfig[type]}
          {@const totalForType =
            node.sourceCountsByType[type] || sources.length}
          {@const moreCount = totalForType - sources.length}
          <div class="ml-6">
            <div class="flex items-center gap-1.5 py-1.5">
              <button
                onclick={() => (isServiceExpanded = !isServiceExpanded)}
                class="p-0.5 rounded hover:bg-muted transition-colors"
                aria-label={isServiceExpanded ? "Collapse" : "Expand"}
              >
                {#if isServiceExpanded}
                  <ChevronDown class="h-4 w-4 text-muted-foreground" />
                {:else}
                  <ChevronRight class="h-4 w-4 text-muted-foreground" />
                {/if}
              </button>
              <config.icon class="h-4 w-4 shrink-0 {config.color}" />
              <span class="text-muted-foreground">{config.label}:</span>
              <div class="flex items-center gap-1">
                {#each sources as source, i (source.id)}
                  <a
                    href="{config.linkPrefix}{source.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {source.name}
                  </a>
                  {#if i < sources.length - 1 || moreCount > 0}
                    <span class="text-muted-foreground">,</span>
                  {/if}
                {/each}
                {#if moreCount > 0}
                  <span class="text-muted-foreground">+{moreCount} more</span>
                {/if}
              </div>
            </div>
            {#if isServiceExpanded}
              <div class="border-l-2 border-muted ml-2.5">
                {#each node.service?.materials ?? [] as child (child.item_id)}
                  <ObtainabilityTree node={child} />
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {:else if hasMergeChildren}
        <div class="ml-6 py-1.5 flex items-center gap-1.5">
          <Combine class="h-4 w-4 shrink-0 text-purple-500" />
          <span class="text-muted-foreground text-sm">Merge components:</span>
        </div>
        {#each node.merge?.materials ?? [] as child (child.item_id)}
          <ObtainabilityTree node={child} />
        {/each}
      {:else if hasSources}
        {@render sourceList()}
      {/if}
    </div>
  {/if}
</div>
