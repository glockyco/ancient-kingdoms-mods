<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { debuffResistance } = $derived(mechanics.facts);
  // Source: server-scripts/Skills.cs:GetFinalDamageDoT — melee, Intelligence-scaled poison or disease, other poison or disease, fire and cold ticks are checked in that order, and any other tick meets Magic Resist. The later disease branch is unreachable.
  const tickStat = $derived(
    skill.is_melee_debuff
      ? "Armor Class"
      : skill.is_poison_debuff || skill.is_disease_debuff
        ? skill.poison_disease_scales_with_intelligence &&
          skill.is_disease_debuff
          ? "Disease Resist"
          : "Poison Resist"
        : skill.is_fire_debuff
          ? "Fire Resist"
          : skill.is_cold_debuff
            ? "Cold Resist"
            : "Magic Resist",
  );
  const diseaseTickDefect = $derived(
    !skill.is_melee_debuff &&
      skill.is_disease_debuff &&
      !skill.poison_disease_scales_with_intelligence,
  );
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
  {#if (skill.healing_per_second_bonus?.base_value ?? 0) < 0}
    <!-- Runtime verification: docs/game-bugs/dexterity-scaled-disease-ticks-use-poison-resist.md -->
    <p class="text-muted-foreground">
      Once it lands, the target's {tickStat} reduces each tick by 5% per 100 points,
      at most 90%, with the reduction rounded up.{diseaseTickDefect
        ? " Because of a game defect, Poison Resist reduces this disease damage instead of Disease Resist."
        : ""} Cleanse layers and other tick modifiers also change the damage that
      lands. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#debuffs">damage-over-time calculations</a
      >.
    </p>
  {/if}
  {#if (skill.player_classes.length > 0 || mechanics.facts.usedByMercenary || mechanics.facts.usedByCompanion || skill.is_scroll) && !skill.is_decrease_resists_skill && (skill.healing_per_second_bonus?.base_value ?? 0) <= 0}
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — immunity blocks debuffs except resistance-decrease skills and positive Health-per-second effects. -->
    <p class="text-muted-foreground">
      This {skill.is_dispel ? "skill" : "debuff"} has no effect on monsters whose
      pages list Immune to Debuffs.
    </p>
  {/if}
</div>
