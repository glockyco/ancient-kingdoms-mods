<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<p class="text-muted-foreground">
  <!-- Source: server-scripts/SummonSkill.cs:99; PetSkills.cs:114-116 — familiar level is its summoning rank, and skill rank is capped at its maximum. -->
  A familiar uses its summoning skill's rank, at most rank {skill.max_level}.
</p>
