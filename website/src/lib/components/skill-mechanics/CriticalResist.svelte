<script lang="ts">
  import { statName, formatStat } from "$lib/stats";
  import { atRank } from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const amount = $derived(
    atRank(skill.critical_resist_bonus!, skill.max_level),
  );
</script>

<!-- Source: server-scripts/Combat.cs:295-307 (criticalResist, clamped 0-1), 530-535 (ApplyCriticalResistToMultiplier), 912-927 (crit damage), Dexterity.cs:34-37 -->
<div class="space-y-1">
  <h3 class="font-semibold">{statName("critical_resist")}</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >The affected character receives {formatStat("critical_resist", amount)}
      Critical Resist at rank {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""}, which reduces the extra damage from critical hits.</span
    >
    <span class="block"
      >See <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#critical-hits">critical damage reduction</a
      >.</span
    >
    <span class="block"
      >At 100% Critical Resist, a critical hit deals the same damage as an
      ordinary hit.</span
    >
    <span class="block"
      >Each point of Dexterity above 0 adds 0.05% Critical Resist.</span
    >
    <span class="block"
      >Gear and buffs can add more, up to a total of 100%.</span
    >
  </p>
</div>
