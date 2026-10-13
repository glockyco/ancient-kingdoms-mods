<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { calculationCasterLabel } from "$lib/skills/damage-calculations";
  import { healingCalculation } from "$lib/skills/effect-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, spec } = $derived(mechanics);
</script>

<div class="space-y-3">
  <h3 class="font-semibold">Healing</h3>
  {#each spec.healContexts as ctx (ctx.bonusKind)}
    <div class="space-y-2">
      <h4 class="font-medium text-muted-foreground">
        {calculationCasterLabel(ctx.casters)}
      </h4>
      <Calculation calculation={healingCalculation(skill, ctx.bonusKind)} />
      {#if ctx.bonusKind === "merc"}
        <p class="text-muted-foreground">
          Mercenaries use their own Wisdom. Player Rangers use three times their
          Wisdom.
        </p>
      {/if}
      {#if ctx.canCrit && skill.heals_health}
        <!-- Source: server-scripts/TargetHealSkill.cs:273-280; AreaHealSkill.cs:109-117 — critical heal doubles, with a 10% triple-heal roll, capped by missing Health. -->
        <p class="text-muted-foreground">
          Critical heals restore double Health, or triple Health in 10% of
          cases.
        </p>
        {#if skill.skill_type === "target_heal" && (skill.is_pet_skill || skill.is_mercenary_skill) && skill.heals_mana}
          <!-- Source: server-scripts/TargetHealSkill.cs:155-158 — a critical pet heal rolls the resource multiplier independently of the Health multiplier. -->
          <p class="text-muted-foreground">
            A critical pet heal also restores double Mana or Rage, or triple in
            10% of cases. Its triple-restoration roll is separate from the
            Health roll.
          </p>
        {/if}
      {/if}
    </div>
  {/each}
</div>
