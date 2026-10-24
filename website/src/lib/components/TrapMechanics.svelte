<script lang="ts">
  import {
    TRAP_TYPE_DESCRIPTIONS,
    TRAP_TYPE_LABELS,
    type TrapType,
  } from "$lib/constants/traps";

  interface Props {
    type: TrapType;
    fireInterval: number | null;
    compact?: boolean;
  }

  let { type, fireInterval, compact = false }: Props = $props();

  const details = $derived(
    fireInterval != null ? `Fires every ${fireInterval}s.` : "",
  );
</script>

<!-- Source: server-scripts/Trap.cs:67-104,182-201 and server-scripts/Player.cs:HasDetectTraps — contact effects and player disarming.
     Source: server-scripts/TrapDetection.cs:Update — active Rogue and Bard mercenaries detect and disarm traps.
     Source: server-scripts/DangerousGround.cs:24-31 — area effect retrigger interval.
     Source: server-scripts/WallTrap.cs:24-31,34-66 — fire interval, overlap area, and direct damage. -->
<span class="text-sm text-muted-foreground">
  {#if type === "disarmable" && compact}
    {TRAP_TYPE_LABELS[type]}
  {:else if type === "wall_trap" && fireInterval != null}
    Fires into its area every {fireInterval}s and can damage you while you are
    inside.
  {:else}
    {TRAP_TYPE_DESCRIPTIONS[type]}
  {/if}
  {#if type === "disarmable" && !compact}
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
    can disarm it. An active Rogue or Bard mercenary disarms it automatically.
  {/if}
  {#if details && type !== "wall_trap"}
    {details}{/if}
</span>
