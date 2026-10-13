<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import {
    EXAMPLE_SCROLL_MASTERY,
    scrollRank,
  } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/ScrollItem.cs:125 — a scroll casts at RoundToInt(scrollMasteryLevel × 20), clamped between 1 and the skill's maximum rank. -->
<div class="space-y-1">
  <h3 class="font-semibold">
    <a
      href="/professions/scroll_mastery"
      class="text-blue-600 dark:text-blue-400 hover:underline">Scroll Mastery</a
    >
  </h3>
  <p class="text-muted-foreground">
    A scroll casts this skill at one rank per 5 percentage points of Scroll
    Mastery, rounded, from rank 1 up to rank {skill.max_level}. At {fmt.formatPercent(
      EXAMPLE_SCROLL_MASTERY,
    )} Scroll Mastery, it casts at rank {scrollRank(skill.max_level)}. The Rank
    Scaling table lists the mastery each rank needs.
  </p>
  <RoundingDefinition />
</div>
