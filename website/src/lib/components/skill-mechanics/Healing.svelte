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
          <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount; UIEquipmentMercenary.cs:Update — mercenary Wisdom uses no Ranger multiplier. -->
          The mercenary uses its own Wisdom, shown in its equipment window. A Ranger
          mercenary does not triple it.
        </p>
      {/if}
      {#if ctx.canCrit && skill.heals_health}
        <!-- Source: server-scripts/TargetHealSkill.cs:Apply; AreaHealSkill.cs:Apply — the caster's Critical Chance gates one double/triple heal roll before the recipients are healed. -->
        <p class="text-muted-foreground">
          A heal is critical at the caster's Critical Chance. A critical heal
          restores double Health, and 1 in 10 critical heals restores triple,
          still capped by missing Health.
          {#if ctx.casters.some((caster) => caster.kind === "player" || caster.kind === "any_player")}
            <!-- Source: server-scripts/UICharacterInfo.cs:Update — the character window displays the player's combat.criticalChance. -->
            Your Critical Chance is shown in the character window.
          {/if}
          {#if skill.skill_type === "area_heal"}
            An area heal rolls once for all recipients.
          {/if}
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
