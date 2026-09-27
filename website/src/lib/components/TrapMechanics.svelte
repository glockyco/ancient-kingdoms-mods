<script lang="ts">
  import { TRAP_TYPE_DESCRIPTIONS, type TrapType } from "$lib/constants/traps";

  interface Props {
    type: TrapType;
    fireInterval: number | null;
  }

  let { type, fireInterval }: Props = $props();

  const details = $derived(
    fireInterval != null ? `Fires every ${fireInterval}s.` : "",
  );
</script>

<!-- Source: server-scripts/Trap.cs:67-104,181-197 and server-scripts/Player.cs:HasDetectTraps — contact effects and player disarming.
     Source: server-scripts/TrapDetection.cs:Update — active Rogue and Bard mercenaries detect and disarm traps.
     Source: server-scripts/DangerousGround.cs:24-31 — area effect retrigger interval.
     Source: server-scripts/WallTrap.cs:24-31,34-66 — fire interval, overlap area, and direct damage. -->
<span class="text-sm text-muted-foreground">
  {TRAP_TYPE_DESCRIPTIONS[type]}
  {#if type === "disarmable"}
    A Rogue with
    <a
      href="/skills/detect_traps"
      class="text-blue-600 dark:text-blue-400 hover:underline">Detect Traps</a
    >
    or a Bard with
    <a
      href="/skills/sharp_senses"
      class="text-blue-600 dark:text-blue-400 hover:underline">Sharp Senses</a
    >
    can disarm the trap. Active Rogue and Bard mercenaries can disarm the trap automatically.
  {/if}
  {#if details}
    {details}{/if}
</span>
