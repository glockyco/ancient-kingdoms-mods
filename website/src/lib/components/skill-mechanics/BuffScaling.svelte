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
    {skill.is_bard_song ? "Song Scaling" : "Buff Scaling"}
  </h3>
  {#each spec.buffContexts as ctx (`${ctx.bonusAttrSource}:${ctx.isAreaBuff}`)}
    {#each calculationCasters(ctx.casters) as casters (calculationCasterLabel(casters))}
      <div class="space-y-2">
        <h4 class="font-medium text-muted-foreground">
          {calculationCasterLabel(casters)}
        </h4>
        {#if ctx.bonusAttrSource === "none"}
          <p class="text-muted-foreground">
            This buff receives no attribute bonus.
          </p>
        {:else}
          <Calculation
            calculation={effectScalingCalculation(
              skill,
              ctx.bonusAttrSource,
              false,
              isMercenaryGroup(casters),
            )}
          />
          {#if skill.scales_with_charisma}
            <!-- Source: server-scripts/BardSongSkill.cs:Apply; Skills.cs:307-318 — Charisma-scaled song heals skip the Wisdom healing bonus. -->
            <p class="text-muted-foreground">
              {#if (skill.healing_per_second_bonus?.base_value ?? 0) > 0}
                Wisdom does not change this song's healing.
              {:else}
                Songs scale with Charisma, not Wisdom or Intelligence.
              {/if}
            </p>
          {/if}
          {#if (skill.healing_per_second_bonus?.base_value ?? 0) > 0 && skill.duration_base < 30}
            <!-- Source: server-scripts/Skills.cs:ApplyCriticalToOverTime; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — healing ticks above 3 with base duration below 30 use the caster's stored Critical Chance and a rounded ×1.5. -->
            <p class="text-muted-foreground">
              A tick that heals more than 3 Health can be critical and heal
              150%, rounded. The chance is the caster's Critical Strike when the
              buff started.
            </p>
          {/if}
        {/if}
      </div>
    {/each}
  {/each}
</div>
