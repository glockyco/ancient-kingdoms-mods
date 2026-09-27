<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
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
  const TIER_UNLOCKS: Record<number, string> = {
    0: "NPCs refuse interaction",
    1: "NPCs refuse below −500",
    4: "Faction vendors, at 15,000",
    5: "Houses and gated quests, at 21,000",
    6: "Recipes, costumes, and pets, at 221,000",
    7: "Mounts, at 721,000",
  };

  /**
   * The tiers are contiguous, so each one is defined by the single number it
   * starts at and runs until the next tier's. Printing both ends would repeat
   * every boundary and leave the column nothing to align on.
   */
  function tierStart(min: number | null): string {
    return min === null ? "—" : min.toLocaleString();
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
      <p>
        Killing NPCs can increase your standing with The Forsaken, but no race
        starts with bonus reputation for that faction.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="ladder" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Nine Tiers</Card.Title>
      <Card.Description>
        Each faction has nine standing tiers. Quests and vendors check your
        reputation points, not your tier name.
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
                  {#if TIER_UNLOCKS[tier.id]}
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
      <!-- Source: server-scripts/UIFactions.cs:124-153 — Unfriendly is −500 through below 0, Hostile is −3,000 through below −500, and Hated is below −3,000. -->
      <p>
        <span class="block">Below zero, Unfriendly covers −500 to below 0.</span
        >
        <span class="block">Hostile covers −3,000 to below −500.</span>
        <span class="block">Hated begins below −3,000.</span>
      </p>
      <!-- Source: server-scripts/Npc.cs:1727-1733; PlayerQuests.cs:131-143; ScriptableQuest.cs:39 — NPC services refuse standing strictly below −500, while quest requirements compare the named faction's raw value. -->
      <p>
        <span class="block"
          >An NPC refuses to talk to you when your reputation with its faction
          falls below −500.</span
        >
        <span class="block"
          >A quest checks your reputation points with its named faction, not
          your tier or points with another faction.</span
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
      <!-- Source: server-scripts/Monster.cs:569-599 — GetFactionGain and GetFactionLoss calculate kill reputation. -->
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
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Rank</th>
              <th class="py-2 pr-4 text-left font-medium">Gain per kill</th>
              <th class="py-2 text-left font-medium">Loss per kill</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50 hover:bg-muted/30">
              <td class="py-2 pr-4">Boss</td>
              <td class="py-2 pr-4 font-mono"
                >(level + round(max health / 2000)) × 20</td
              >
              <td class="py-2 font-mono">level × 2</td>
            </tr>
            <tr class="border-b border-border/50 hover:bg-muted/30">
              <td class="py-2 pr-4">Elite</td>
              <td class="py-2 pr-4 font-mono"
                >(level + round(max health / 2000)) × 10</td
              >
              <td class="py-2 font-mono">level × 1</td>
            </tr>
            <tr class="border-b border-border/50 hover:bg-muted/30">
              <td class="py-2 pr-4">Normal</td>
              <td class="py-2 pr-4 font-mono"
                >level + round(max health / 2000)</td
              >
              <td class="py-2 font-mono">level × 0.75</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Monster.cs:3171-3183 — the solo kill applies both lists. -->
      <p>
        <span class="block"
          ><a
            href="/monsters/valaark"
            class="text-blue-600 hover:underline dark:text-blue-400">Valaark</a
          > is a level 70 boss with 3,000,000 health.</span
        >
        <span class="block"
          >Killing Valaark gives (70 + 1,500) × 20 =
          <strong class="text-foreground">+31,400</strong> Ancient Gods reputation.</span
        >
      </p>
      <p>
        Every nearby party member receives the full monster-kill reputation.
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
      <!-- Source: server-scripts/Npc.cs:1577-1609 and 1624-1656 — party and solo faction changes on an NPC death. -->
      <p>
        Every faction on the NPC's improve list goes up by
        <span class="font-mono">NPC level × 1.5</span>. A Notable NPC multiplies
        this positive amount by 60. Every faction on the decrease list goes down
        by <span class="font-mono">NPC level × 5</span>.
      </p>
      <p>
        In the current data,
        <a
          href="/npcs/king_darin"
          class="text-blue-600 hover:underline dark:text-blue-400">King Darin</a
        >
        is the only Notable NPC. Killing him gives +5,400
        <a
          href="/factions/the_forsaken"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >The Forsaken</a
        > reputation and costs −300 Children of Illithor reputation. Health, loot,
        and the Notable classification do not change the negative amount.
      </p>
      <p>
        Every nearby party member receives the full reputation change from an
        NPC kill.
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
          >Handing in an ordinary quest gives
          <span class="font-mono">recommended level × 20</span>
          reputation with its starting quest giver's faction.</span
        >
        <span class="block">A level 40 quest gives 800.</span>
      </p>
      <p>Adventurer quests give no reputation.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="chests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Looting Faction Chests</Card.Title>
      <Card.Description>
        A faction chest takes 200 reputation points with its faction if you
        receive a reward.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GatherItem.cs:387-395 — opening a rewarding chest lowers its faction. -->
      <p>
        Opening a faction chest costs
        <span class="font-mono text-red-600 dark:text-red-400">200</span>
        reputation points with its faction, regardless of level or contents.
      </p>
      <p>
        You only pay it when the chest actually gives you something. If the
        reward roll comes up empty, you lose nothing.
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
      <!-- Source: server-scripts/Player.cs:13156-13160 — CmdIncreaseFaction adds the value unchanged. -->
      <p>
        <span class="block"
          >Click an animal within 3 units to pet it for 1–4 reputation with its
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
          <!-- Source: server-scripts/Npc.cs:InteractNpc — faction vendors require 15,000 standing. -->
          <strong class="text-foreground">Faction vendors</strong> will not open their
          shop below 15,000 reputation.
        </li>
        <li>
          <!-- Source: server-scripts/UINpcTrading.cs:381-385 — per-item faction requirement against the vendor's faction. -->
          <strong class="text-foreground">Some items</strong> require additional reputation
          with the selling NPC's faction, even when the NPC opens their shop.
        </li>
        <li>
          <!-- Source: server-scripts/UIHousing.cs:73 — house purchase checks the house's faction requirement. -->
          <strong class="text-foreground">Houses</strong> have their own faction and
          requirement. Every purchasable house currently needs 21,000, which is Honored.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerQuests.cs:131-143 — every quest faction requirement must be met. -->
          <strong class="text-foreground">Quests</strong> can require any amount with
          any faction. You have to meet every listed requirement before you can pick
          the quest up.
        </li>
        <li>
          <!-- Source: server-scripts/Npc.cs:1727-1733 — faction values below -500 select the lowFactionMessages branch instead of services. -->
          <strong class="text-foreground">Below −500</strong> reputation, NPCs of
          that faction will not talk to you. No shop, no quests, no services.
        </li>
      </ul>
      <p>
        <span class="block">Reputation does not change prices.</span>
        <span class="block">NPC prices include a Charisma discount.</span>
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
      <!-- Source: server-scripts/Player.cs:13156-13160, Monster.cs:3171-3183, Npc.cs:1631-1641, PlayerQuests.cs:440-443, GatherItem.cs:387-395 — every write adds or subtracts without clamping. -->
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
          >At Hated, it shows 0 out of 10,000 after you fall below −13,000, even
          as your points keep decreasing.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
