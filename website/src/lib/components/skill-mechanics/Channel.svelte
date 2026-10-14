<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { channelCalculation } from "$lib/skills/calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/PlayerSkills.cs:StartCast,UpdateChannel,CancelCast — channel duration minimum 0.05, upfront mana/energy costs, pulses at (k+1)/N, movement squared above 0.0001 cancels and starts full cooldown. -->
<div class="space-y-2">
  <h3 class="font-semibold">
    Channel: {skill.channel_pulses} Pulses
  </h3>
  <Calculation calculation={channelCalculation(skill)} />
  <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — each pulse reads the caster's current Damage or Magic Damage and calls DealDamageAt separately. -->
  <p class="text-muted-foreground">
    Each pulse recalculates the skill's damage from your current stats and
    splits it as Skill Damage above shows. Each pulse is a separate hit, so the
    target's defenses, resist roll and critical hits apply to each pulse.
  </p>
  <p class="text-muted-foreground">
    Mana and energy are paid at the start and are not refunded on interruption.
  </p>
  <!-- Source: server-scripts/Player.cs:UpdateServer_CASTING — fear and stun cancel ChanneledTargetDamageSkill; stun skips halving the channel cooldown. -->
  <p class="text-muted-foreground">
    Moving more than 0.01 yd from your starting position, losing the target,
    range or sight, stun or fear cancels the channel. Cancellation starts the
    full cooldown immediately, including when a pulse kills the target.
  </p>
  <!-- Source: server-scripts/PlayerSkills.cs:433-450,460-510,2135-2139,2227-2234 — a valid replacement skill cancels the channel with full cooldown and then starts or applies. -->
  <p class="text-muted-foreground">
    Using another skill cancels the channel, starts its full cooldown
    immediately and starts the new skill. You must be free of stun and fear. The
    new skill must be active, meet its casting requirements and have a valid
    target within range and sight when required.
  </p>
</div>
