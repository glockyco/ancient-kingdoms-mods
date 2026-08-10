<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import LockKeyhole from "@lucide/svelte/icons/lock-keyhole";

  let { data } = $props();
  let query = $state("");

  const normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  const allAchievements = $derived(
    data.groups.flatMap((group) => group.achievements),
  );
  const visibleCount = $derived(
    normalizedQuery.length === 0
      ? data.total
      : allAchievements.filter((achievement) =>
          achievement.searchText.includes(normalizedQuery),
        ).length,
  );
  const showcaseIds = [
    "FIRST_STEPS",
    "VETERAN_EDGE",
    "MAGIC_ITEM",
    "PLANESWALKER",
    "RESTORED_ALTAR",
    "KILL_BLACK_DRAGON",
    "KILL_ANCIENT_CYCLOPS",
    "KILL_PYROTH",
    "ALCHEMY_MASTER",
    "MINING_MASTER",
    "RADIANT_SEEKER_MASTER",
    "FISHER_MASTER",
  ];
  const showcase = $derived.by(() => {
    const byId = new Map(
      allAchievements.map((achievement) => [achievement.id, achievement]),
    );
    return showcaseIds.flatMap((id) => {
      const achievement = byId.get(id);
      return achievement ? [achievement] : [];
    });
  });
  const collectionNode = $derived(
    buildCollectionPage({
      path: "/achievements",
      name: "Ancient Kingdoms achievements",
      description:
        "All Ancient Kingdoms Steam achievements, with unlock conditions and related compendium pages.",
      items: allAchievements.map((achievement) => ({
        name: achievement.name,
        path: `/achievements#${achievement.anchor}`,
      })),
    }),
  );

  function matches(searchText: string): boolean {
    return normalizedQuery.length === 0 || searchText.includes(normalizedQuery);
  }

  function groupHasMatches(achievements: { searchText: string }[]): boolean {
    return achievements.some((achievement) => matches(achievement.searchText));
  }
</script>

<!--
THESIS: A compact achievement atlas makes all 38 unlock conditions easy to scan. It refuses a generic card wall.
OWN-WORLD: The site’s neutral canvas, fine rules, square Steam art, restrained amber markers, and dense reference typography.
STORY: Readers see the complete catalog, move by category, search exact terms, and open the related compendium page.
FIRST VIEWPORT: The title and purpose occupy the left side. A twelve-icon trophy field forms the visual index on the right.
FORM: The third grounded structure is a category atlas with a compact index. Seed key 6e8ae28a.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->

<Seo
  title="Achievements - Ancient Kingdoms"
  description="All 38 Ancient Kingdoms Steam achievements, grouped by unlock type with related quests, bosses, professions, and mechanics guides."
  path="/achievements"
/>
<JsonLd node={collectionNode} />

<div class="container mx-auto max-w-6xl px-5 py-8 sm:px-8">
  <Breadcrumb
    items={[{ label: "Home", href: "/" }, { label: "Achievements" }]}
  />

  <header class="achievement-header mt-9 border-b pb-10 sm:mt-12 sm:pb-14">
    <div class="max-w-2xl">
      <h1
        class="max-w-xl text-balance text-4xl font-bold tracking-[-0.035em] sm:text-5xl lg:text-6xl"
      >
        Every achievement and how to unlock it
      </h1>
      <p
        class="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg"
      >
        Find all {data.total} Steam achievements for Ancient Kingdoms. Each entry
        gives the Steam unlock condition. If an achievement has one specific target,
        the entry also links to the related compendium page.
      </p>
    </div>

    <div class="achievement-field" aria-hidden="true">
      {#each showcase as achievement (achievement.id)}
        <img
          src={achievement.iconPath}
          alt=""
          class="achievement-field-icon"
          width="64"
          height="64"
        />
      {/each}
    </div>
  </header>

  <div class="mt-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
    <aside class="lg:sticky lg:top-6 lg:self-start">
      <nav aria-label="Achievement categories">
        <ul
          class="grid grid-cols-2 gap-1 border-b pb-3 lg:block lg:space-y-0.5 lg:border-b-0 lg:pb-0"
        >
          {#each data.groups as group (group.id)}
            <li>
              <a
                href="#{group.id}"
                class="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-foreground/75 hover:bg-amber-500/10 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-amber-300"
              >
                <span>{group.name}</span>
                <span class="text-xs tabular-nums"
                  >{group.achievements.length}</span
                >
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>

    <main class="min-w-0">
      <div
        class="js-only sticky top-0 z-10 -mx-2 border-b bg-background/95 px-2 py-4 backdrop-blur-sm"
      >
        <div class="flex items-center gap-3">
          <label class="relative block min-w-0 flex-1" for="achievement-search">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span class="sr-only">Search achievements</span>
            <input
              id="achievement-search"
              type="search"
              bind:value={query}
              placeholder="Search names, conditions, bosses, or professions"
              class="h-10 w-full rounded-md border bg-background pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {#if query}
              <button
                type="button"
                onclick={() => (query = "")}
                class="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Clear achievement search"
              >
                <X class="h-4 w-4" />
              </button>
            {/if}
          </label>
          <output
            class="hidden min-w-20 text-right text-xs tabular-nums text-muted-foreground sm:block"
            aria-live="polite"
          >
            {visibleCount}
            {visibleCount === 1 ? "result" : "results"}
          </output>
        </div>
      </div>

      {#if visibleCount === 0}
        <div class="js-only py-20 text-center">
          <p class="font-medium">No achievement matches “{query.trim()}”.</p>
          <button
            type="button"
            onclick={() => (query = "")}
            class="mt-3 text-sm text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
          >
            Clear the search
          </button>
        </div>
      {/if}

      <div class="space-y-16 py-10 sm:space-y-20 sm:py-14">
        {#each data.groups as group (group.id)}
          <section
            id={group.id}
            data-group={group.id}
            class="achievement-group scroll-mt-20"
            hidden={!groupHasMatches(group.achievements)}
          >
            <div
              class="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <h2
                  class="flex items-center gap-2.5 text-2xl font-semibold tracking-tight"
                >
                  <span
                    class="h-2 w-2 rounded-full bg-amber-500"
                    aria-hidden="true"
                  ></span>
                  {group.name}
                </h2>
                <p class="mt-1 text-sm text-foreground/70">
                  {group.description}
                </p>
              </div>
              <span class="text-xs tabular-nums text-foreground/70">
                {group.achievements.length}
                {group.achievements.length === 1
                  ? "achievement"
                  : "achievements"}
              </span>
            </div>

            <ul class="grid gap-x-8 md:grid-cols-2">
              {#each group.achievements as achievement (achievement.id)}
                <li
                  id={achievement.anchor}
                  class="achievement-entry scroll-mt-24 border-b py-5"
                  hidden={!matches(achievement.searchText)}
                >
                  <article class="grid grid-cols-[4rem_minmax(0,1fr)] gap-4">
                    <div class="achievement-icon-frame h-16 w-16 self-start">
                      <img
                        src={achievement.iconPath}
                        alt=""
                        width="64"
                        height="64"
                        loading="lazy"
                        class="aspect-square h-16 w-16 object-cover"
                      />
                    </div>
                    <div class="min-w-0 pt-0.5">
                      <div class="flex items-start justify-between gap-3">
                        <h3 class="text-base font-semibold leading-6">
                          {achievement.name}
                        </h3>
                        {#if achievement.hidden}
                          <span
                            class="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                          >
                            <LockKeyhole
                              class="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Hidden
                          </span>
                        {/if}
                      </div>
                      <p
                        class="mt-1 text-pretty text-sm leading-6 text-foreground/70"
                      >
                        {achievement.description}
                      </p>
                      {#if achievement.relationships.length > 0}
                        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                          {#each achievement.relationships as relationship (relationship.href)}
                            <a
                              href={relationship.href}
                              class="inline-flex items-center gap-1 text-sm font-medium text-blue-600 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-400"
                            >
                              {relationship.label}
                              <ArrowUpRight
                                class="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </a>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </article>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </main>
  </div>
</div>

<style>
  .achievement-header {
    display: grid;
    gap: 2.5rem;
  }

  .achievement-field {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.4rem;
    align-items: center;
  }

  .achievement-field-icon {
    aspect-ratio: 1;
    width: 100%;
    border-radius: 0.3rem;
    object-fit: cover;
    opacity: 0.92;
    filter: saturate(0.92);
    transition:
      opacity 220ms ease-out,
      filter 220ms ease-out,
      transform 220ms ease-out;
  }

  .achievement-icon-frame {
    border-radius: 0.45rem;
    background: color-mix(in oklab, var(--group-accent) 15%, transparent);
    box-shadow: 0 0.35rem 1rem
      color-mix(in oklab, var(--foreground) 10%, transparent);
    overflow: hidden;
  }

  .achievement-group[data-group="progression"] {
    --group-accent: var(--chart-1);
  }

  .achievement-group[data-group="quests"] {
    --group-accent: var(--chart-2);
  }

  .achievement-group[data-group="combat"] {
    --group-accent: var(--destructive);
  }

  .achievement-group[data-group="professions"] {
    --group-accent: var(--chart-4);
  }

  .achievement-group[data-group="exploration"] {
    --group-accent: var(--chart-3);
  }

  .achievement-group[data-group="items"] {
    --group-accent: var(--quality-legendary);
  }

  .achievement-entry:target {
    background: color-mix(in oklab, var(--group-accent) 8%, transparent);
    border-color: color-mix(in oklab, var(--group-accent) 45%, var(--border));
  }

  @media (min-width: 48rem) {
    .achievement-header {
      grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
      align-items: center;
    }

    .achievement-field {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.55rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .achievement-field-icon {
      transition: none;
    }
  }
</style>
