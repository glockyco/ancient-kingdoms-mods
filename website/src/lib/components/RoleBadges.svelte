<script lang="ts">
  import type { NpcRoles } from "$lib/types/npcs";
  import { getActiveRoles, type RoleCategory } from "$lib/utils/roles";
  import { ICON_BADGE } from "$lib/styles/badge";
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
    <Scroll class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {:else if category === "merchant"}
    <ShoppingBag class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {:else if category === "service"}
    <Wrench class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {:else if category === "special"}
    <Sparkles class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {:else if category === "combat"}
    <Shield class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {:else if category === "renewal"}
    <RefreshCw class="{ICON_BADGE.iconSize} {categoryColors[category]}" />
  {/if}
{/snippet}

{#if activeRoles.length > 0}
  <div class="flex flex-wrap gap-1 {className}">
    {#each activeRoles as role (role.key)}
      <span class="{ICON_BADGE.base} {ICON_BADGE.static}">
        {@render categoryIcon(role.category)}
        {role.label}
      </span>
    {/each}
  </div>
{:else}
  <span class="text-muted-foreground">-</span>
{/if}
