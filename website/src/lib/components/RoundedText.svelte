<!--
  Plain text in which each "rounded" that means to the nearest whole number,
  not "rounded up" or "rounded down", carries its definition.
-->
<script lang="ts">
  import RoundedTerm from "./RoundedTerm.svelte";

  let { text }: { text: string } = $props();

  const parts = $derived(text.split(/\b(rounded)\b(?! (?:up|down)\b)/));
</script>

{#each parts as part, index (index)}{#if index % 2 === 1}<RoundedTerm
    />{:else}{part}{/if}{/each}
