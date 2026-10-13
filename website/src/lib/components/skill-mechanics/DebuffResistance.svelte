<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/Combat.cs:GetProbResistMeleeDebuff,GetProbResistMagic,GetProbResistPoison,GetProbResistFire,GetProbResistCold,GetProbResistDisease; TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — typed debuffs add 0.0005 per matching resistance point; untyped debuffs skip this roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">Resist Chance</h3>
  <p class="text-muted-foreground">
    {#if debuffResistance}
      The target's {debuffResistance} gives it 5 percentage points of chance per 100
      points to resist this {skill.is_dispel ? "skill" : "debuff"}, at most 90%.
      See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#resistance">resistance and avoidance</a
      > for Accuracy and level differences.
    {:else}
      This debuff has no resistance-stat roll.
    {/if}
  </p>
  {#if (skill.player_classes.length > 0 || mechanics.facts.usedByMercenary || mechanics.facts.usedByCompanion || skill.is_scroll) && !skill.is_decrease_resists_skill && (skill.healing_per_second_bonus?.base_value ?? 0) <= 0}
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — immunity blocks debuffs except resistance-decrease skills and positive Health-per-second effects. -->
    <p class="text-muted-foreground">
      Monsters marked Immune to Debuffs ignore this skill.
    </p>
  {/if}
</div>
