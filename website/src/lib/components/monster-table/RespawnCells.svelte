<script lang="ts">
  import type { RespawnInfo } from "$lib/types/respawn";
  import {
    formatRespawnTime,
    formatRespawnChance,
    formatSpecialSpawn,
  } from "$lib/utils/respawn";

  interface Props {
    columnId: string;
    row: RespawnInfo;
  }

  const { columnId, row }: Props = $props();
</script>

{#if columnId === "respawn_time"}
  <span class="ml-auto whitespace-nowrap">{formatRespawnTime(row)}</span>
{:else if columnId === "respawn_chance"}
  <span class="ml-auto">{formatRespawnChance(row)}</span>
{:else if columnId === "special"}
  <span class="ml-auto whitespace-nowrap">{formatSpecialSpawn(row)}</span>
{/if}
