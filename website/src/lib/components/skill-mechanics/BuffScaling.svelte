<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { hasNonZeroField } from "$lib/utils/formatSkillEffect";
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
              Wisdom does not change this song.
            </p>
            {#if hasNonZeroField(skill.healing_per_second_bonus)}
              <!-- Source: server-scripts/Skills.cs:323-359 — ApplyCriticalToOverTime multiplies an eligible recovery tick by 1.5 on a critical roll. -->
              <p class="text-muted-foreground">
                Each healing tick can critically heal for 150% at the caster's
                critical chance.
              </p>
            {/if}
          {/if}
        {/if}
      </div>
    {/each}
  {/each}
</div>
