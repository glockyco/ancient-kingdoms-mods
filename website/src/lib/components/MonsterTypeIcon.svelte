<script lang="ts">
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Star from "@lucide/svelte/icons/star";
  import Sword from "@lucide/svelte/icons/sword";
  import Target from "@lucide/svelte/icons/target";

  interface Props {
    isBoss: boolean;
    isFabled: boolean;
    isElite: boolean;
    isDummy?: boolean;
    class?: string;
  }

  let {
    isBoss,
    isFabled,
    isElite,
    isDummy = false,
    class: className = "h-4 w-4",
  }: Props = $props();

  const color = $derived(
    isFabled
      ? "text-emerald-500 dark:text-emerald-400"
      : isBoss
        ? "text-cyan-600 dark:text-cyan-400"
        : isElite
          ? "text-purple-600 dark:text-purple-400"
          : isDummy
            ? "text-amber-600 dark:text-amber-400"
            : "text-red-600 dark:text-red-400",
  );
</script>

{#if isFabled}
  <Star class="{className} {color}" />
{:else if isBoss}
  <Crown class="{className} {color}" />
{:else if isElite}
  <Shield class="{className} {color}" />
{:else if isDummy}
  <Target class="{className} {color}" />
{:else}
  <Sword class="{className} {color}" />
{/if}
