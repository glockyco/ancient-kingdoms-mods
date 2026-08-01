<script lang="ts" module>
  import { SOURCE_TYPE_CONFIG } from "$lib/constants/source-types";

  export interface SourceLinkGroup {
    type: keyof typeof SOURCE_TYPE_CONFIG;
    sources: { id: string; name: string }[];
  }
</script>

<script lang="ts">
  interface Props {
    groups: SourceLinkGroup[];
    /**
     * Sources shown per type before the rest collapse into "+N more". Tune it
     * per surface: a wide table carries more names than a narrow one.
     */
    limit?: number;
    /** Item page that the "+N more" link opens. */
    itemId: string;
    /** Rendered when the item has no known source. */
    emptyLabel?: string;
  }

  let { groups, limit = 3, itemId, emptyLabel = "Unknown" }: Props = $props();
</script>

{#if groups.length > 0}
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    {#each groups as group (group.type)}
      {@const config = SOURCE_TYPE_CONFIG[group.type]}
      {@const shown = group.sources.slice(0, limit)}
      {@const hidden = group.sources.length - shown.length}
      <span class="flex flex-wrap items-center gap-1.5">
        <config.icon
          class="h-4 w-4 shrink-0 {config.color}"
          aria-hidden="true"
        />
        {#each shown as source, index (source.id)}
          <a
            href="{config.linkPrefix}{source.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{source.name}</a
          >{#if index < shown.length - 1}<span class="text-muted-foreground"
              >,</span
            >{/if}
        {/each}
        {#if hidden > 0}
          <a
            href="/items/{itemId}"
            class="whitespace-nowrap text-xs text-muted-foreground hover:underline"
            >+{hidden} more</a
          >
        {/if}
      </span>
    {/each}
  </div>
{:else}
  <span class="text-muted-foreground">{emptyLabel}</span>
{/if}
