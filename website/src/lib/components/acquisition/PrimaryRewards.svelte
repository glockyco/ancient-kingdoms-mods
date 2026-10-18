<script lang="ts">
  import type { PrimaryReward } from "$lib/utils/primary-rewards";
  import { quantityText, deliveryText } from "./display";
  let { rewards }: { rewards: readonly PrimaryReward[] } = $props();
</script>

{#each rewards as reward (JSON.stringify( [reward.resourceKind, reward.itemId, reward.delivery, reward.withheld] ))}
  <div class="flex flex-wrap items-baseline gap-x-2">
    {#if reward.resourceKind === "gold"}
      <span class="text-yellow-600 dark:text-yellow-400">Gold</span>
    {:else if reward.itemId}
      <a
        href="/items/{reward.itemId}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >{reward.itemName ?? reward.itemId.replaceAll("_", " ")}</a
      >
    {:else}
      <span>Unpublished item</span>
    {/if}
    {#if reward.quantity.kind !== "unknown"}
      <span class="text-muted-foreground">×{quantityText(reward.quantity)}</span
      >
    {/if}
    {#if reward.delivery !== "inventory"}
      <span class="text-sm text-muted-foreground"
        >{deliveryText(reward.delivery)}</span
      >
    {/if}
  </div>
{/each}
