<script lang="ts">
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Sword from "@lucide/svelte/icons/sword";

  interface Props {
    isBoss: boolean;
    isElite: boolean;
    class?: string;
  }

  let { isBoss, isElite, class: className = "h-4 w-4" }: Props = $props();

  const color = $derived(
    isBoss
      ? "text-cyan-600 dark:text-cyan-400"
      : isElite
        ? "text-purple-600 dark:text-purple-400"
        : "text-red-600 dark:text-red-400",
  );
</script>

{#if isBoss}
  <Crown class="{className} {color}" />
{:else if isElite}
  <Shield class="{className} {color}" />
{:else}
  <Sword class="{className} {color}" />
{/if}
