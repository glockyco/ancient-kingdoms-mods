<script lang="ts">
  import type { IconNode } from "lucide";

  interface Props {
    icon: IconNode;
    size?: number;
    class?: string;
  }

  let { icon, size = 18, class: className = "" }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  {#each icon as [tag, attributes], index (`${tag}-${index}`)}
    <svelte:element this={tag} {...attributes} />
  {/each}
</svg>
