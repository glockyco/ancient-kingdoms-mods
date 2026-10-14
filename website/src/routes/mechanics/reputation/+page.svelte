<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    reputationExample,
    npcReputation,
  } from "$lib/calculation/reputation";
  import {
    FACTION_ACCENTS,
    FACTION_ACCENT_FALLBACK,
  } from "$lib/constants/factions";
  import type { ReputationMechanicsPageData } from "./+page.server";

  let { data }: { data: ReputationMechanicsPageData } = $props();

  // Which races begin at 500 with each faction, grouped by faction so the two
  // shared ones read once and The Forsaken's absence is visible.
  const FACTIONS = [
    { id: "army_of_order", name: "Army of Order", races: ["Human"] },
    { id: "elven_kingdom", name: "Elven Kingdom", races: ["Elf"] },
    {
      id: "children_of_illithor",
      name: "Children of Illithor",
      races: ["Dwarf"],
    },
    {
      id: "dark_alliance",
      name: "Dark Alliance",
      races: ["Fire Goblin", "Dark Elf"],
    },
    {
      id: "ancient_gods",
      name: "Ancient Gods",
      races: ["Felarii", "Drassar"],
    },
    { id: "the_forsaken", name: "The Forsaken", races: [] },
  ];

  // Every section on the page, in document order. Drives the jump list; the
  // ids match each Card.Root below.
  const SECTIONS = [
    { id: "factions", label: "The Six Factions" },
    { id: "ladder", label: "The Nine Tiers" },
    { id: "monsters", label: "Killing Monsters" },
    { id: "npcs", label: "Killing NPCs" },
    { id: "quests", label: "Completing Quests" },
    { id: "chests", label: "Looting Faction Chests" },
    { id: "pets", label: "Petting Animals" },
    { id: "unlocks", label: "What Reputation Unlocks" },
    { id: "decay", label: "Decay and Limits" },
  ];

  // Tint deepens toward each end of the ladder. The nine segments are equal
  // width because the ranges span three orders of magnitude, so the strip
  // shows order and the sign change at zero; the table carries the numbers.
  const TIER_BANDS = [
    "bg-red-500/40",
    "bg-red-500/28",
    "bg-red-500/16",
    "bg-emerald-500/10",
    "bg-emerald-500/18",
    "bg-emerald-500/26",
    "bg-emerald-500/34",
    "bg-emerald-500/42",
    "bg-emerald-500/50",
  ];

  // What actually changes inside each tier. The thresholds are raw numbers, so
  // most of these sit inside a tier rather than on its boundary.
  // Source: server-scripts/UIFactions.cs:adaptTextFaction; server-scripts/Npc.cs:InteractNpc; server-scripts/UINpcTrading.cs:Update — faction-panel progress, NPC service thresholds and each item's reputation requirement.
  // Source: website/data/compendium.db:items.faction_required_to_buy — recipes, costumes and pets require 221,000, while mounts require 721,000.
  const TIER_UNLOCKS: Record<number, string> = {
    0: "NPCs of this faction refuse services",
    1: "NPCs of this faction refuse services",
    4: "Faction vendors, at 15,000 (panel: Friendly 14,000 / 20,000)",
    6: "Recipes, costumes, and pets, at 221,000 (panel: Ally 0 / 500,000)",
    7: "Mounts, at 721,000 (panel: Revered 0 / 1,279,000)",
  };

  /**
   * The tiers are contiguous, so each one is defined by the single number it
   * starts at and runs until the next tier's. Printing both ends would repeat
   * every boundary and leave the column nothing to align on.
   */
  function tierStart(min: number | null): string {
    return min === null ? "—" : min.toLocaleString().replace("-", "−");
  }

  /** How much reputation a tier covers, which is what it costs to cross it. */
  function tierSpan(min: number | null, max: number | null): string {
    if (min === null || max === null) return "no limit";
    return (max - min).toLocaleString();
  }
</script>

<Seo
  title="Reputation Mechanics - Ancient Kingdoms"
  description="How faction reputation works in Ancient Kingdoms: the nine tiers from Hated to Exalted, every formula that moves it, and what each tier unlocks."
  path="/mechanics/reputation"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Reputation" },
    ]}
  />

  <h1 class="text-4xl font-bold">Reputation Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <Card.Root id="factions" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Six Factions</Card.Title>
      <Card.Description>
        Your character has a separate reputation value for each of the six
        factions.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Database.cs:CharacterCreate — per-race starting faction values. -->
      <p>
        A new character starts at 0 with every faction except the one that
        matches its race, which starts at 500.
      </p>
      <div class="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each FACTIONS as faction (faction.id)}
          {@const accent =
            FACTION_ACCENTS[faction.id] ?? FACTION_ACCENT_FALLBACK}
          {@const FactionIcon = accent.icon}
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 {accent.bg}">
              <FactionIcon class="h-5 w-5 {accent.color}" />
            </div>
            <div class="min-w-0">
              <a
                href="/factions/{faction.id}"
                class="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >{faction.name}</a
              >
              <p class="truncate">
                {#if faction.races.length > 0}
                  {faction.races.join(", ")}
                {:else}
                  No race starts here
                {/if}
              </p>
            </div>
          </div>
        {/each}
      </div>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer; server-scripts/Npc.cs:OnDeath; server-scripts/Database.cs:CharacterCreate — faction chests raise The Forsaken, NPC kills use their listed factions, and no race starts with a Forsaken bonus. -->
      <p>
        Opening faction chests raises your standing with The Forsaken. Killing
        NPCs can also raise it. No race starts with bonus reputation for it.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="ladder" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Nine Tiers</Card.Title>
      <Card.Description>
        Each faction has nine standing tiers. Quests and vendors check your
        reputation points.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIFactions.cs:78,80,82,84,86-90,93-97,102-105,109-113,116-120,124-130,133-137,141-145,148-153 — adaptTextFaction maps standing to a tier label. -->
      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
          <div
            class="flex h-9 overflow-hidden rounded border border-border text-center text-xs"
          >
            {#each data.tiers as tier, i (tier.id)}
              <div
                class="flex flex-1 items-center justify-center {TIER_BANDS[
                  i
                ]} {i === 3 ? 'border-l-2 border-border' : ''}"
              >
                <span class="truncate px-1 font-medium text-foreground"
                  >{tier.name}</span
                >
              </div>
            {/each}
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-6 text-left font-medium">Tier</th>
              <th class="py-2 pr-6 text-right font-medium">Starts at</th>
              <th class="py-2 pr-8 text-right font-medium">Points to cross</th>
              <th class="py-2 text-left font-medium">What changes here</th>
            </tr>
          </thead>
          <tbody>
            {#each data.tiers as tier (tier.id)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td
                  class="py-2 pr-6 font-medium {tier.is_hostile
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'}">{tier.name}</td
                >
                <td class="py-2 pr-6 text-right font-mono"
                  >{tierStart(tier.min_value)}</td
                >
                <td class="py-2 pr-8 text-right font-mono"
                  >{tierSpan(tier.min_value, tier.max_value)}</td
                >
                <td class="py-2">
                  <!-- Source: server-scripts/UIHousing.cs:Start; server-scripts/PlayerQuests.cs:131-143; server-scripts/UIFactions.cs:adaptTextFaction — house and quest requirements use total points, while the panel shows tier progress. Source: website/data/compendium.db:houses.faction_required, quests.faction_requirements — houses require 21,000 and Trial of the Ancients requires 21,000 with Elven Kingdom. -->
                  {#if tier.id === 5}
                    <a
                      href="/mechanics/housing"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Houses</a
                    >
                    at 21,000.
                    <a
                      href="/quests/29_trial_of_the_ancients"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Trial of the Ancients</a
                    >
                    requires 21,000 with Elven Kingdom (panel: Honored 0 / 200,000).
                  {:else if TIER_UNLOCKS[tier.id]}
                    {TIER_UNLOCKS[tier.id]}
                  {:else}
                    <span class="text-muted-foreground/50">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p>
        <span class="block">Each table entry is the minimum for its tier.</span>
        <span class="block"
          >Friendly starts at 1,000 points, so 999 points is Neutral.</span
        >
      </p>
      <!-- Source: server-scripts/UIFactions.cs:adaptTextFaction — Neutral through Revered display whole points above the tier start, out of the tier's span. -->
      <p>
        From Neutral through Revered, the faction panel shows your progress
        toward the next tier, not your total reputation. It rounds down to whole
        points. A total of 15,000 reads Friendly 14,000 / 20,000.
      </p>
      <!-- Source: server-scripts/UIFactions.cs:124-153 — Unfriendly is −500 through below 0, Hostile is −3,000 through below −500, and Hated is below −3,000. -->
      <p>
        <span class="block">Below zero, Unfriendly covers −500 to below 0.</span
        >
        <span class="block">Hostile covers −3,000 to below −500.</span>
        <span class="block">Hated begins below −3,000.</span>
      </p>
      <!-- Source: server-scripts/Npc.cs:1732-1738; PlayerQuests.cs:131-143; ScriptableQuest.cs:43 — NPC services refuse standing strictly below −500, while quest requirements compare the named faction's raw value. -->
      <p>
        <span class="block"
          >An NPC refuses to talk to you when your reputation with its faction
          falls below −500.</span
        >
        <span class="block"
          >A quest can require reputation with any faction, not only its quest
          giver's.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="monsters" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Killing Monsters</Card.Title>
      <Card.Description>
        A monster kill can raise standing with some factions and lower it with
        others.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:574-604 — GetFactionGain and GetFactionLoss calculate kill reputation. -->
      <p>
        <span class="block"
          >A monster's level, maximum health, and rank determine reputation
          gained.</span
        >
        <span class="block"
          >Only its level and rank determine reputation lost.</span
        >
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Rank</th>
              <th class="py-2 pr-4 text-left font-medium">Gain per kill</th>
              <th class="py-2 text-left font-medium">Loss per kill</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="border-b border-border/50 odd:bg-muted/30 hover:bg-muted/50"
            >
              <td class="py-2 pr-4">Boss</td>
              <td class="py-2 pr-4">Base gain × 20</td>
              <td class="py-2">Monster level × 2</td>
            </tr>
            <tr
              class="border-b border-border/50 odd:bg-muted/30 hover:bg-muted/50"
            >
              <td class="py-2 pr-4">Elite</td>
              <td class="py-2 pr-4">Base gain × 10</td>
              <td class="py-2">Monster level</td>
            </tr>
            <tr
              class="border-b border-border/50 odd:bg-muted/30 hover:bg-muted/50"
            >
              <td class="py-2 pr-4">Normal</td>
              <td class="py-2 pr-4">Base gain</td>
              <td class="py-2">Monster level × 0.75, without rounding</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Monster.cs:OnDeath; website/data/compendium.db monsters.avatar_of_water — its kill applies both faction lists. -->
      <p>
        <span class="block"
          ><a
            href="/monsters/avatar_of_water"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Avatar of Water</a
          > is a level 56 boss with 800,000 maximum Health. Its kill raises Elven
          Kingdom, Children of Illithor, and Army of Order, and lowers Ancient Gods.</span
        >
        <span class="block">The worked example below uses Avatar of Water.</span
        >
      </p>
      <Calculation calculation={reputationExample(56, 800_000)} />
      <!-- Source: server-scripts/Monster.cs:OnDeath — each nearby party player receives the full faction change. -->
      <p>
        Each <a
          href="/mechanics/party#shared-rewards"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >nearby party member</a
        > receives the full monster-kill reputation.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="npcs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Killing NPCs</Card.Title>
      <Card.Description>
        Killing an NPC changes your standing with the factions listed for that
        NPC.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:1582-1614 and 1629-1661 — party and solo faction changes on an NPC death. -->
      <!-- Source: server-scripts/Npc.cs:OnDeath; website/data/compendium.db npcs.is_notable — Notable NPC kill changes use each NPC's faction lists. -->
      <ul class="list-disc space-y-2 pl-5">
        {#each data.notableNpcs as npc (npc.id)}
          <li>
            Killing <a
              href="/npcs/{npc.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{npc.name}</a
            >, a Notable NPC, raises {#each npc.improveFactions as faction, i (faction.id)}{i >
              0
                ? ", "
                : ""}<a
                href="/factions/{faction.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{faction.name}</a
              >{/each}{#if npc.decreaseFactions.length > 0}
              and lowers {#each npc.decreaseFactions as faction, i (faction.id)}{i >
                0
                  ? ", "
                  : ""}<a
                  href="/factions/{faction.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >{faction.name}</a
                >{/each}{/if}.
          </li>
        {/each}
      </ul>
      <Calculation calculation={npcReputation()} />
      <p>
        Each <a
          href="/mechanics/party#shared-rewards"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >nearby party member</a
        > receives the full reputation change from an NPC kill.
      </p>
      <!-- Source: server-scripts/Player.cs:IsProtectedFriendlyNpc; UISettings.cs:ProtectFriendlyNpcs,InitializeFriendlyNpcToggle — the setting is on by default and blocks attacks on friendly NPCs; its protect_friendly_npcs label reads "Protect NPCs" in the English localization table, read in the running game. -->
      <p>
        To attack an NPC that counts as <a
          href="/mechanics/combat#targets"
          class="text-blue-600 dark:text-blue-400 hover:underline">friendly</a
        >, first turn off Protect NPCs in Settings.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="quests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Completing Quests</Card.Title>
      <Card.Description>
        Quest reputation goes to the faction of the NPC who gave you the quest.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerQuests.cs:440-443 — quest completion raises the start NPC's faction. -->
      <p>
        <span class="block"
          >Handing in an ordinary quest gives 20 reputation per recommended
          level with its starting quest giver's faction.</span
        >
        <span class="block">A level 40 quest gives 800.</span>
      </p>
      <p>
        <a
          href="/professions/adventuring"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Adventurer quests</a
        > give no reputation.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="chests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Looting Faction Chests</Card.Title>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — faction changes happen before the chest's reward roll. -->
      <Card.Description>
        Opening a faction chest costs 200 reputation with its faction and gives
        200 with The Forsaken.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — both reputation changes precede the reward roll. Source: website/data/compendium.db:chests — all 54 faction chests have a 75% gold reward chance and require no key. -->
      <p>
        Both reputation changes apply every time you open a faction chest,
        including openings that give no reward. Each opening has a 75% chance to
        give gold.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="pets" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Petting Animals</Card.Title>
      <Card.Description>
        Petting a friendly animal grants 1–4 reputation with its faction at most
        once every 30 seconds.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PetFriendly.cs:688-702 — clicking within 3 units pets the animal and grants faction at most every 30 seconds. -->
      <!-- Source: server-scripts/Player.cs:13449-13453 — CmdIncreaseFaction adds the value unchanged. -->
      <p>
        <span class="block"
          >Click an animal within 3 yd to pet it for 1–4 reputation with its
          faction.</span
        >
        <span class="block"
          >The same animal cannot grant more for another 30 seconds.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="unlocks" class="bg-muted/30">
    <Card.Header>
      <Card.Title>What Reputation Unlocks</Card.Title>
      <Card.Description>
        Vendors, houses, quests, and other services check your points with the
        relevant faction.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <ul class="list-disc space-y-2 pl-5">
        <li>
          <!-- Source: server-scripts/Npc.cs:InteractNpc; server-scripts/UIFactions.cs:adaptTextFaction — faction vendors require 15,000 total points, shown as Friendly 14,000 / 20,000. -->
          <a
            href="/npcs"
            class="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >Faction vendors</a
          >
          require 15,000 reputation (Friendly 14,000 / 20,000 in the faction panel).
        </li>
        <li>
          <!-- Source: server-scripts/UINpcTrading.cs:427-431 — per-item faction requirement against the vendor's faction. -->
          <strong class="text-foreground">Some items</strong> require additional reputation
          with the selling NPC's faction, even when the NPC opens their shop.
        </li>
        <li>
          <!-- Source: server-scripts/UIHousing.cs:Start; server-scripts/UIFactions.cs:adaptTextFaction — house purchase checks faction reputation, and Honored begins at 21,000. Source: website/data/compendium.db:houses.faction_required — all nine houses require 21,000. -->
          <a
            href="/mechanics/housing"
            class="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >Houses</a
          > have their own faction and requirement. Every purchasable house needs
          21,000 reputation (panel: Honored 0 / 200,000).
        </li>
        <li>
          <!-- Source: server-scripts/PlayerQuests.cs:131-143 — every quest faction requirement must be met. -->
          <strong class="text-foreground">Quests</strong> can require any amount with
          any faction. You have to meet every listed requirement before you can pick
          the quest up.
        </li>
        <li>
          <!-- Source: server-scripts/Npc.cs:1732-1738 — faction values below -500 select the lowFactionMessages branch instead of services. -->
          <strong class="text-foreground">Below −500</strong> reputation, NPCs of
          that faction will not talk to you. No shop, no quests, no services.
        </li>
      </ul>
      <p>
        <span class="block">Reputation does not change prices.</span>
        <span class="block"
          >NPC prices include a <a
            href="/mechanics/character#attributes"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Charisma discount</a
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="decay" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Decay and Limits</Card.Title>
      <Card.Description>
        Reputation does not decay over time or stop at a maximum or minimum.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        If you stop gaining or losing reputation with a faction, your points
        with that faction stay the same.
      </p>
      <!-- Source: server-scripts/Player.cs:13449-13453, Monster.cs:3186-3198, Npc.cs:1636-1646, PlayerQuests.cs:440-443, GatherItem.cs:387-395 — every write adds or subtracts without clamping. -->
      <!-- Source: server-scripts/Database.cs:setFactionValue — setFactionValue assigns value directly to character_factions.value. -->
      <p>
        <span class="block">Reputation has no maximum or minimum.</span>
        <span class="block"
          >Kills, quests, and other sources can move your saved points past the
          Exalted or Hated tier.</span
        >
      </p>
      <!-- Source: server-scripts/UIFactions.cs:84-105 — the Exalted readout clamps only the slider. -->
      <!-- Source: server-scripts/UIFactions.cs:148-154 — the Hated readout floors the displayed number at 0. -->
      <p>
        <span class="block"
          >At Exalted, the faction panel shows "Max" and fills its slider even
          as your points keep increasing.</span
        >
        <span class="block"
          >At Hated, it shows 0 out of 10,000 at −13,000 or lower, even as your
          points keep decreasing.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
