<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { aggroCalculation } from "$lib/skills/effect-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByMercenary } = $derived(mechanics.facts);
</script>

<div class="space-y-2">
  <h3 class="font-semibold">Aggro</h3>
  <Calculation
    calculation={aggroCalculation(
      skill,
      skill.player_classes.length > 0
        ? "player"
        : usedByMercenary
          ? "mercenary"
          : "other",
    )}
  />
  {#if skill.skill_type === "target_damage" || (skill.skill_type === "area_damage" && !skill.is_bard_final_cadence)}
    <!-- Source: server-scripts/DamageSkill.cs:ToolTip; TargetDamageSkill.cs:249; AreaDamageSkill.cs:149-154 — the tooltip divides maximum Health by three, direct hits add it in full. -->
    <!-- Runtime verification: docs/game-bugs/threat-tooltip-understates-health-bonus.md -->
    <p class="text-muted-foreground">
      The skill's tooltip shows only a third of your maximum Health for this
      bonus, but the game adds all of it.
    </p>
  {/if}
</div>
