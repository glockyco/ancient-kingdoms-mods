<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";

  const link = "text-blue-600 hover:underline dark:text-blue-400";
  // Source: server-scripts/AmbientWorldPlacement.cs:IsExteriorZone — adventurers appear only in these six open-world zones.
  const ZONES = [
    { id: "twilight_forest", name: "Twilight Forest" },
    { id: "the_lone-lands", name: "The Lone-lands" },
    { id: "everfrost", name: "Everfrost" },
    { id: "crescent_coast", name: "Crescent Coast" },
    { id: "the_molten_summit", name: "The Molten Summit" },
    { id: "northern_wastes", name: "Northern Wastes" },
  ];
</script>

<Seo
  title="NPC Adventurers - Ancient Kingdoms"
  description="Where NPC adventurers roam, what they do, what fighting beside them earns, and the Wandering Merchant."
  path="/mechanics/adventurers"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "NPC Adventurers" },
    ]}
  />

  <h1 class="text-4xl font-bold">NPC Adventurers</h1>
  <PageSections sections={MECHANICS_SECTIONS["/mechanics/adventurers"]} />

  <Card.Root id="where" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Where They Appear</Card.Title>
      <Card.Description
        >Other adventurers roam the open world while players are there.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/AmbientWorldPopulation.cs:TickServer,IsUnobserved — a zone with a player fills with adventurers who arrive out of sight. -->
      <p>
        They appear in {#each ZONES as zone, index (zone.id)}{index > 0
            ? index === ZONES.length - 1
              ? " and "
              : ", "
            : ""}<a href="/zones/{zone.id}" class={link}>{zone.name}</a>{/each},
        never in dungeons. They arrive out of sight, and a zone fills up over
        the first few minutes after you enter it.
      </p>
      <!-- Source: server-scripts/AmbientWorldPopulation.cs:Spawn; server-scripts/AmbientAdventurer.cs:Initialize,InitializeCombatRole,ApplyStats; server-scripts/AmbientWorldCombat.cs:AllowsCombat — a random name, one of six classes, a level from 1 to 50, 150 + 60 Health per level, and no fighting with players. -->
      <p>
        Each one has a random name, a random class and a random level from 1 to
        50. Its Health is 150 plus 60 per level. You can't attack them, and they
        never attack you.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="activities" class="bg-muted/30">
    <Card.Header><Card.Title>What They Do</Card.Title></Card.Header>
    <Card.Content class="text-sm text-muted-foreground">
      <!-- Source: server-scripts/AmbientAdventurer.cs:FinishGatheringActivity; server-scripts/AmbientWorldPopulation.cs:ChooseActivity,VisitTavern — gathering leaves the node as it was. -->
      <p>
        They gather at resource nodes without using them up, stop at shops and
        taverns, and walk from one place to the next.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="fighting" class="bg-muted/30">
    <Card.Header><Card.Title>Fighting Beside Them</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/AmbientWorldCombat.cs:IsEligible,AdjustDamage; server-scripts/AmbientWorldPlacement.cs:AvailableHuntTarget — ordinary monsters from 8 levels below to 2 above the leader, never bosses, elites or invaders, and a small share of the monster's Health per hit. -->
      <p>
        Adventurers hunt ordinary monsters near their own level and never fight
        bosses, elites or invaders. Their hits are weak, so their fights take a
        long time.
      </p>
      <!-- Source: server-scripts/Monster.cs:OnDeath; server-scripts/AmbientWorldCombat.cs:OnMonsterDeath — adventurers leave the threat list before loot is assigned, so a kill without a player has no owner. -->
      <p>
        A monster that only adventurers hit drops nothing and gives no
        experience. If you hit it too, the kill is yours as usual.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="talking" class="bg-muted/30">
    <Card.Header><Card.Title>Talking to Them</Card.Title></Card.Header>
    <Card.Content class="text-sm text-muted-foreground">
      <!-- Source: server-scripts/AmbientAdventurer.cs:OnInteract,UserCode_CmdGreetTraveler__NetworkConnectionToClient — a greeting stops the adventurer and it answers. -->
      <p>
        Click an adventurer to talk. It stops and answers in a speech bubble.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="merchants" class="bg-muted/30">
    <Card.Header><Card.Title>Wandering Merchants</Card.Title></Card.Header>
    <Card.Content class="text-sm text-muted-foreground">
      <!-- Source: server-scripts/AmbientWorldPopulation.cs:Spawn; server-scripts/AmbientAdventurer.cs:HasCustomer — a merchant's level is within 2 of the player it appears for, and it stops while a nearby player targets it. -->
      <p>
        A <a href="/npcs/wandering_merchant" class={link}>Wandering Merchant</a>
        sells arrows, bandages and potions. Each one has a random name and a level
        within 2 of yours. Target it, and it stops so you can trade.
      </p>
    </Card.Content>
  </Card.Root>
</div>
