<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import * as Card from "$lib/components/ui/card";
  import GuideFacts from "$lib/components/GuideFacts.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import MasteryCurve from "$lib/components/professions/MasteryCurve.svelte";
  import ProfessionHeader from "$lib/components/professions/ProfessionHeader.svelte";
  import {
    PROFESSION_MECHANICS,
    linearProcChance,
    skillGainChance,
  } from "$lib/data/professions/mechanics";
  import HeartPulse from "@lucide/svelte/icons/heart-pulse";
  import Shield from "@lucide/svelte/icons/shield";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Swords from "@lucide/svelte/icons/swords";

  let { data } = $props();

  const mechanics = PROFESSION_MECHANICS.radiant_seeker;
  const sections = [
    { id: "chance", label: "Aether chance" },
    { id: "locations", label: "Spark locations" },
    { id: "how-it-works", label: "How radiant seeking works" },
    { id: "combat", label: "Aether in combat" },
  ];

  let skillLevel = $state(mechanics.startingBonus.percent);

  const aetherChance = $derived(
    linearProcChance(mechanics.procChance, skillLevel),
  );
  const gainChance = $derived(
    skillLevel >= mechanics.capPercent
      ? 0
      : skillGainChance(mechanics.skillGain, skillLevel),
  );
  const curveSeries = [
    {
      id: "radiant_aether",
      label: "Radiant Aether",
      chanceAt: (skillPercent: number) =>
        linearProcChance(mechanics.procChance, skillPercent),
    },
  ];
  const maxZoneNodes = $derived(
    Math.max(...data.resource.zones.map((zone) => zone.node_count)),
  );
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`Radiant Seeker raises the Radiant Aether chance from 5% to 25%. Find ${data.resource.node_count} Radiant Sparks across ${data.resource.zones.length} zones and learn how Aether changes combat.`}
  path="/professions/radiant_seeker"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <ProfessionHeader
    profession={data.profession}
    icon={Sparkles}
    iconClass="text-yellow-500"
    iconBackgroundClass="bg-yellow-500/10"
    {sections}
  >
    <!-- Source: server-scripts/GatherItem.cs:OnInteractServer -->
    <p>
      Gather Radiant Sparks to find
      <ItemLink
        itemId={data.resource.reward_item_id}
        itemName={data.resource.reward_item_name}
        tooltipHtml={data.resource.reward_tooltip_html}
        imageAvailable={data.resource.reward_visual_public_path}
      />.
      <strong class="font-semibold text-foreground"
        >Your Aether chance increases from 5% at 0 skill to 25% at 100.</strong
      >
    </p>
  </ProfessionHeader>

  <section id="chance" class="space-y-4">
    <h2 class="text-xl font-semibold">Aether chance</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Radiant Seeker increases the chance that a spark gives you Radiant Aether.
      You can gather sparks at any Radiant Seeker skill.
    </p>

    <div class="space-y-5 rounded-lg border p-4 md:p-5">
      <div class="flex flex-wrap items-baseline gap-3">
        <label
          for="radiant-skill"
          class="text-xs uppercase tracking-wider text-muted-foreground"
          >Radiant Seeker skill</label
        >
        <input
          id="radiant-skill"
          type="range"
          min="0"
          max={mechanics.capPercent}
          bind:value={skillLevel}
          class="w-44 accent-yellow-500"
        />
        <output class="w-14 text-lg font-semibold tabular-nums"
          >{skillLevel}%</output
        >
      </div>

      <MasteryCurve
        series={curveSeries}
        {skillLevel}
        ariaLabel="Radiant Aether chance against Radiant Seeker skill"
        skillLabel="Radiant Seeker skill"
        yMax={0.3}
        yTicks={[0, 0.1, 0.2, 0.3]}
      />

      <p class="text-pretty text-sm text-muted-foreground">
        At {skillLevel}% skill, each spark has a
        <strong class="font-semibold text-foreground"
          >{(aetherChance * 100).toFixed(1)}% chance</strong
        >
        to give Radiant Aether.
        {#if skillLevel < mechanics.capPercent}
          The chance to add 0.10% to 0.30% Radiant Seeker skill from a spark is {(
            gainChance * 100
          ).toFixed(0)}%.
        {:else}
          Your Radiant Seeker skill is at the cap.
        {/if}
      </p>

      <!-- Source: server-scripts/Database.cs:CharacterCreate -->
      <p class="text-pretty text-sm text-muted-foreground">
        Fire Goblins start with {mechanics.startingBonus.percent}% Radiant
        Seeker. Every other race starts at 0%.
      </p>
    </div>
  </section>

  <section id="locations" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">Spark locations</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {data.resource.node_count} Radiant Sparks across {data.resource.zones
            .length}
          zones.
        </p>
      </div>
      <MapLink entityType="resource" entityId={data.resource.id} />
    </div>

    <div class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {#each data.resource.zones as zone (zone.zone_id)}
        <div class="space-y-1.5">
          <div class="flex items-baseline justify-between gap-3 text-sm">
            <a
              href="/zones/{zone.zone_id}"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >{zone.zone_name}</a
            >
            <span class="tabular-nums text-muted-foreground"
              >{zone.node_count}</span
            >
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-yellow-500/70"
              style="width:{(zone.node_count / maxZoneNodes) * 100}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <Card.Root id="how-it-works" class="bg-muted/30">
    <Card.Header
      ><Card.Title class="text-xl">How radiant seeking works</Card.Title
      ></Card.Header
    >
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/GatherItem.cs:379-382; server-scripts/Player.cs:HasRadiantAether — sparks return in 100–3,600 seconds, and combat checks only slots 0–23. -->
      <GuideFacts
        facts={[
          { value: "100–3,600 s", label: "Spark return time" },
          { value: "24", label: "Inventory slots usable in combat" },
        ]}
      />
      <ol class="divide-y divide-border text-sm">
        <!-- Source: server-scripts/GatherItem.cs:343-365,379-382 — sparks have no tool or skill gate, and an attempt starts the respawn timer. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
          <span class="tabular-nums text-muted-foreground">1</span>
          <div>
            <p class="font-medium">Gather a Radiant Spark.</p>
            <p class="mt-0.5 text-muted-foreground">
              You need no tool. The spark begins its return timer when you
              gather it.
            </p>
          </div>
        </li>
        <!-- Source: server-scripts/GatherItem.cs:448-451 — each spark rolls for Radiant Aether based on Radiant Seeker skill. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
          <span class="tabular-nums text-muted-foreground">2</span>
          <div>
            <p class="font-medium">Check whether you found Radiant Aether.</p>
            <p class="mt-0.5 text-muted-foreground">
              Higher Radiant Seeker skill increases the chance. The spark
              returns even if you find none.
            </p>
          </div>
        </li>
      </ol>
      <!-- Source: server-scripts/Player.cs:HasRadiantAether — combat checks only the first 24 inventory slots. -->
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Keep Aether in the first 24 inventory slots for combat. Backpack-added
          slots do not count.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <section id="combat" class="space-y-4">
    <h2 class="text-xl font-semibold">Radiant Aether in combat</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Radiant Aether can activate automatically in three combat situations. Each
      activation consumes one Aether.
      {#if data.recipe_count === 0}
        No crafting recipe uses it.
      {/if}
    </p>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:HasRadiantAether — combat checks only slots 0–23. -->
      <span class="font-medium text-foreground">Inventory requirement:</span>
      Carry Radiant Aether in one of your first 24 inventory slots to use it in combat.
      Backpack-added slots do not count.
    </p>

    <div class="divide-y divide-border border-y border-border">
      <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
      <!-- Source: server-scripts/Player.cs:isRadiantAetherActivated -->
      <div class="py-4">
        <div
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm"
        >
          <div class="flex min-w-0 items-center gap-2 text-muted-foreground">
            <Swords class="h-5 w-5 shrink-0 text-rose-500" />
            <span>When your attack scores a critical hit</span>
          </div>
          <span
            class="pl-7 text-xs font-medium tabular-nums text-rose-500 sm:pl-0"
            >15% activation</span
          >
        </div>
        <h3 class="mt-2 font-semibold">Deal 3× damage instead of 1.5×</h3>
        <p class="mt-1 text-pretty text-sm text-muted-foreground">
          With 50% Critical Resist, a 3× critical hit deals 2× damage instead.
        </p>
      </div>

      <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
      <!-- Source: server-scripts/Player.cs:isRadiantAetherActivated -->
      <div class="py-4">
        <div
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm"
        >
          <div class="flex min-w-0 items-center gap-2 text-muted-foreground">
            <HeartPulse class="h-5 w-5 shrink-0 text-emerald-500" />
            <span>When an incoming hit is lethal</span>
          </div>
          <span
            class="pl-7 text-xs font-medium tabular-nums text-emerald-500 sm:pl-0"
            >15% activation</span
          >
        </div>
        <h3 class="mt-2 font-semibold">
          Take no damage and return to full health
        </h3>
      </div>

      <!-- Source: server-scripts/AreaDamageSkill.cs:Apply -->
      <!-- Source: server-scripts/AreaDebuffSkill.cs:Apply -->
      <!-- Source: server-scripts/ScriptableSkill.cs:TryActivateRadiantAetherForArea -->
      <div class="py-4">
        <div
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm"
        >
          <div class="flex min-w-0 items-center gap-2 text-muted-foreground">
            <Shield class="h-5 w-5 shrink-0 text-sky-500" />
            <span
              >When hostile area damage or a debuff targets players carrying
              Aether</span
            >
          </div>
          <span class="pl-7 text-xs font-medium text-sky-500 sm:pl-0"
            >Chance depends on the number of eligible Aether carriers</span
          >
        </div>
        <h3 class="mt-2 font-semibold">Cancel the area skill for everyone</h3>
        <p class="mt-1 text-pretty text-sm text-muted-foreground">
          One activation prevents the hostile area damage or debuff from
          affecting any target.
        </p>
        <details class="mt-3 text-sm">
          <summary
            class="w-fit cursor-pointer font-medium text-foreground hover:underline"
            >How group activation is calculated</summary
          >
          <dl
            class="mt-2 max-w-lg divide-y divide-border text-muted-foreground"
          >
            <div class="flex items-baseline justify-between gap-4 py-1.5">
              <dt>1 player carrying Aether</dt>
              <dd class="font-medium tabular-nums text-foreground">15%</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 py-1.5">
              <dt>2 or more players carrying Aether</dt>
              <dd class="text-right font-medium text-foreground">
                Each gets the lower of 10% or 25% ÷ player count
              </dd>
            </div>
          </dl>
          <p class="mt-2 max-w-lg text-pretty text-sm text-muted-foreground">
            Only players who carry Aether in a base inventory slot get an
            activation chance. The game checks each of them until one activation
            succeeds.
          </p>
        </details>
      </div>
    </div>
  </section>
</div>
