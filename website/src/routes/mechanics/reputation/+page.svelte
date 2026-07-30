<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { ReputationMechanicsPageData } from "./+page.server";

  let { data }: { data: ReputationMechanicsPageData } = $props();

  const RACE_STARTS = [
    { race: "Human", faction: "Army of Order" },
    { race: "Elf", faction: "Elven Kingdom" },
    { race: "Fire Goblin", faction: "Dark Alliance" },
    { race: "Dark Elf", faction: "Dark Alliance" },
    { race: "Dwarf", faction: "Children of Illithor" },
    { race: "Felarii", faction: "Ancient Gods" },
    { race: "Drassar", faction: "Ancient Gods" },
  ];

  const FACTIONS = [
    { id: "army_of_order", name: "Army of Order" },
    { id: "elven_kingdom", name: "Elven Kingdom" },
    { id: "children_of_illithor", name: "Children of Illithor" },
    { id: "dark_alliance", name: "Dark Alliance" },
    { id: "ancient_gods", name: "Ancient Gods" },
    { id: "the_forsaken", name: "The Forsaken" },
  ];

  function tierRange(min: number | null, max: number | null): string {
    if (min === null) return `below ${(max ?? 0).toLocaleString()}`;
    if (max === null) return `${min.toLocaleString()}+`;
    return `${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
</script>

<Seo
  title="Reputation Mechanics - Ancient Kingdoms"
  description="How faction reputation works in Ancient Kingdoms: the eight tiers from Hated to Revered, and every kill, quest, chest, and pet that changes your reputation."
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

  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li>
        <a href="#factions" class="hover:text-foreground hover:underline"
          >The Six Factions</a
        >
      </li>
      <li>
        <a href="#ladder" class="hover:text-foreground hover:underline"
          >The Eight Tiers</a
        >
      </li>
      <li>
        <a href="#monsters" class="hover:text-foreground hover:underline"
          >Killing Monsters</a
        >
      </li>
      <li>
        <a href="#npcs" class="hover:text-foreground hover:underline"
          >Killing NPCs</a
        >
      </li>
      <li>
        <a href="#quests" class="hover:text-foreground hover:underline"
          >Completing Quests</a
        >
      </li>
      <li>
        <a href="#chests" class="hover:text-foreground hover:underline"
          >Looting Faction Chests</a
        >
      </li>
      <li>
        <a href="#pets" class="hover:text-foreground hover:underline"
          >Friendly Pets</a
        >
      </li>
      <li>
        <a href="#unlocks" class="hover:text-foreground hover:underline"
          >What Reputation Unlocks</a
        >
      </li>
      <li>
        <a href="#decay" class="hover:text-foreground hover:underline"
          >Decay and Caps</a
        >
      </li>
    </ul>
  </nav>

  <Card.Root id="factions" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Six Factions</Card.Title>
      <Card.Description>
        Your character has a separate reputation value for each of the six
        factions.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <ul class="list-disc space-y-1 pl-5">
        {#each FACTIONS as faction (faction.id)}
          <li>
            <a
              href="/factions/{faction.id}"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >{faction.name}</a
            >
          </li>
        {/each}
      </ul>
      <!-- Source: server-scripts/Database.cs:3001-3075 — per-race starting faction values. -->
      <p>
        A new character starts at 0 with every faction except the one that
        matches its race, which starts at 500. That is still inside Neutral.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Race</th>
              <th class="py-2 text-left font-medium">Starts at 500 with</th>
            </tr>
          </thead>
          <tbody>
            {#each RACE_STARTS as start (start.race)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4">{start.race}</td>
                <td class="py-2">{start.faction}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p>
        No race starts with any reputation in The Forsaken. It is also the only
        faction that goes up when you kill NPCs.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="ladder" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Eight Tiers</Card.Title>
      <Card.Description>
        Each reputation value falls into one of eight tiers. Requirements in the
        game check the raw number, so the tier is only a label.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIFactions.cs:78-146 — adaptTextFaction maps standing to a tier label. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Tier</th>
              <th class="py-2 pr-4 text-right font-medium">Reputation</th>
              <th class="py-2 text-left font-medium">Hostile</th>
            </tr>
          </thead>
          <tbody>
            {#each data.tiers as tier (tier.id)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td
                  class="py-2 pr-4 font-medium {tier.is_hostile
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'}">{tier.name}</td
                >
                <td class="py-2 pr-4 text-right font-mono"
                  >{tierRange(tier.min_value, tier.max_value)}</td
                >
                <td class="py-2">{tier.is_hostile ? "Yes" : "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p>
        The lower bound of a tier is included and the upper bound is not. 1,000
        is Friendly, 999 is Neutral, and 21,000 is Honored.
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
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:515-540 — GetFactionGain and GetFactionLoss. -->
      <p>
        What you gain depends on the monster's level and its maximum health,
        multiplied by its rank. What you lose depends only on level.
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
      <!-- Source: server-scripts/Monster.cs:2746-2758 — the solo kill applies both lists. -->
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
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:1600-1610 — the aggro player's faction changes on an NPC death. -->
      <p>
        Every faction on the NPC's improve list goes up by
        <span class="font-mono">NPC level × 1.5</span>
        and every faction on its decrease list goes down by
        <span class="font-mono">NPC level × 5</span>. Health and rank do not
        matter.
      </p>
      <p>
        In the current data the only faction that ever goes up is
        <a
          href="/factions/the_forsaken"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >The Forsaken</a
        >, and the faction that goes down is the NPC's own. Killing townspeople
        is the main way to raise The Forsaken, but you lose more with the town's
        faction than you gain.
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
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
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
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GatherItem.cs:338-346 — opening a rewarding chest lowers its faction. -->
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
      <Card.Title>Friendly Pets</Card.Title>
      <Card.Description>
        A tamed friendly NPC slowly raises reputation while it follows you.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PetFriendly.cs:294-297 — the 30 second faction tick. -->
      <!-- Source: server-scripts/Player.cs:11619-11623 — CmdIncreaseFaction adds the value unchanged. -->
      <p>
        A friendly pet gives 1 to 4 reputation with its faction every 30
        seconds, so around 5 per minute. This is the only source that does not
        involve killing something.
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
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <ul class="list-disc space-y-2 pl-5">
        <li>
          <!-- Source: server-scripts/Npc.cs:1895-1904 — faction vendors require 15,000 standing. -->
          <strong class="text-foreground">Faction vendors</strong> will not open their
          shop below 15,000 reputation. This is a plain number and not a tier boundary,
          since Friendly already starts at 1,000.
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
          <!-- Source: server-scripts/Npc.cs:1684-1688 — NPCs refuse to talk below -500. -->
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
      <Card.Title>Decay and Caps</Card.Title>
      <Card.Description>
        Reputation does not drop on its own, and there is no upper limit.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <p>
        Nothing in the game lowers reputation over time. It only changes when
        one of the sources above applies, so a faction you ignore keeps whatever
        value it had.
      </p>
      <!-- Source: server-scripts/UIFactions.cs:84-89 — the Revered readout clamps only the slider. -->
      <p>
        There is also no cap. The "/ Max" text the faction panel shows at
        Revered only limits how far the slider fills, not the value itself.
      </p>
    </Card.Content>
  </Card.Root>
</div>
