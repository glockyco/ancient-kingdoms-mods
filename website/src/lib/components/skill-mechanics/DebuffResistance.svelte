<script lang="ts">
  import { immuneDebuffBypass } from "$lib/skills/skill-facts";
  import { getMechanicsContext } from "./context";
  import { statName } from "$lib/stats";
  import { DEFENSE_RATES } from "$lib/calculation/combat";
  import ResistChance from "./ResistChance.svelte";

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

<!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — typed debuffs roll the matching resist; untyped debuffs skip this roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">Resist Chance</h3>
  <p class="text-muted-foreground">
    {#if debuffResistance}
      <ResistChance
        stat={debuffResistance}
        resists="this {skill.is_dispel ? 'skill' : 'debuff'}"
      />
      See
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
      The target's {tickStat} reduces each damage tick by {DEFENSE_RATES.reductionPerPoint}
      per point, up to {DEFENSE_RATES.maxReduction}. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-over-time"
        >damage-over-time calculations</a
      >.
    </p>
  {/if}
  <!-- Source: server-scripts/TargetDebuffSkill.cs:172-180; AreaDebuffSkill.cs:183-191; BuffSkill.cs:173-194 — immunity lets through pure damage over time with an optional slow on every flagged monster, plus resistance-decrease skills and positive Health Regeneration on non-boss monsters. -->
  <p class="text-muted-foreground">
    {#if bypass.boss && bypass.otherMonster}
      Immune to Debuffs does not stop this debuff.
    {:else if bypass.otherMonster}
      Monsters whose pages list Immune to Debuffs are still affected, except
      bosses.
    {:else}
      This {skill.is_dispel ? "skill" : "debuff"} has no effect on monsters whose
      pages list Immune to Debuffs.
    {/if}
  </p>
</div>
