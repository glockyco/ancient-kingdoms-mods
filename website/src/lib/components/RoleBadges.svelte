<script lang="ts">
  import type { NpcRoles } from "$lib/types/npcs";
  import { getActiveRoles, type RoleCategory } from "$lib/utils/roles";
  import Scroll from "@lucide/svelte/icons/scroll";
  import ShoppingBag from "@lucide/svelte/icons/shopping-bag";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Shield from "@lucide/svelte/icons/shield";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";

  interface Props {
    /** NPC roles object */
    roles: NpcRoles;
    /** Additional CSS classes for the container */
    class?: string;
  }

  let { roles, class: className = "" }: Props = $props();

  const activeRoles = $derived(getActiveRoles(roles));

  const categoryColors: Record<RoleCategory, string> = {
    quest: "text-orange-500",
    merchant: "text-green-500",
    service: "text-blue-500",
    special: "text-purple-500",
    combat: "text-red-500",
    renewal: "text-teal-500",
  };
</script>

{#snippet categoryIcon(category: RoleCategory)}
  {#if category === "quest"}
    <Scroll class="h-3 w-3 {categoryColors[category]}" />
  {:else if category === "merchant"}
    <ShoppingBag class="h-3 w-3 {categoryColors[category]}" />
  {:else if category === "service"}
    <Wrench class="h-3 w-3 {categoryColors[category]}" />
  {:else if category === "special"}
    <Sparkles class="h-3 w-3 {categoryColors[category]}" />
  {:else if category === "combat"}
    <Shield class="h-3 w-3 {categoryColors[category]}" />
  {:else if category === "renewal"}
    <RefreshCw class="h-3 w-3 {categoryColors[category]}" />
  {/if}
{/snippet}

{#if activeRoles.length > 0}
  <div class="flex flex-wrap gap-1 {className}">
    {#each activeRoles as role (role.key)}
      <span
        class="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs"
      >
        {@render categoryIcon(role.category)}
        {role.label}
      </span>
    {/each}
  </div>
{:else}
  <span class="text-muted-foreground">-</span>
{/if}
