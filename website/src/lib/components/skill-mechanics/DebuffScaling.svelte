<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    calculationCasters,
    calculationCasterLabel,
    isMercenaryGroup,
  } from "$lib/skills/damage-calculations";
  import { effectScalingCalculation } from "$lib/skills/effect-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, spec } = $derived(mechanics);
</script>

<div class="space-y-3">
  <h3 class="font-semibold">
    {skill.is_bard_song ? "Song Scaling" : "Debuff Scaling"}
  </h3>
  {#each spec.debuffContexts as ctx (ctx.bonusAttrKind)}
    {#each calculationCasters(ctx.casters) as casters (calculationCasterLabel(casters))}
      <div class="space-y-2">
        <h4 class="font-medium text-muted-foreground">
          {calculationCasterLabel(casters)}
        </h4>
        {#if ctx.bonusAttrKind === "none"}
          <p class="text-muted-foreground">
            This debuff receives no attribute bonus.
          </p>
        {:else}
          <Calculation
            calculation={effectScalingCalculation(
              skill,
              ctx.bonusAttrKind,
              true,
              isMercenaryGroup(casters),
            )}
          />
          {#if (skill.healing_per_second_bonus?.base_value ?? 0) < 0}
            <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT — resistance, cleanse layers and tick bonuses apply after the skill's attribute scaling. -->
            <p class="text-muted-foreground">
              The target's resistance and other tick modifiers change the damage
              that lands. See <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#debuffs"
                >damage-over-time calculations</a
              >.
            </p>
          {/if}
          {#if skill.scales_with_charisma}
            <!-- Source: server-scripts/BuffSkill.cs:473-478 — Charisma scaling precedes all other attribute branches. -->
            <p class="text-muted-foreground">
              Songs scale with Charisma, not Wisdom or Intelligence.
            </p>
          {/if}
        {/if}
      </div>
    {/each}
  {/each}
</div>
