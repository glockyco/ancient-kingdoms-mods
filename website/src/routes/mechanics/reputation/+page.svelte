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
    0: "NPCs refuse to talk",
    1: "NPCs refuse to talk",
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
      <!-- Source: server-scripts/Database.cs:3001-3009,3012-3020,3023-3031,3034-3041,3044-3052,3055-3062,3065-3072 — per-race starting faction values. -->
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
        The Forsaken is the one faction nobody is born into. It is also the only
        faction that goes up when you kill NPCs.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="ladder" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Nine Tiers</Card.Title>
      <Card.Description>
        Each reputation value falls into one of nine tiers. Requirements in the
        game check the raw number, so the tier is only a label.
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
        Each number is the lowest reputation that counts as that tier. Friendly
        starts at exactly 1,000, so 999 is still Neutral.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="monsters" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Killing Monsters</Card.Title>
      <Card.Description>
        Most reputation comes from kills. Each monster has a list of factions it
        raises and a list it lowers, and both apply when it dies.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:517-542 — GetFactionGain and GetFactionLoss. -->
      <p>
        What you gain depends on the monster's level and its maximum health,
        multiplied by its rank. What you lose depends only on level.
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
                >(level + round(max health / 2000)) × 2</td
              >
              <td class="py-2 font-mono">level × 0.5</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Monster.cs:2760-2772 — the solo kill applies both lists. -->
      <p>
        Because health counts, high-health bosses are worth far more than
        anything else.
        <a
          href="/monsters/valaark"
          class="text-blue-600 hover:underline dark:text-blue-400">Valaark</a
        >
        is a level 70 boss with 3,000,000 health, so killing it gives (70 + 1,500)
        × 20 = <strong class="text-foreground">+31,400</strong> Ancient Gods.
      </p>
      <p>
        If you kill it in a party, everyone nearby gets the full amount. It is
        not divided.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="npcs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Killing NPCs</Card.Title>
      <Card.Description>
        NPCs can be killed too, and their death changes reputation with a
        simpler formula.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:1604-1614 — the aggro player's faction changes on an NPC death. -->
      <p>
        Every faction on the NPC's improve list goes up by
        <span class="font-mono">NPC level × 1.5</span>
        and every faction on its decrease list goes down by
        <span class="font-mono">NPC level × 5</span>. Health and rank do not
        matter.
      </p>
      <p>
        In the current data the only faction an NPC death <em>improves</em> is
        <a
          href="/factions/the_forsaken"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >The Forsaken</a
        >, and the one it lowers is the NPC's own. Both amounts are small. The
        highest-level NPCs are level 50, so they give +75 to The Forsaken and
        cost −250 with their own faction.
      </p>
      <!-- Source: website/data/compendium.db monsters table — spirit_of_the_forest is a level 55 boss with 500,000 health and improves The Forsaken. -->
      <p>
        Killing NPCs is not the quickest way to raise The Forsaken either. The
        <a
          href="/monsters/spirit_of_the_forest"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Spirit of the Forest</a
        >
        is worth +6,100 a kill.
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
        Handing in a quest gives
        <span class="font-mono">recommended level × 20</span>
        reputation with that faction. A level 40 quest gives 800.
      </p>
      <p>Adventurer quests give no reputation at all.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="chests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Looting Faction Chests</Card.Title>
      <Card.Description>
        Some chests belong to a faction, and looting one lowers your reputation
        with it.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GatherItem.cs:336-344 — opening a rewarding chest lowers its faction. -->
      <p>
        Opening a faction chest costs
        <span class="font-mono text-red-600 dark:text-red-400">200</span>
        reputation. It is the same amount for every chest, no matter its level or
        contents.
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
        Friendly animals stand around in towns and can be petted for a small
        amount of reputation.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PetFriendly.cs:688-702 — clicking within 3 units pets the animal and grants faction at most every 30 seconds. -->
      <!-- Source: server-scripts/Player.cs:12716-12720 — CmdIncreaseFaction adds the value unchanged. -->
      <p>
        Clicking one from up close pets it and gives 1 to 4 reputation with the
        animal's faction. Each animal only pays out once every 30 seconds, so
        petting the same one repeatedly does nothing extra.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="unlocks" class="bg-muted/30">
    <Card.Header>
      <Card.Title>What Reputation Unlocks</Card.Title>
      <Card.Description>
        Every requirement compares your raw reputation value against a number.
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
          <strong class="text-foreground">Some items</strong> have their own requirement
          on top of that. It is checked against the faction of the NPC selling the
          item.
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
          <!-- Source: server-scripts/Npc.cs:1688-1692 — NPCs refuse to talk below -500. -->
          <strong class="text-foreground">Below −500</strong> reputation, NPCs of
          that faction will not talk to you. No shop, no quests, no services.
        </li>
      </ul>
      <p>
        Reputation does not affect prices. The price an NPC quotes only includes
        your charisma discount.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="decay" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Decay and Limits</Card.Title>
      <Card.Description>
        Reputation does not move on its own, and there is no limit in either
        direction.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        Nothing in the game changes reputation over time. It only moves when one
        of the sources above applies, so a faction you ignore keeps whatever
        value it had.
      </p>
      <!-- Source: server-scripts/Player.cs:12716-12720, Monster.cs:2760-2772, Npc.cs:1604-1614, PlayerQuests.cs:440-443, GatherItem.cs:336-344 — every write adds or subtracts without clamping. -->
      <!-- Source: server-scripts/Database.cs:3677-3685 — setFactionValue stores the raw value. -->
      <p>
        There is no cap and no floor. Every source adds to or subtracts from the
        stored value without clamping it, and the value is saved as-is, so a
        faction can climb past Exalted or fall well below Hated.
      </p>
      <!-- Source: server-scripts/UIFactions.cs:84-105 — the Exalted readout clamps only the slider. -->
      <!-- Source: server-scripts/UIFactions.cs:148-154 — the Hated readout floors the displayed number at 0. -->
      <p>
        The faction panel hides this at both ends. At Exalted it shows "Max" and
        fills the slider completely, and at Hated it shows 0 out of 10,000 once
        you drop below −13,000. Both are display limits on a value that keeps
        moving.
      </p>
    </Card.Content>
  </Card.Root>
</div>
