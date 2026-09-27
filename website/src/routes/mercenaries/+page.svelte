<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { Alert } from "$lib/components/ui/alert";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import {
    CLASSES,
    DEATH_SAVE_MIN_LEVEL,
    MAX_HIRED,
    MAX_PARTY,
    MAX_VETERAN,
    MERC_MIN_LEVEL,
    activeMercenaryLimit,
    hirePrice,
    mercenaryResource,
    resurrectionPrice,
  } from "$lib/utils/merc-stats";
  import { petHref } from "$lib/utils/pets";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Calculator from "@lucide/svelte/icons/calculator";
  import Check from "@lucide/svelte/icons/check";
  import Info from "@lucide/svelte/icons/info";
  import Users from "@lucide/svelte/icons/users";
  import X from "@lucide/svelte/icons/x";

  let { data } = $props();

  const link = "text-blue-600 hover:underline dark:text-blue-400";
  const fmt = (n: number) => n.toLocaleString("en-US");

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/mercenaries",
      name: "Mercenaries — Ancient Kingdoms Compendium",
      description: `The ${data.mercenaries.length} hireable mercenary classes in Ancient Kingdoms, compared.`,
      items: data.mercenaries.map((m) => ({
        name: m.name,
        path: petHref(m.id, true),
      })),
    }),
  );

  const recruiterCount = $derived(
    new Set(data.recruiters.map((r) => r.npc_id)).size,
  );

  const ATTRIBUTES = [
    ["STR", "Strength"],
    ["DEX", "Dexterity"],
    ["CON", "Constitution"],
    ["INT", "Intelligence"],
    ["WIS", "Wisdom"],
    ["CHA", "Charisma"],
  ] as const;

  const rows = $derived(
    data.mercenaries.map((m) => {
      const cls = m.type_monster;
      const def = CLASSES[cls];
      if (!def) throw new Error(`No growth data for mercenary class ${cls}`);
      const fastest = ATTRIBUTES.filter(([key]) => def.div[key] === 2).map(
        ([, name]) => name,
      );
      return {
        ...m,
        resource: mercenaryResource(cls),
        fastest,
      };
    }),
  );

  const deathSaveClasses = $derived(rows.filter((r) => r.hasDeathSave));

  const resourceClass: Record<string, string> = {
    Rage: "text-stat-atk",
    Mana: "text-stat-mana",
    Songs: "text-foreground",
  };

  const LIMIT_STEPS = [10, 20, 30, 40].map((level) => ({
    level,
    limit: activeMercenaryLimit(level),
  }));

  const STANCE_ROWS = [
    { label: "Attacks your target", aggressive: true, defensive: false },
    {
      label: "Attacks enemies that hit you or it",
      aggressive: true,
      defensive: false,
    },
    { label: "Uses heals and buffs", aggressive: true, defensive: true },
  ];
</script>

{#snippet mark(yes: boolean)}
  {#if yes}
    <Check
      class="inline-block h-4 w-4 align-middle text-emerald-500"
      aria-label="Yes"
    />
  {:else}
    <span class="text-muted-foreground" aria-label="No">—</span>
  {/if}
{/snippet}

<Seo
  title="Mercenaries - Ancient Kingdoms"
  description={`Compare the ${data.mercenaries.length} mercenary classes in Ancient Kingdoms. How hiring, party limits, growth, stance, and resurrection work, and where to find every recruiter.`}
  path="/mercenaries"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <div class="space-y-4">
    <Breadcrumb
      items={[{ label: "Home", href: "/" }, { label: "Mercenaries" }]}
    />
    <MercenaryNav mercenaries={data.links} current="overview" />
  </div>

  <section class="rounded-lg border p-6 md:p-8">
    <div class="flex flex-wrap items-start gap-4">
      <div class="rounded-lg bg-sky-500/10 p-3">
        <Users class="h-7 w-7 text-sky-500 dark:text-sky-400" />
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
          Mercenaries
        </h1>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          Hired fighters that join your party and level up with you.
        </p>
      </div>
    </div>

    <!-- Source: server-scripts/Npc.cs:1893-1904, UIMercenaries.cs:297-299,380 -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {data.mercenaries.length}
        </div>
        <div class="text-sm text-muted-foreground">Classes</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{recruiterCount}</div>
        <div class="text-sm text-muted-foreground">Recruiters</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{MERC_MIN_LEVEL}</div>
        <div class="text-sm text-muted-foreground">Level to hire</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {activeMercenaryLimit(40)}
        </div>
        <div class="text-sm text-muted-foreground">Active at level 40</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{MAX_HIRED}</div>
        <div class="text-sm text-muted-foreground">Hired at most</div>
      </div>
    </div>
  </section>

  <section id="classes" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Compare the classes</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Every recruiter hires every class.
      </p>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full min-w-[560px] text-sm">
        <thead>
          <tr class="border-b text-left text-muted-foreground">
            <th class="px-4 py-2.5 font-medium">Class</th>
            <th class="px-4 py-2.5 font-medium">Resource</th>
            <th class="px-4 py-2.5 text-center font-medium">Heals</th>
            <th class="px-4 py-2.5 text-center font-medium">Buffs</th>
            <th class="px-4 py-2.5 text-center font-medium">Death save</th>
            <th class="px-4 py-2.5 font-medium">Grows fastest</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-2.5 font-medium">
                <EntityLink
                  href={petHref(row.id, true)}
                  name={row.type_monster}
                  domain="class"
                  entityId={row.type_monster.toLowerCase()}
                  imageKind="icon"
                  imageAvailable={row.class_icon}
                  variant="reference"
                  fallback={Users}
                  size={28}
                />
              </td>
              <td class="px-4 py-2.5 font-medium {resourceClass[row.resource]}"
                >{row.resource}</td
              >
              <!-- Source: server-scripts/Pet.cs:2184,2367,4544,4744 — hasHeals and hasBuffs switch on the pet AI heal and buff checks. -->
              <td class="px-4 py-2.5 text-center">
                {@render mark(row.has_heals)}
              </td>
              <td class="px-4 py-2.5 text-center">
                {#if row.type_monster === "Bard"}
                  <!-- Source: server-scripts/BardMercenarySkills.cs:LateUpdate,RefreshAura — Bard songs buff allies outside the pet buff AI. -->
                  <a href="{petHref(row.id, true)}#songs-title" class={link}
                    >Songs</a
                  >
                {:else}
                  {@render mark(row.has_buffs)}
                {/if}
              </td>
              <td class="px-4 py-2.5 text-center">
                {#if row.hasDeathSave}
                  <a
                    href="{petHref(row.id, true)}#death-save-title"
                    class="inline-flex align-middle"
                    aria-label="{row.type_monster} death save"
                    ><Check class="h-4 w-4 text-emerald-500" /></a
                  >
                {:else}
                  {@render mark(false)}
                {/if}
              </td>
              <td class="px-4 py-2.5">{row.fastest.join(", ")}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="growth" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Attribute growth</h2>
      <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel — each attribute gains 1 at every multiple of its class interval. -->
      <p class="mt-1 text-sm text-muted-foreground">
        A class gains +1 in an attribute every few levels. The table shows how
        many levels each +1 takes.
      </p>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="border-b text-muted-foreground">
            <th class="px-4 py-2.5 text-left font-medium">Class</th>
            {#each ATTRIBUTES as [, name] (name)}
              <th class="px-4 py-2.5 text-right font-medium">{name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-2.5 font-medium">
                <EntityLink
                  href={petHref(row.id, true)}
                  name={row.type_monster}
                  domain="class"
                  entityId={row.type_monster.toLowerCase()}
                  imageKind="icon"
                  imageAvailable={row.class_icon}
                  variant="reference"
                  fallback={Users}
                  size={28}
                />
              </td>
              {#each ATTRIBUTES as [key] (key)}
                {@const every = CLASSES[row.type_monster].div[key]}
                <td
                  class="px-4 py-2.5 text-right tabular-nums {every === 2
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'}">{every}</td
                >
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <!-- Source: exported-data/pets.json — every mercenary prefab has 1 + 1 per level in each resistance. -->
    <p class="text-sm text-muted-foreground">
      Every class also gains +1 to each resistance every level.
    </p>
  </section>

  <section id="how-it-works" class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How mercenaries work</h2>

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Hire a mercenary at a <a href="#recruiters" class={link}
              >recruiter</a
            >.
          </div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Npc.cs:1893-1904, UIMercenaries.cs:CalculatePriceMercenaryLevel, Charisma.cs:17-20, UINpcTrading.cs:824-831, Utils.cs:GetRandomChar -->
            <p>
              <span class="block"
                >Recruiters serve you from level {MERC_MIN_LEVEL}.</span
              >
              <span class="block">
                The price is {fmt(hirePrice(MERC_MIN_LEVEL, 0))} gold at level {MERC_MIN_LEVEL}.
                It rises to {fmt(hirePrice(50, MAX_VETERAN))} gold at level 50 with
                veteran level {MAX_VETERAN}.
              </span>
              <span class="block">
                Charisma lowers the price by 0.2% for each point, up to 25%.
              </span>
              <span class="block">
                A recruiter that prefers a race hires that race when the class
                allows it. Otherwise, the race is random.
                <a href="/mechanics/mercenary-stats" class={link}
                  >Race odds and stat ranges</a
                >
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              price = round(20 + 400 × ((level − 10) ÷ 40)² + 15 × veteran
              level)
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Summon it into your party.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/UIMercenaries.cs:297-299,380, Player.cs:10115-10120,10290-10305 -->
            <p>
              <span class="block">
                You can keep up to {MAX_HIRED} hired mercenaries.
              </span>
              <span class="block">
                Your level sets how many of them can be active:
              </span>
            </p>
            <ul class="flex flex-wrap gap-2">
              {#each LIMIT_STEPS as step (step.level)}
                <li
                  class="rounded-md border px-2.5 py-1 text-sm tabular-nums text-foreground"
                >
                  Level {step.level}+ · {step.limit} active
                </li>
              {/each}
            </ul>
            <p>
              <span class="block"
                >A party holds at most {MAX_PARTY} members.</span
              >
              <span class="block"
                >Each active mercenary counts as one member.</span
              >
              <span class="block"
                >In a full party, you cannot summon a mercenary.</span
              >
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>It levels up with you.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel, PetSkills.cs:OnStartServer, Player.cs:10352-10365 -->
            <p>
              <span class="block">A mercenary always has your level.</span>
              <span class="block">
                Its attributes and resistances grow as the
                <a href="#growth" class={link}>growth table</a> shows.
              </span>
              <span class="block">
                Its skill ranks rise with your level and veteran level, up to
                each skill's max rank.
              </span>
              <span class="block">
                Each veteran level adds 0.25% to its Health multiplier and to
                its Mana or Rage multiplier.
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              skill rank = ⌊level ÷ 5⌋ + ⌊veteran level ÷ 10⌋
            </p>
            <Alert variant="info">
              <Info />
              <div>
                <!-- Source: server-scripts/Player.cs:4629-4652, Player.cs:10347-10348, Database.cs:SaveNewMercenary -->
                <p class="font-medium">
                  Game quirk: veteran damage does not stay
                </p>
                <p>
                  A veteran level gained while a mercenary is summoned adds +1
                  damage and +1 magic damage.
                </p>
                <p>
                  The game does not save this bonus. The next summon restores
                  the damage rolled at hire, or rolls again if that roll was 0.
                </p>
              </div>
            </Alert>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>Choose a stance.</div>
          <!-- Source: server-scripts/Pet.cs:OnAggro,UserCode_CmdSetAggresiveStance__Boolean; Pet.cs:2198-2209; Player.cs:OnAggro; Combat.cs:668,1187 -->
          <div class="mt-2 overflow-x-auto">
            <table class="text-sm">
              <thead>
                <tr class="text-muted-foreground">
                  <th class="py-1.5 pr-8 text-left font-normal"></th>
                  <th class="px-4 py-1.5 font-medium text-foreground"
                    >Aggressive</th
                  >
                  <th class="px-4 py-1.5 font-medium text-foreground"
                    >Defensive</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each STANCE_ROWS as stance (stance.label)}
                  <tr class="border-t">
                    <td class="py-1.5 pr-8 text-muted-foreground"
                      >{stance.label}</td
                    >
                    {#each [stance.aggressive, stance.defensive] as yes, i (i)}
                      <td class="px-4 py-1.5 text-center">
                        {#if yes}
                          <Check
                            class="mx-auto h-4 w-4 text-emerald-500"
                            aria-label="Yes"
                          />
                        {:else}
                          <X
                            class="mx-auto h-4 w-4 text-muted-foreground"
                            aria-label="No"
                          />
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            When you switch to defensive, your mercenaries stop their attack.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">5</div>
        <div>
          <div>Bring it back when it dies.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Pet.cs:OnDeath,UpdateServer_DEAD, Combat.cs:1350-1361 -->
            <p>
              <span class="block">The corpse stays for 5 minutes.</span>
              {#if deathSaveClasses.length > 0}
                <span class="block">
                  From level {DEATH_SAVE_MIN_LEVEL},
                  {#each deathSaveClasses as c, i (c.id)}{i > 0
                      ? " and "
                      : ""}<a
                      href="{petHref(c.id, true)}#death-save-title"
                      class={link}>{c.type_monster}</a
                    >{/each} mercenaries can survive a hit that would kill them.
                </span>
              {/if}
            </p>
            <!-- Source: server-scripts/TargetHealSkill.cs:232-253, Player.cs:ResurrectMercenaryNearOwner,UserCode_CmdResurrectMerc__String__Int64,ProcessMercenariesOnPlayerRespawn,10417 -->
            <div class="overflow-x-auto">
              <table class="text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="py-1.5 pr-6 font-medium text-foreground"
                      >Way back</th
                    >
                    <th class="py-1.5 pr-6 font-medium text-foreground">When</th
                    >
                    <th class="py-1.5 font-medium text-foreground">Health</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >A resurrect skill or scroll</td
                    >
                    <td class="py-1.5 pr-6">While the corpse stays</td>
                    <td class="py-1.5">10%</td>
                  </tr>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >A recruiter, for a fee</td
                    >
                    <td class="py-1.5 pr-6">At any time</td>
                    <td class="py-1.5"
                      >10%, or full at the next summon if the corpse is gone</td
                    >
                  </tr>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >Your respawn, for a fee each</td
                    >
                    <td class="py-1.5 pr-6">When you respawn</td>
                    <td class="py-1.5">10%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Source: server-scripts/Player.cs:GetMercenaryResurrectionPrice, Combat.cs:739-755 -->
            <p>
              <span class="block">
                The fee is {fmt(resurrectionPrice(MERC_MIN_LEVEL, 0))} gold at level
                {MERC_MIN_LEVEL}. It rises to {fmt(
                  resurrectionPrice(50, MAX_VETERAN),
                )}
                gold at level 50 with veteran level {MAX_VETERAN}.
              </span>
              <span class="block">
                Charisma lowers the fee in the same way as the hire price.
              </span>
              <span class="block">
                Gear stays on the mercenary, and death does not lower its
                durability.
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              fee = round(5 + 295 × ((level − 1) ÷ 49)^2.8 + 10 × veteran level)
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">6</div>
        <div>
          <div>If you die, your mercenaries leave.</div>
          <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath,ReloadSummonedMercenaries,13004-13008, UIRespawn.cs:Respawn, Player.cs:ProcessMercenariesOnPlayerRespawn,10254-10273 -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block">
              Living mercenaries return when you respawn or when someone
              resurrects you.
            </span>
            <span class="block">
              When you respawn, the game also pays the fee for each dead
              summoned mercenary, up to 4.
            </span>
            <span class="block">
              If you cannot pay for all of them, none of them return.
            </span>
          </p>
        </div>
      </div>
    </div>
  </section>

  <section id="recruiters" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Where to hire</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        A preferred race applies only to the classes that allow it. Each
        mercenary page shows the race that class gets.
      </p>
    </div>
    <RecruiterTable
      recruiters={data.recruiters}
      urlKey="mercenary-recruiters"
    />
  </section>

  <section>
    <a
      href="/mechanics/mercenary-stats"
      class="group flex items-center gap-4 rounded-lg border p-5 transition-colors hover:bg-muted/30"
    >
      <div class="rounded-lg bg-teal-500/10 p-3">
        <Calculator class="h-6 w-6 text-teal-500" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-semibold group-hover:underline">
          Stat ranges and hiring odds
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          Compare Health, Mana, Attack Power, and Spell Power for every class
          and race at any level. See how many hires it takes to roll a strong
          mercenary.
        </p>
      </div>
      <ArrowRight class="h-5 w-5 shrink-0 text-muted-foreground" />
    </a>
  </section>
</div>
