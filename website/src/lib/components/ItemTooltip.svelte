<script lang="ts">
  import { base } from "$app/paths";
  import type { EntityVisualAsset } from "$lib/types/visual-assets";
  import { parseItemTooltip } from "$lib/utils/itemTooltip";

  interface Props {
    tooltipHtml: string | null;
    visualAsset:
      | (Pick<EntityVisualAsset, "public_path"> &
          Partial<Pick<EntityVisualAsset, "width" | "height">>)
      | null;
  }

  let { tooltipHtml, visualAsset }: Props = $props();
  const parsedTooltip = $derived(parseItemTooltip(tooltipHtml));
</script>

<div class="flow-root text-sm tooltip-content">
  {#if visualAsset}
    <span
      class="float-right ml-4 mb-2 h-10 w-10 shrink-0 rounded-[8px] border-2 p-0.5"
      style:border-color={parsedTooltip.titleColor}
      aria-hidden="true"
    >
      <img
        src="{base}/{visualAsset.public_path}"
        width={visualAsset.width ?? undefined}
        height={visualAsset.height ?? undefined}
        alt=""
        class="block h-full w-full rounded-[5px] object-contain"
      />
    </span>
  {/if}
  <div class="tooltip-body whitespace-pre-wrap">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html parsedTooltip.tooltipHtml}
  </div>
</div>
