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
  <p class="text-muted-foreground">
    Full skill damage is recalculated before mitigation for each pulse. No pulse
    occurs at the start. Mana and energy are paid at the start and are not
    refunded on interruption.
  </p>
  <!-- Source: server-scripts/Player.cs:UpdateServer_CASTING — fear and stun cancel ChanneledTargetDamageSkill; stun skips halving the channel cooldown. -->
  <p class="text-muted-foreground">
    Moving more than 0.01 yd from your starting position, losing the target,
    range or sight, stun or fear cancels the channel. Cancellation starts the
    full cooldown immediately, including when a pulse kills the target.
  </p>
  <!-- Source: server-scripts/PlayerSkills.cs:437-454,464-514,2145-2149,2237-2244 — a valid replacement skill cancels the channel with full cooldown and then starts or applies. -->
  <p class="text-muted-foreground">
    Using another skill cancels the channel, starts its full cooldown
    immediately and starts the new skill. You must be free of stun and fear. The
    new skill must be active, meet its casting requirements and have a valid
    target within range and sight when required.
  </p>
</div>
