<script lang="ts">
  import { TRAP_TYPE_DESCRIPTIONS, type TrapType } from "$lib/constants/traps";

  interface Props {
    type: TrapType;
    fireInterval: number | null;
    trapWidth: number | null;
    trapHeight: number | null;
  }

  let { type, fireInterval, trapWidth, trapHeight }: Props = $props();

  const details = $derived.by(() => {
    const parts: string[] = [];
    if (fireInterval != null) parts.push(`Fires every ${fireInterval}s.`);
    if (trapWidth != null && trapHeight != null) {
      parts.push(`${trapWidth} × ${trapHeight} area.`);
    }
    return parts.join(" ");
  });
</script>

<!-- Source: server-scripts/Trap.cs:67-104,181-197 — contact effects, teleporting, and Rogue disarming.
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
    can disarm it.
  {/if}
  {#if details}
    {details}{/if}
</span>
