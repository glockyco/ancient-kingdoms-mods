<script lang="ts">
  import type {
    KillReputationDirection,
    KillReputationEffect,
  } from "$lib/utils/killReputation";
  import FactionLink from "$lib/components/FactionLink.svelte";
  import { virtueHref } from "$lib/virtues/display";

  interface Props {
    /** Reputation changes applied when the entity is killed */
    effects: KillReputationEffect[];
    /** Faction display name to route id, from `getFactionIdsByName()`. */
    factionIds: Record<string, string>;
  }

  let { effects, factionIds }: Props = $props();

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
        >{sign[effect.direction]}{effect.amount}</span
      >
      {#each effect.factions as faction, j (faction)}{j > 0
          ? " / "
          : ""}<FactionLink
          name={faction}
          id={factionIds[faction]}
        />{/each}{/each}{#if effects.some((effect) => effect.direction === "improve")}
      <!-- Source: server-scripts/Player.cs:ApplyVirtueFactionGain — Honesty raises positive gains only. -->
      <span class="ml-1"
        >(more with <a
          href={virtueHref("honesty")}
          class="text-blue-600 dark:text-blue-400 hover:underline">Honesty</a
        >)</span
      >{/if}
  </span>
{/if}
