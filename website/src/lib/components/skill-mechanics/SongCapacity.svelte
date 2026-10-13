<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: PassiveSkill.cs:12-13 and PlayerSkills.cs:1156-1167 -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Capacity</h3>
  <p>A Bard sustains two songs before bonuses from learned passives.</p>
  <p class="text-muted-foreground">
    Learning this passive adds {skill.additional_active_bard_songs} to your active
    song limit.
  </p>
</div>
