<script lang="ts">
  interface Props {
    /** Factions whose reputation increases when the entity is killed */
    improve: string[];
    /** Factions whose reputation decreases when the entity is killed */
    decrease: string[];
  }

  let { improve, decrease }: Props = $props();

  type FactionEffect = { name: string; sign: "+" | "-"; cls: string };

  const factions = $derived<FactionEffect[]>([
    ...improve.map((name) => ({
      name,
      sign: "+" as const,
      cls: "text-green-600 dark:text-green-400",
    })),
    ...decrease.map((name) => ({
      name,
      sign: "-" as const,
      cls: "text-red-600 dark:text-red-400",
    })),
  ]);
</script>

{#if factions.length > 0}
  <span>
    On Kill: {#each factions as faction, i (faction.name)}{i > 0
        ? ", "
        : ""}<span class={faction.cls}>{faction.sign}{faction.name}</span
      >{/each}
  </span>
{/if}
