<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
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
  import AchievementLink from "$lib/components/AchievementLink.svelte";

  let { data } = $props();

  const mechanics = PROFESSION_MECHANICS.radiant_seeker;
  const sections = [
    { id: "gathering", label: "Gathering Aether" },
    { id: "chance", label: "Aether chance" },
    { id: "locations", label: "Spark locations" },
    { id: "combat", label: "Aether in combat" },
    { id: "progression", label: "Progression" },
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

<div class="container mx-auto max-w-4xl space-y-10 p-8">
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
      />.
      <strong class="font-semibold text-foreground"
        >Your Aether chance increases from 5% at 0 skill to 25% at 100.</strong
      >
    </p>
  </ProfessionHeader>

  <section id="gathering" class="space-y-4">
    <h2 class="text-xl font-semibold">Gathering Radiant Aether</h2>
    <ol class="divide-y divide-border">
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">Find a Radiant Spark.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            The world has {data.resource.node_count} sparks in {data.resource
              .zones.length}
            zones. You do not need a tool.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Gather the spark.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            A spark has no success check. Each gather gives {data.resource
              .gathering_exp}
            experience and can increase Radiant Seeker.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer -->
      <!-- Source: server-scripts/GatherItem.cs:Update -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">3</span>
        <div>
          <p class="font-medium">Roll for Radiant Aether.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            The reward chance is 5% to 25%. The spark returns after a random
            {mechanics.respawnSeconds[0]} to {mechanics.respawnSeconds[1].toLocaleString()}
            seconds (1 minute 40 seconds to 1 hour).
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section id="chance" class="space-y-4">
    <h2 class="text-xl font-semibold">Aether chance</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Radiant Seeker changes the reward roll. It does not change whether you can
      gather a spark.
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

  <section id="combat" class="space-y-4">
    <h2 class="text-xl font-semibold">Radiant Aether in combat</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Radiant Aether can activate automatically in three combat situations. Each
      activation consumes one Aether.
      {#if data.recipe_count === 0}
        No crafting recipe uses it.
      {/if}
    </p>
    <p class="max-w-2xl text-pretty text-xs text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:HasRadiantAether — combat checks only slots 0–23. -->
      <span class="font-medium text-foreground">Inventory requirement:</span>
      Only Aether in the 24 base carry slots is checked. Backpack-added slots do not
      count.
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
          Critical resistance reduces the extra damage afterward.
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
            <span>When a hostile area skill targets your party</span>
          </div>
          <span class="pl-7 text-xs font-medium text-sky-500 sm:pl-0"
            >Variable activation</span
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
              <dt>1 eligible player</dt>
              <dd class="font-medium tabular-nums text-foreground">15%</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 py-1.5">
              <dt>2 or more eligible players</dt>
              <dd class="text-right font-medium text-foreground">
                Each gets the lower of 10% or 25% ÷ player count
              </dd>
            </div>
          </dl>
          <p class="mt-2 max-w-lg text-pretty text-xs text-muted-foreground">
            A player is eligible when they carry Aether in a base inventory
            slot. The game checks players until one activation succeeds.
          </p>
        </details>
      </div>
    </div>
  </section>

  <section id="progression" class="space-y-3">
    <h2 class="text-xl font-semibold">Progression</h2>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      <!-- Source: server-scripts/Database.cs:CharacterCreate -->
      Fire Goblins start with {mechanics.startingBonus.percent}% Radiant Seeker.
      Every other race starts at 0%.
    </p>
    {#if data.profession.achievement_name}
      <p class="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        <AchievementLink
          achievementId={data.profession.achievement_id}
          achievementName={data.profession.achievement_name}
          text={`At ${mechanics.capPercent}%, you unlock the ${data.profession.achievement_name} achievement.`}
        />
      </p>
    {/if}
  </section>
</div>
