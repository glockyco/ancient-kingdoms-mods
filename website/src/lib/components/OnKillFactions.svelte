<script lang="ts">
  import type {
    KillReputationDirection,
    KillReputationEffect,
  } from "$lib/utils/killReputation";

  interface Props {
    /** Reputation changes applied when the entity is killed */
    effects: KillReputationEffect[];
  }

  let { effects }: Props = $props();

  const sign: Record<KillReputationDirection, string> = {
    improve: "+",
    decrease: "-",
  };
  const cls: Record<KillReputationDirection, string> = {
    improve: "text-green-600 dark:text-green-400",
    decrease: "text-red-600 dark:text-red-400",
  };
</script>

{#if effects.length > 0}
  <span>
    On Kill: {#each effects as effect, i (effect.direction)}{i > 0
        ? ", "
        : ""}<span class={cls[effect.direction]}
        >{sign[effect.direction]}{effect.amount}
        {effect.factions.join(" / ")}</span
      >{/each}
  </span>
{/if}
