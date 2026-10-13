<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/Combat.cs:1534-1578; TargetDebuffSkill.cs:105-143; AreaDebuffSkill.cs:104-139 — the debuff resist chance adds 0.0005 per point of Defense or the matching resist, at most 0.9. -->
<p class="text-muted-foreground">
  The target's {debuffResistance} gives it 5 percentage points of chance per 100 points
  to resist this {skill.is_dispel ? "skill" : "debuff"}, at most 90%. See
  <a
    class="text-blue-600 dark:text-blue-400 hover:underline"
    href="/mechanics/combat#resistance">resistance and avoidance</a
  > for Accuracy and level differences.
</p>
