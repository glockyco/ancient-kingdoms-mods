<script lang="ts">
  import { immuneDebuffBypass } from "$lib/skills/skill-facts";
  import { getMechanicsContext } from "./context";
  import { statName } from "$lib/stats";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
  // Source: server-scripts/Skills.cs:GetFinalDamageDoT — melee, Intelligence-scaled poison or disease, poison, fire, cold and disease ticks are checked in that order, and any other tick meets Magic Resist.
  const tickStat = $derived(
    statName(
      skill.is_melee_debuff
        ? "armor_class"
        : skill.poison_disease_scales_with_intelligence &&
            (skill.is_poison_debuff || skill.is_disease_debuff)
          ? skill.is_disease_debuff
            ? "disease_resist"
            : "poison_resist"
          : skill.is_poison_debuff
            ? "poison_resist"
            : skill.is_fire_debuff
              ? "fire_resist"
              : skill.is_cold_debuff
                ? "cold_resist"
                : skill.is_disease_debuff
                  ? "disease_resist"
                  : "magic_resist",
    ),
  );
  const bypass = $derived(immuneDebuffBypass(skill, skill.max_level || 1));
</script>

<!-- Source: server-scripts/Combat.cs:GetProbResistMeleeDebuff,GetProbResistMagic,GetProbResistPoison,GetProbResistFire,GetProbResistCold,GetProbResistDisease; TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — typed debuffs add 0.0005 per matching resistance point; untyped debuffs skip this roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">Resist Chance</h3>
  <p class="text-muted-foreground">
    {#if debuffResistance}
      Each point of the target's {debuffResistance} adds 0.05 percentage points to
      its chance to resist this {skill.is_dispel ? "skill" : "debuff"}. Each 1%
      of the caster's Accuracy subtracts 1 percentage point. A higher-level
      target gains 0.5 percentage points per level and a lower-level one loses
      0.5, up to 10 either way. The chance stays between 0% and 90%. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#avoidance">resistance and avoidance</a
      >.
    {:else}
      The target gets no resist roll against this debuff.
    {/if}
  </p>
  {#if (skill.healing_per_second_bonus?.base_value ?? 0) < 0}
    <p class="text-muted-foreground">
      The target's {tickStat} reduces each damage tick by 0.05% per point, up to 90%.
      See
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
