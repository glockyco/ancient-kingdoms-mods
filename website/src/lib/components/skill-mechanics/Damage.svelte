<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    damageCalculation,
    calculationCasters,
    calculationCasterLabel,
    damageStatInputs,
    isMercenaryGroup,
  } from "$lib/skills/damage-calculations";
  import { DAMAGE, MAGIC_DAMAGE } from "$lib/calculation/inputs";
  import { DEFENSE_RATES } from "$lib/calculation/combat";
  import ResistChance from "./ResistChance.svelte";
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
</script>

<div class="space-y-3">
  <h3 class="font-semibold">Skill Damage</h3>
  {#if skill.area_projectile}
    <!-- Source: server-scripts/AreaDamageSkill.cs:Apply — projectile skills launch a separate projectile at each selected target. -->
    <p class="text-muted-foreground">This area skill fires projectiles.</p>
  {/if}
  {#each damageBlocks as block (block.key)}
    <div class="space-y-2">
      <h4 class="font-medium text-muted-foreground">
        {calculationCasterLabel(block.casters)}
      </h4>
      {#if block.calculation.inputs?.some((input) => input.key === DAMAGE.key || input.key === MAGIC_DAMAGE.key)}
        <!-- Source: server-scripts/UICharacterInfo.cs:Update; UIEquipmentMercenary.cs:Update — displayed combat values belong to the caster. -->
        <p class="text-muted-foreground">
          <a
            href="/mechanics/combat#damage-formulas"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{block.stats.map((stat) => stat.label).join(" and ")}</a
          >
          {block.stats.length === 1 ? "is the value" : "are the values"} in
          {isMercenaryGroup(block.casters)
            ? "the mercenary's equipment"
            : "your character"} window.
        </p>
      {/if}
      {#if isMercenaryGroup(block.casters) && skill.max_level > 1}
        <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the player's level and veteran points determine the mercenary's skill rank. -->
        <p class="text-muted-foreground">
          Use your mercenary's rank from Mercenary skill rank above. This
          example uses the rank from that section's example.
        </p>
      {/if}
      {#if block.calculation.inputs?.some((input) => input.key === "bowDamage" || input.key === "offhandDamage")}
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; FrontalDamageSkill.cs:Apply — the bow and off-hand deductions use the weapon's Base Damage. -->
        <p class="text-muted-foreground">
          Enter Base Damage from the weapon's tooltip.
        </p>
      {/if}
      {#if block.calculation.inputs?.some((input) => input.key === "meleeDamage")}
        <!-- Source: server-scripts/TargetProjectileSkill.cs:Apply — a bow shot deducts the main-hand weapon's Base Damage. -->
        <p class="text-muted-foreground">
          Enter your main-hand weapon's Base Damage from its tooltip.
        </p>
      {/if}
      {#if skill.is_scroll}
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; AreaDamageSkill.cs:Apply — scroll casts zero the character contribution. -->
        <p class="text-muted-foreground">
          Scroll casts use the skill's damage without your Attack Power or Spell
          Power.
        </p>
      {/if}
      {#if block.kind === "monster_magic" || block.kind === "monster_melee"}
        <p class="text-muted-foreground">
          The caster adds its own {block.stats
            .map((stat) => stat.label)
            .join(" and ")}, which its page lists for its level.
        </p>
      {/if}
      <Calculation calculation={block.calculation} />
    </div>
  {/each}
  <!-- Source: server-scripts/Combat.cs:711-720,901-918 — physical hits use block/miss and Defense, elemental hits use the matching resist. -->
  {#if skill.is_manaburn_skill}
    <!-- Source: server-scripts/Combat.cs:736-739,893-932 — Mana Burn and Rageblow skip avoidance and mitigation, not variance, combat advantage, level adjustment or critical scaling. -->
    <p class="text-muted-foreground">
      This skill bypasses avoidance, Armor Class and resistance. It still gets
      random variance, Combat Advantage, the level adjustment and critical hits.
      See the <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage steps</a
      >.
    </p>
  {:else if damageMechanics}
    <!-- Source: server-scripts/Combat.cs:308-320,901-918,1609-1650 — the matching stat reduces damage by 0.0005 per point, at most 0.9, rounded up; Defense adds 0.0001 per point to blockChance, at most 0.8; a resist stat adds 0.0005 per point to the resist chance. -->
    <p class="text-muted-foreground">
      {#if damageMechanics.avoidance === "block"}
        The target's Armor Class reduces this damage by {DEFENSE_RATES.reductionPerPoint}
        per point, up to {DEFENSE_RATES.maxReduction}. Physical hits can also be
        blocked or missed.
      {:else}
        The target's {damageMechanics.stat} reduces this damage by {DEFENSE_RATES.reductionPerPoint}
        per point, up to {DEFENSE_RATES.maxReduction}.
        <ResistChance stat={damageMechanics.stat} resists="the hit outright" />
      {/if}
      See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#avoidance">resistance and avoidance</a
      >, the
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage steps</a
      >
      and
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
      With <a
        href="/skills/master_poisoner"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Master Poisoner</a
      >
      active, a Rogue's auto attack adds 250% of Dexterity above 0, rounded, and deals
      Poison damage against Poison Resist.
    </p>
    <RoundingDefinition />
  {/if}
  {#if skill.followup_default_attack && skill.player_classes.includes("ranger")}
    <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike; Combat.cs:DealDamageAt,GetProbResistMagic — a Ranger player's next auto attack gains 10% damage per buff rank and uses Magic Resist. -->
    <p class="text-muted-foreground">
      With <a
        href="/skills/wild_strike"
        class="text-blue-600 dark:text-blue-400 hover:underline">Wild Strike</a
      >
      active, the Ranger's next hit deals 10% more per Wild Strike rank, rounded,
      as Magic damage against Magic Resist. Apply this bonus after the calculation
      above.
    </p>
  {/if}
</div>
