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
    Each pulse uses your current stats and can be resisted or critical
    independently.
  </p>
  <p class="text-muted-foreground">
    The {skill.energy_cost?.base_value ? "Rage" : "Mana"} cost is paid when the channel
    starts and is not refunded if interrupted.
  </p>
  <!-- Source: server-scripts/Player.cs:UpdateServer_CASTING — fear and stun cancel ChanneledTargetDamageSkill; stun skips halving the channel cooldown. -->
  <p class="text-muted-foreground">
    Stay still and keep your target in range and line of sight. Moving more than
    0.01 yd, losing the target, stun or fear interrupts the channel. An
    interruption starts the full cooldown, even if a pulse killed the target.
  </p>
  <!-- Source: server-scripts/PlayerSkills.cs:CancelCast,527-577,2202-2206,2294-2301 — a valid replacement skill cancels the channel with full cooldown and then starts or applies. -->
  <p class="text-muted-foreground">
    Casting another skill also interrupts the channel and starts its full
    cooldown.
  </p>
</div>
