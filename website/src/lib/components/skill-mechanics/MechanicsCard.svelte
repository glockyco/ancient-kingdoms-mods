<script lang="ts" module>
  import type { Component } from "svelte";
  import type { MechanicsSectionId } from "$lib/skills/mechanics-sections";
  import Accuracy from "./Accuracy.svelte";
  import Aggro from "./Aggro.svelte";
  import Assassination from "./Assassination.svelte";
  import BalanceHealth from "./BalanceHealth.svelte";
  import Blindness from "./Blindness.svelte";
  import BlockChance from "./BlockChance.svelte";
  import BloodPact from "./BloodPact.svelte";
  import BreakArmor from "./BreakArmor.svelte";
  import BuffScaling from "./BuffScaling.svelte";
  import Channel from "./Channel.svelte";
  import Charm from "./Charm.svelte";
  import Cleanse from "./Cleanse.svelte";
  import CleanseResistance from "./CleanseResistance.svelte";
  import CompanionBuff from "./CompanionBuff.svelte";
  import CompanionMaximumHealth from "./CompanionMaximumHealth.svelte";
  import CompanionRanks from "./CompanionRanks.svelte";
  import CooldownReduction from "./CooldownReduction.svelte";
  import CriticalChance from "./CriticalChance.svelte";
  import CriticalResist from "./CriticalResist.svelte";
  import Damage from "./Damage.svelte";
  import DamageOverTimeExecute from "./DamageOverTimeExecute.svelte";
  import DamageShield from "./DamageShield.svelte";
  import DeathBloom from "./DeathBloom.svelte";
  import DebuffResistance from "./DebuffResistance.svelte";
  import DebuffScaling from "./DebuffScaling.svelte";
  import DecreaseResists from "./DecreaseResists.svelte";
  import Dispel from "./Dispel.svelte";
  import FamiliarRanks from "./FamiliarRanks.svelte";
  import Fear from "./Fear.svelte";
  import FearResist from "./FearResist.svelte";
  import FinalCadence from "./FinalCadence.svelte";
  import HealOnHit from "./HealOnHit.svelte";
  import Healing from "./Healing.svelte";
  import Knockback from "./Knockback.svelte";
  import Lifetap from "./Lifetap.svelte";
  import LifetapHealingBonus from "./LifetapHealingBonus.svelte";
  import ManaShield from "./ManaShield.svelte";
  import MercenaryRanks from "./MercenaryRanks.svelte";
  import MercenarySong from "./MercenarySong.svelte";
  import Parry from "./Parry.svelte";
  import ReaperForm from "./ReaperForm.svelte";
  import Root from "./Root.svelte";
  import ScrollMastery from "./ScrollMastery.svelte";
  import Sleep from "./Sleep.svelte";
  import Song from "./Song.svelte";
  import SongCapacity from "./SongCapacity.svelte";
  import SongCategory from "./SongCategory.svelte";
  import SongDurationBonus from "./SongDurationBonus.svelte";
  import Stun from "./Stun.svelte";
  import Teleport from "./Teleport.svelte";
  import Virtuosity from "./Virtuosity.svelte";
  import WildStrike from "./WildStrike.svelte";

  const SECTION_COMPONENTS: Record<MechanicsSectionId, Component> = {
    "blood-pact": BloodPact,
    "death-bloom": DeathBloom,
    "reaper-form": ReaperForm,
    "companion-buff": CompanionBuff,
    channel: Channel,
    "damage-over-time-execute": DamageOverTimeExecute,
    "companion-maximum-health": CompanionMaximumHealth,
    "lifetap-healing-bonus": LifetapHealingBonus,
    "mercenary-ranks": MercenaryRanks,
    "companion-ranks": CompanionRanks,
    "familiar-ranks": FamiliarRanks,
    "scroll-mastery": ScrollMastery,
    "song-capacity": SongCapacity,
    "song-duration-bonus": SongDurationBonus,
    virtuosity: Virtuosity,
    "mercenary-song": MercenarySong,
    song: Song,
    "song-category": SongCategory,
    charm: Charm,
    "final-cadence": FinalCadence,
    damage: Damage,
    aggro: Aggro,
    "balance-health": BalanceHealth,
    healing: Healing,
    "buff-scaling": BuffScaling,
    "debuff-scaling": DebuffScaling,
    "debuff-resistance": DebuffResistance,
    "cleanse-resistance": CleanseResistance,
    cleanse: Cleanse,
    dispel: Dispel,
    "wild-strike": WildStrike,
    parry: Parry,
    assassination: Assassination,
    "decrease-resists": DecreaseResists,
    "mana-shield": ManaShield,
    fear: Fear,
    "fear-resist": FearResist,
    stun: Stun,
    knockback: Knockback,
    root: Root,
    sleep: Sleep,
    teleport: Teleport,
    "block-chance": BlockChance,
    accuracy: Accuracy,
    "critical-chance": CriticalChance,
    "critical-resist": CriticalResist,
    lifetap: Lifetap,
    "break-armor": BreakArmor,
    "heal-on-hit": HealOnHit,
    "cooldown-reduction": CooldownReduction,
    "damage-shield": DamageShield,
    blindness: Blindness,
  };
</script>

<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import type { MechanicsContext } from "$lib/skills/mechanics-sections";
  import { setMechanicsContext } from "./context";

  interface Props extends MechanicsContext {
    /** The anchor the page's jump list links to. */
    id: string;
    /** The sections to show, in display order, from `mechanicsSections`. */
    sections: MechanicsSectionId[];
  }

  let { id, sections, skill, spec, facts }: Props = $props();

  // Getters keep the sections current when client-side navigation reuses the page.
  setMechanicsContext({
    get skill() {
      return skill;
    },
    get spec() {
      return spec;
    },
    get facts() {
      return facts;
    },
  });
</script>

<Card.Root {id} class="bg-muted/30">
  <Card.Header>
    <Card.Title level={2} class="flex items-center gap-2">
      <FlaskConical class="h-5 w-5 text-cyan-500" />
      Mechanics
    </Card.Title>
  </Card.Header>
  <Card.Content class="space-y-6 text-sm">
    {#each sections as section (section)}
      {@const Section = SECTION_COMPONENTS[section]}
      <Section />
    {/each}
  </Card.Content>
</Card.Root>
