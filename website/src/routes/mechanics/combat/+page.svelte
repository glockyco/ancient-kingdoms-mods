<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
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
        threat.
      </p>
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
