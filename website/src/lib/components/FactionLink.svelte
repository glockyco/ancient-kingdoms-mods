<script lang="ts">
  interface Props {
    /** Faction display name, as stored on the referencing row. */
    name: string;
    /**
     * Route id from `getFactionIdsByName()`. Absent for a name the factions
     * table does not know, in which case the name renders as plain text.
     */
    id?: string;
  }

  let { name, id }: Props = $props();
</script>

{#if id}
  <a
    href="/factions/{id}"
    class="text-blue-600 hover:underline dark:text-blue-400">{name}</a
  >
{:else}
  {name}
{/if}
