<script lang="ts">
  import { base } from "$app/paths";
  import { parseItemTooltip } from "$lib/utils/itemTooltip";

  interface Props {
    itemId: string;
    tooltipHtml: string | null;
  }

  let { itemId, tooltipHtml }: Props = $props();

  const iconBackgroundImage = $derived(
    `url("${base}/images/items/${itemId.replaceAll("-", "_")}/icon.png")`,
  );

  const parsedTooltip = $derived(parseItemTooltip(tooltipHtml));
</script>

<div class="flow-root text-sm tooltip-content">
  <span
    class="float-right ml-4 mb-2 h-10 w-10 shrink-0 rounded-[8px] border-2 p-0.5"
    style:border-color={parsedTooltip.titleColor}
    aria-hidden="true"
  >
    <span
      class="block h-full w-full rounded-[5px] bg-contain bg-center bg-no-repeat"
      style:background-image={iconBackgroundImage}
    ></span>
  </span>
  <div class="tooltip-body whitespace-pre-wrap">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html parsedTooltip.tooltipHtml}
  </div>
</div>
