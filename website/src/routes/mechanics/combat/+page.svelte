<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ReferencePage from "$lib/components/reference/ReferencePage.svelte";
  import BuffsChapter from "./chapters/BuffsChapter.svelte";
  import ClassMechanicsChapter from "./chapters/ClassMechanicsChapter.svelte";
  import CrowdControlChapter from "./chapters/CrowdControlChapter.svelte";
  import DamageChapter from "./chapters/DamageChapter.svelte";
  import DefenseChapter from "./chapters/DefenseChapter.svelte";
  import HealingChapter from "./chapters/HealingChapter.svelte";
  import SpeedChapter from "./chapters/SpeedChapter.svelte";
  import TargetsChapter from "./chapters/TargetsChapter.svelte";
  import ThreatChapter from "./chapters/ThreatChapter.svelte";
  import { COMBAT_OUTLINE } from "./outline";
</script>

<Seo
  title="Combat Mechanics - Ancient Kingdoms"
  description="How damage, Armor Class and resistance, healing, Haste and Spell Casting Haste, and buff and debuff scaling work in Ancient Kingdoms combat."
  path="/mechanics/combat"
/>

<div class="container mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-8">
  <ReferencePage outline={COMBAT_OUTLINE}>
    {#snippet header()}
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Mechanics", href: "/mechanics" },
          { label: "Combat" },
        ]}
      />
      <h1 class="mt-4 text-4xl font-bold tracking-tight">Combat Mechanics</h1>
      <p class="mt-3 max-w-[72ch] text-lg text-muted-foreground">
        How the game works out hits, defense, healing, effects, speed and
        threat. Formulas use the numbers in your character window, except
        <a
          href="#cast-speed"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Spell Casting Haste</a
        >.
      </p>
      <div class="mt-2 max-w-[72ch]"><RoundingDefinition /></div>
    {/snippet}

    <TargetsChapter />
    <DamageChapter />
    <DefenseChapter />
    <HealingChapter />
    <BuffsChapter />
    <CrowdControlChapter />
    <SpeedChapter />
    <ThreatChapter />
    <ClassMechanicsChapter />
  </ReferencePage>
</div>
