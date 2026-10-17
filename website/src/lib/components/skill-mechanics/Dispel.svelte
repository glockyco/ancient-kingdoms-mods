<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const playerCast = $derived(
    skill.is_scroll || skill.player_classes.length > 0,
  );
  const resistantBuffs = $derived(
    skill.monster_buffs_with_cleanse_resist ?? [],
  );
</script>

<div class="space-y-1">
  <!-- Source: server-scripts/TargetDebuffSkill.cs:105-154 (resist gate), 179-211,215-240,244-256 (removal); AreaDebuffSkill.cs:104-139 (resist gate), 170-211,215-239,244-264 (removal); Combat.cs:1551-1578 GetProbResistMagic/Disease -->
  <h3 class="font-semibold">
    <a
      href="/mechanics/combat#dispel"
      class="text-blue-600 dark:text-blue-400 hover:underline">Dispel</a
    >
  </h3>
  {#if playerCast}
    <p class="text-muted-foreground">
      <span class="block"
        >You cast this on a monster to remove its beneficial buffs.</span
      >
    </p>
    <p class="text-muted-foreground">
      If the dispel lands, each buff has a separate removal chance of 100% minus
      its Cleanse Resist, plus any reduction described below, limited to 0-100%.
      A buff with 0% Cleanse Resist is always removed{!skill.is_scroll &&
      skill.skill_type === "target_debuff"
        ? " unless your Accuracy is negative"
        : ""}.
    </p>
    {#if resistantBuffs.length > 0}
      <p class="text-muted-foreground">
        Monster buffs with Cleanse Resist:
        {#each resistantBuffs as buff, index (buff.id)}{index > 0 ? ", " : ""}<a
            href="/skills/{buff.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{buff.name}</a
          >
          ({formatPercent(buff.prob_ignore_cleanse, {
            decimals: 2,
            preserveNonzero: true,
          })}){/each}. Every other monster buff has 0%.
      </p>
    {/if}
    {#if skill.skill_type === "target_debuff"}
      {#if skill.is_scroll}
        <!-- Source: server-scripts/ScrollItem.cs:UseAfterCast; TargetDebuffSkill.cs:Apply — scroll cast rank is rounded Scroll Mastery × 20; each rank reduces probIgnoreCleanse by 1 percentage point. -->
        <p class="text-muted-foreground">
          The scroll lowers each buff's Cleanse Resist by 1 percentage point per
          cast rank, up to {skill.max_level} percentage points at rank {skill.max_level}
          (see Scroll Mastery above). Accuracy helps the dispel land. Scroll Mastery
          helps it remove resistant buffs.
        </p>
      {:else}
        <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; Combat.cs:accuracy — removal subtracts half signed Accuracy from probIgnoreCleanse. -->
        <p class="text-muted-foreground">
          Your reduction is half your Accuracy: 20% Accuracy lowers each buff's
          Cleanse Resist by 10 percentage points. Negative Accuracy raises it.
        </p>
      {/if}
    {:else}
      <p class="text-muted-foreground">
        <span class="block"
          >Area dispels do not reduce buffs' Cleanse Resist.</span
        >
        <span class="block">Your Accuracy still helps the skill land.</span>
      </p>
    {/if}
  {:else}
    <p class="text-muted-foreground">
      <span class="block"
        >Monsters use this to remove beneficial buffs from you and your pets.</span
      >
    </p>
    <p class="text-muted-foreground">
      <span class="block"
        >If the dispel lands, you lose skill, food, potion and relic buffs. Rest
        and Bard songs stay. Pets also lose Rest.</span
      >
    </p>
  {/if}
</div>
