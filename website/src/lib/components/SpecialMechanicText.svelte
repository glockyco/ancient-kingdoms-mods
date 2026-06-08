<script lang="ts">
  import type { SpecialMechanicText } from "$lib/special-mechanics";

  interface Props {
    parts: SpecialMechanicText;
  }

  let { parts }: Props = $props();
</script>

{#each parts as part, index (index)}
  {#if typeof part === "string"}
    {part}{:else}<a
      href={part.href}
      class="text-blue-600 hover:underline dark:text-blue-400">{part.label}</a
    >
  {/if}
{/each}
