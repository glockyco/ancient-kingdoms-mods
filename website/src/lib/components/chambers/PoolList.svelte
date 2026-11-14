<!--
  The encounter groups the Chambers place their guardians in, which together name all nine
  world monsters in the pool. Each links to the monster's own page, which describes the world
  version of the monster, not its rescaled Chambers version.
-->
<script lang="ts">
  import { resolve } from "$app/paths";
  import EntityLink from "$lib/components/EntityLink.svelte";

  interface Monster {
    id: string;
    name: string;
    visual_public_path: string | null;
  }

  let {
    groups,
    class: className = "",
  }: {
    groups: readonly {
      name: string;
      guards: Monster;
      support: Monster | null;
    }[];
    class?: string;
  } = $props();
</script>

{#snippet monster(entry: Monster)}
  <EntityLink
    variant="reference"
    href={resolve("/monsters/[id]", { id: entry.id })}
    name={entry.name}
    domain="monster"
    imageAvailable={entry.visual_public_path}
    size={32}
  />
{/snippet}

<div class={className}>
  <table class="w-full border-collapse text-sm">
    <thead
      ><tr class="border-b"
        ><th class="p-2 text-left font-medium text-foreground">Group</th><th
          class="p-2 text-left font-medium text-foreground">Guards</th
        ><th class="p-2 text-left font-medium text-foreground">Support</th></tr
      ></thead
    >
    <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
      {#each groups as group (group.name)}
        <tr class="border-b align-middle last:border-0">
          <td class="p-2 font-medium text-foreground">{group.name}</td>
          <td class="p-2">{@render monster(group.guards)}</td>
          <td class="p-2">
            {#if group.support}{@render monster(group.support)}{:else}
              <span class="text-muted-foreground">None</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
