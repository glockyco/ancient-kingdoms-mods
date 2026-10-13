<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { formatLinearPercent } from "$lib/skills/skill-format";
  import { drainMagnitude, reaperDrain } from "$lib/skills/worked-examples";
  import { MAX_HEALTH } from "$lib/calculation/inputs";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/NecromancerReaperFormSkill.cs:15-26; server-scripts/Buff.cs:347-355 — applying an active form removes it and its timer stays positive while active. -->
<div class="space-y-2">
  <h3 class="font-semibold">Reaper Form</h3>
  <p class="text-muted-foreground">The form has no time limit.</p>
  <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active NecromancerReaperFormSkill buff multiplies the caster's debuff ticks on others by 1 + its magicDamagePercentBonus. -->
  <p class="text-muted-foreground">
    While the form is active, your magic damage gains {formatLinearPercent(
      skill.magic_damage_percent_bonus,
    )}, and your damage-over-time ticks on other targets gain the same
    {formatLinearPercent(skill.magic_damage_percent_bonus)}. Lifetap healing
    grows with the damage it is based on.
  </p>
  {#if skill.health_percent_per_second_bonus}
    {@const drain = drainMagnitude(skill.health_percent_per_second_bonus)}
    <!-- Source: server-scripts/Skills.cs:1617-1623 — NecromancerReaperFormSkill drains RoundToInt(max(0, -healthPercentPerSecondBonus) × health.max) before ordinary DoT mitigation. -->
    <p class="text-muted-foreground">
      Each second, the form drains {fmt.formatPercent(
        fmt.atRank(drain, skill.max_level),
      )} of your maximum Health{fmt.scalesWithRank(drain, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}, rounded. With {fmt.formatNumber(MAX_HEALTH.value)} maximum Health,
      you lose {fmt.formatNumber(
        reaperDrain(skill.health_percent_per_second_bonus, skill.max_level),
      )} Health each second. {fmt.describeRankGrowth(
        drain,
        skill.max_level,
        fmt.formatPercent,
      )}
    </p>
    <RoundingDefinition />
  {/if}
  <!-- Source: server-scripts/NetworkManagerMMO.cs:116 — UpdateEnergies repeats every 1 second. -->
  <!-- Source: server-scripts/Skills.cs:251-256 — recovery ticks skip BreakMezz for NecromancerReaperFormSkill. -->
  <!-- Source: server-scripts/Skills.cs:251-268,1617-1623 — the self-drain has no low-health guard and can kill the caster. -->
  <p class="text-muted-foreground">
    Drain ignores resistance, wards and critical hits. The drain can kill you.
    It does not break Sleep.
  </p>
  <!-- Source: server-scripts/MountItem.cs:58-63 — removes reaperForm.formSkill before mounting. -->
  <!-- Source: server-scripts/Skills.cs:OnDeath — buffs without remainAfterDeath are removed. -->
  <!-- Source: server-scripts/UIBuffs.cs:292-303; server-scripts/Player.cs:10310-10328 — Reaper Form can be removed through the buff bar. -->
  <p class="text-muted-foreground">
    It ends when you toggle it off, remove it from your buff bar or mount.
    {skill.remain_after_death
      ? "The form survives death."
      : "Death removes the form."}
  </p>
  <!-- Source: server-scripts/NetworkManagerMMO.cs:674-684 — restores NecromancerReaperFormSkill when saved remaining time is positive. -->
  <p class="text-muted-foreground">
    The form persists when you log out and back in.
  </p>
  <!-- Source: server-scripts/Player.cs:HasActiveAppearanceIllusion — active NecromancerReaperFormSkill is an appearance illusion. -->
  <!-- Source: server-scripts/Player.cs:9310-9313 — HasActiveAppearanceIllusion blocks the barber. -->
  <p class="text-muted-foreground">
    The barber cannot change your appearance while the form is active.
  </p>
  <!-- Source: server-scripts/PlayerSkills.cs:636-646 — active NecromancerReaperFormSkill removal precedes FEAR and STUNNED checks. -->
  <p class="text-muted-foreground">
    Using the skill again dismisses it immediately, even while feared or
    stunned.
  </p>
</div>
