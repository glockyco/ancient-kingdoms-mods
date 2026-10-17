<script lang="ts">
  import { immuneDebuffBypass } from "$lib/skills/skill-facts";
  import { getMechanicsContext } from "./context";
  import { statName } from "$lib/stats";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
  // Source: server-scripts/Skills.cs:GetFinalDamageDoT — melee, Intelligence-scaled poison or disease, other poison or disease, fire and cold ticks are checked in that order, and any other tick meets Magic Resist. The later disease branch is unreachable.
  const tickStat = $derived(
    statName(
      skill.is_melee_debuff
        ? "armor_class"
        : skill.is_poison_debuff || skill.is_disease_debuff
          ? skill.poison_disease_scales_with_intelligence &&
            skill.is_disease_debuff
            ? "disease_resist"
            : "poison_resist"
          : skill.is_fire_debuff
            ? "fire_resist"
            : skill.is_cold_debuff
              ? "cold_resist"
              : "magic_resist",
    ),
  );
  const diseaseTickDefect = $derived(
    !skill.is_melee_debuff &&
      skill.is_disease_debuff &&
      !skill.poison_disease_scales_with_intelligence,
  );
  const bypass = $derived(immuneDebuffBypass(skill, skill.max_level || 1));
</script>

<!-- Source: server-scripts/Combat.cs:GetProbResistMeleeDebuff,GetProbResistMagic,GetProbResistPoison,GetProbResistFire,GetProbResistCold,GetProbResistDisease; TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — typed debuffs add 0.0005 per matching resistance point; untyped debuffs skip this roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">Resist Chance</h3>
  <p class="text-muted-foreground">
    {#if debuffResistance}
      Every 100 points of the target's {debuffResistance} add 5 percentage points
      to its chance to resist this {skill.is_dispel ? "skill" : "debuff"}. Each
      1% of the caster's Accuracy subtracts 1 percentage point. Level
      differences also apply. The final chance is limited to 0-90%. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#avoidance">resistance and avoidance</a
      > for level adjustments.
    {:else}
      The target gets no resist roll against this debuff.
    {/if}
  </p>
  {#if (skill.healing_per_second_bonus?.base_value ?? 0) < 0}
    <!-- Runtime verification: docs/game-bugs/dexterity-scaled-disease-ticks-use-poison-resist.md -->
    <p class="text-muted-foreground">
      Every 100 points of the target's {tickStat} reduce each damage tick by 5%, up
      to 90%, with the reduction rounded up.{diseaseTickDefect
        ? " A game defect makes Poison Resist apply here instead of Disease Resist."
        : ""} See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-over-time"
        >damage-over-time calculations</a
      >.
    </p>
  {/if}
  <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — immunity lets through pure damage over time on bosses, and resistance-decrease skills and positive Health per second on other monsters. -->
  <p class="text-muted-foreground">
    {#if bypass.boss && bypass.otherMonster}
      Immune to Debuffs does not stop this debuff.
    {:else if bypass.boss}
      Bosses with Immune to Debuffs are still affected. Other monsters with that
      immunity are unaffected.
    {:else if bypass.otherMonster}
      Monsters whose pages list Immune to Debuffs are still affected, except
      bosses.
    {:else}
      This {skill.is_dispel ? "skill" : "debuff"} has no effect on monsters whose
      pages list Immune to Debuffs.
    {/if}
  </p>
</div>
