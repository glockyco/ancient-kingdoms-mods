<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    damageCalculation,
    calculationCasters,
    calculationCasterLabel,
    damageStatInputs,
  } from "$lib/skills/damage-calculations";
  import { DAMAGE, MAGIC_DAMAGE } from "$lib/calculation/inputs";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, spec } = $derived(mechanics);
  const { damageMechanics } = $derived(mechanics.facts);
  const damageBlocks = $derived(
    spec.damageContexts.flatMap((ctx) =>
      calculationCasters(
        ctx.casters,
        ctx.formula === "manaburn" ? undefined : skill,
      ).map((casters) => ({
        key: `${ctx.formula}:${calculationCasterLabel(casters)}`,
        casters,
        kind: ctx.formula,
        stats: damageStatInputs(skill, ctx.formula),
        calculation: damageCalculation(skill, ctx, casters),
      })),
    ),
  );
  const damageStatNames = $derived(
    [DAMAGE, MAGIC_DAMAGE]
      .filter((stat) =>
        damageBlocks.some((block) =>
          block.calculation.inputs?.some((input) => input.key === stat.key),
        ),
      )
      .map((stat) => stat.label),
  );
</script>

<div class="space-y-3">
  <h3 class="font-semibold">Skill Damage</h3>
  <!-- Source: server-scripts/Combat.cs:119-178 — character-window Damage and Magic Damage include base and flat bonuses, then separately rounded percentage bonuses. -->
  {#if damageStatNames.length > 0}
    <p class="text-muted-foreground">
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-formulas"
        >{damageStatNames.join(" and ")}</a
      >
      {damageStatNames.length === 1 ? "is the value" : "are the values"} in your character
      window.
    </p>
  {/if}
  {#each damageBlocks as block (block.key)}
    <div class="space-y-2">
      <h4 class="font-medium text-muted-foreground">
        {calculationCasterLabel(block.casters)}
      </h4>
      {#if block.kind === "monster_magic" || block.kind === "monster_melee"}
        <p class="text-muted-foreground">
          The caster uses its own {block.stats
            .map((stat) => stat.label)
            .join(" and ")} at its level.
        </p>
      {/if}
      <Calculation calculation={block.calculation} />
    </div>
  {/each}
  <!-- Source: server-scripts/Combat.cs:654-661,844-861 — physical hits use block/miss and Defense, elemental hits use the matching resist. -->
  {#if skill.is_manaburn_skill}
    <!-- Source: server-scripts/Combat.cs:700-703,836-875 — Mana Burn and Rageblow skip avoidance and mitigation, not variance, combat advantage, level adjustment or critical scaling. -->
    <p class="text-muted-foreground">
      This skill skips avoidance and damage reduction from Defense or
      resistance. Variance, combat advantage, level adjustment and eligible
      critical hits still apply. See the <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage pipeline</a
      >.
    </p>
  {:else if damageMechanics}
    <!-- Source: server-scripts/Combat.cs:307-319,844-861,1539-1580 — the matching stat reduces damage by 0.0005 per point, at most 0.9, rounded up; Defense adds 0.0001 per point to blockChance, at most 0.8; a resist stat adds 0.0005 per point to the resist chance. -->
    <p class="text-muted-foreground">
      {#if damageMechanics.avoidance === "block"}
        The target's Defense reduces this damage by 5% per 100 points, at most
        90%, with the reduction rounded up. The hit can also be blocked or
        missed, at the target's base block chance plus 1 percentage point per
        100 Defense and any block bonuses, at most 80%.
      {:else}
        The target's {damageMechanics.stat} reduces this damage by 5% per 100 points,
        at most 90%, with the reduction rounded up, and gives 5 percentage points
        of chance per 100 points to resist the hit entirely.
      {/if}
      See the
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage pipeline</a
      >,
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#resistance">resistance and avoidance</a
      >
      for level differences and Accuracy, and
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#combat-advantage"
        >moving targets and backstabs</a
      >.
    </p>
  {:else}
    <p>
      Unknown damage type: {skill.damage_type}. Its mitigation rule is not
      mapped.
    </p>
  {/if}
  {#if skill.followup_default_attack && skill.skill_type === "target_damage" && skill.player_classes.includes("rogue")}
    <!-- Source: server-scripts/TargetDamageSkill.cs:167-195 — Master Poisoner changes the Rogue auto attack's damage type before damage is computed. -->
    <p class="text-muted-foreground">
      With Master Poisoner active, a Rogue's auto attack adds 250% of Dexterity
      above 0, rounded, and deals Poison damage against Poison Resist.
    </p>
    <RoundingDefinition />
  {/if}
</div>
