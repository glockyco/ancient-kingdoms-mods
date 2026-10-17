<script lang="ts">
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Star from "@lucide/svelte/icons/star";
  import Sword from "@lucide/svelte/icons/sword";

  interface Props {
    isBoss: boolean;
    isFabled: boolean;
    isElite: boolean;
    class?: string;
  }

  let {
    isBoss,
    isFabled,
    isElite,
    class: className = "h-4 w-4",
  }: Props = $props();

  const color = $derived(
    isFabled
      ? "text-emerald-500 dark:text-emerald-400"
      : isBoss
        ? "text-cyan-600 dark:text-cyan-400"
        : isElite
          ? "text-purple-600 dark:text-purple-400"
          : "text-red-600 dark:text-red-400",
  );
</script>

<span
  class="inline-flex"
  title={isFabled ? "Fabled" : isBoss ? "Boss" : isElite ? "Elite" : "Regular"}
>
  <span class="sr-only"
    >{isFabled
      ? "Fabled"
      : isBoss
        ? "Boss"
        : isElite
          ? "Elite"
          : "Regular"}</span
  >
  {#if isFabled}
    <Star class="{className} {color}" />
  {:else if isBoss}
    <Crown class="{className} {color}" />
  {:else if isElite}
    <Shield class="{className} {color}" />
  {:else}
    <Sword class="{className} {color}" />
  {/if}
</span>
