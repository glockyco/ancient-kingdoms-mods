<script lang="ts">
  import { statField, formatStatField } from "$lib/stats";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { formatLinearPercent } from "$lib/skills/skill-format";
  import { drainMagnitude } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/NecromancerReaperFormSkill.cs:31-42; server-scripts/Buff.cs:361-369 — applying an active form removes it and its timer stays positive while active. -->
<div class="space-y-2">
  <h3 class="font-semibold">Reaper Form</h3>
  <p class="text-muted-foreground">The form has no time limit.</p>
  <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active NecromancerReaperFormSkill buff multiplies the caster's debuff ticks on others by 1 + its magicDamagePercentBonus. -->
  <!-- Source: server-scripts/Combat.cs:DealDamageAt — lifetap healing is a share of direct damage dealt. -->
  <p class="text-muted-foreground">
    While the form is active, your Spell Power and your damage-over-time ticks
    on other targets each gain {formatLinearPercent(
      skill.magic_damage_percent_bonus,
    )}. Your magic lifetaps also heal more.
  </p>
  {#if skill.health_percent_per_second_bonus}
    {@const drain = drainMagnitude(skill.health_percent_per_second_bonus)}
    <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT,GetBuffHealthRecoveryBonus; server-scripts/UICharacterInfo.cs:Update — Reaper Form drains maximum Health alongside recovery, and the character window displays net recovery. -->
    <p class="text-muted-foreground">
      Each second, the form drains {formatStatField(
        statField("skill", "health_percent_per_second_bonus"),
        fmt.atRank(drain, skill.max_level),
      )} of your maximum Hit Points{fmt.scalesWithRank(drain, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}, rounded.
    </p>
    <p class="text-muted-foreground">
      Your Health Regeneration still applies. The character window's Health
      Regeneration shows the net change.
    </p>
    <RoundingDefinition />
  {/if}
  <!-- Source: server-scripts/NetworkManagerMMO.cs:130 — UpdateEnergies repeats every 1 second. -->
  <!-- Source: server-scripts/Skills.cs:251-256 — recovery ticks skip BreakMezz for NecromancerReaperFormSkill. -->
  <!-- Source: server-scripts/Skills.cs:251-268,1663-1669 — the self-drain has no low-health guard and can kill the caster. -->
  <p class="text-muted-foreground">
    The drain ignores resistances, Ward and critical hits. It can kill you. It
    does not break sleep.
  </p>
  <!-- Source: server-scripts/MountItem.cs:58-63 — removes reaperForm.formSkill before mounting. -->
  <!-- Source: server-scripts/Skills.cs:OnDeath — buffs without remainAfterDeath are removed. -->
  <!-- Source: server-scripts/UIBuffs.cs:302-315; server-scripts/Player.cs:10687-10705 — Reaper Form can be removed through the buff bar. -->
  <!-- Source: server-scripts/PlayerSkills.cs:TryUse — an active form can be dismissed before fear and stun checks. -->
  <p class="text-muted-foreground">
    It ends when you use the skill again (even while feared or stunned), remove
    it from your buff bar, mount{skill.remain_after_death ? "." : ", or die."}
    {#if skill.remain_after_death}The form survives death.{/if}
  </p>
  <!-- Source: server-scripts/NetworkManagerMMO.cs:711-721 — restores NecromancerReaperFormSkill when saved remaining time is positive. -->
  <p class="text-muted-foreground">
    The form persists when you log out and back in.
  </p>
  <!-- Source: server-scripts/Player.cs:HasActiveAppearanceIllusion — active NecromancerReaperFormSkill is an appearance illusion. -->
  <!-- Source: server-scripts/Player.cs:9676-9679 — HasActiveAppearanceIllusion blocks the barber. -->
  <p class="text-muted-foreground">
    The barber cannot change your appearance while the form is active.
  </p>
</div>
