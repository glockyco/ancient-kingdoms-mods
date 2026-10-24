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
          Critical heals restore double Hit Points, or triple in 10% of critical
          heals. The chance is the caster's Critical Strike.
          {#if ctx.casters.some((caster) => caster.kind === "player" || caster.kind === "any_player")}
            <!-- Source: server-scripts/UICharacterInfo.cs:Update — the character window displays the player's combat.criticalChance. -->
            Your Critical Strike is shown in the character window.
          {/if}
          {#if skill.skill_type === "area_heal"}
            An area heal is critical for all recipients or none.
          {/if}
        </p>
        {#if skill.skill_type === "target_heal" && (skill.is_pet_skill || skill.is_mercenary_skill) && skill.heals_mana}
          <!-- Source: server-scripts/TargetHealSkill.cs:172-175 — a critical pet heal rolls the resource multiplier independently of the Health multiplier. -->
          <p class="text-muted-foreground">
            A critical pet heal also restores double Mana or Rage, or triple in
            10% of cases. Its triple-restoration roll is separate from the Hit
            Points roll.
          </p>
        {/if}
      {/if}
    </div>
  {/each}
</div>
