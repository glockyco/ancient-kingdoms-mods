<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import TitleScreenHero from "$lib/components/home/TitleScreenHero.svelte";
  import ClassicHome from "$lib/components/home/ClassicHome.svelte";
  import EntityGlyph from "$lib/components/EntityGlyph.svelte";
  import { HOME_COUNTS } from "$lib/generated/home-counts";
  import {
    HOME_SHOWCASE,
    type ShowcaseImage,
  } from "$lib/generated/home-showcase";
  import { MECHANICS_GROUPS } from "$lib/data/mechanics";
  import { entityRegistry, type EntityId } from "$lib/entities/registry";

  let { data } = $props();

  const title = "Ancient Kingdoms Compendium — Wiki, Map & Guides";
  const description =
    "Look up items, monsters, NPCs, zones, quests, skills, recipes, and mechanics, or explore the interactive map. Updated from game files after each patch.";

  /**
   * Pixel art is shown at a whole multiple of its own size so every source
   * pixel stays square. `box` is the side of the frame the art must fit.
   */
  function pixelSize(image: ShowcaseImage, box: number) {
    const scale = Math.max(
      1,
      Math.min(3, Math.round(box / Math.max(image.width, image.height))),
    );
    return { width: image.width * scale, height: image.height * scale };
  }

  // The zone grid steps through 1 to 5 columns and previews two full rows at
  // the current count; the rest are one click away.
  const ZONE_COLUMNS = [1, 2, 3, 4, 5] as const;
  const zoneCount = HOME_SHOWCASE.zones.length;
  let zonesOpen = $state(false);

  // The boss grid fits as many 10rem columns as its width allows, then spreads
  // the bosses evenly over the rows that needs: six in a five-wide grid become
  // two rows of three rather than five and one. `--fit-N` is the column count
  // for a grid wide enough for N columns; the container queries below pick it.
  const BOSS_FIT = [2, 3, 4, 5, 6, 7, 8] as const;
  const bossCount = HOME_SHOWCASE.worldBosses.length;
  const bossColumns = BOSS_FIT.map(
    (fit) =>
      `--fit-${fit}: ${Math.ceil(bossCount / Math.ceil(bossCount / fit))}`,
  ).join("; ");

  // Overview pages without a section of their own, in the order readers use them.
  const directory: readonly { id: EntityId; count: number }[] = [
    { id: "quest", count: HOME_COUNTS.quests },
    { id: "skill", count: HOME_COUNTS.skills },
    { id: "npc", count: HOME_COUNTS.npcs },
    { id: "mercenary", count: HOME_COUNTS.mercenaries },
    { id: "summon", count: HOME_COUNTS.summons },
    { id: "achievement", count: HOME_COUNTS.achievements },
    { id: "faction", count: HOME_COUNTS.factions },
    { id: "gathering_resource", count: HOME_COUNTS.gatheringResources },
    { id: "chest", count: HOME_COUNTS.chests },
    { id: "altar", count: HOME_COUNTS.altars },
    { id: "trap", count: HOME_COUNTS.traps },
  ];
</script>

<Seo {title} {description} path="/" />

<svelte:head>
  <!-- Without script the zone preview cannot open, so every zone shows. -->
  <noscript>
    <style>
      #home-zone-grid > li {
        display: list-item !important;
      }
    </style>
  </noscript>
</svelte:head>

<!-- Both layouts render; the `home-classic` class on <html>, set before the
     first paint from the reader's choice, shows one of them. -->
<div class="classic-layout">
  <ClassicHome live={data.live} checkedAt={data.checkedAt} />
</div>

<div class="title-layout">
  <TitleScreenHero live={data.live} checkedAt={data.checkedAt} />

  <div class="container mx-auto flex flex-col gap-12 px-5 pt-10 pb-16 sm:px-8">
    <section aria-labelledby="home-items">
      {@render heading(
        "home-items",
        "Items",
        "/items",
        `All ${formatNumber(HOME_COUNTS.items)} Items`,
      )}
      <ul class="entries sm:grid-cols-2 lg:grid-cols-4">
        {#each HOME_SHOWCASE.itemGroups as group (group.label)}
          {@const size = pixelSize(group.icon, 52)}
          <li>
            {@render entry(
              group.href,
              group.icon.src,
              size,
              group.label,
              `${formatNumber(group.count)} Items`,
            )}
          </li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="home-bosses">
      {@render heading(
        "home-bosses",
        "World Bosses",
        "/monsters",
        `All ${formatNumber(HOME_COUNTS.monsters)} Monsters`,
      )}
      <ul class="bosses" style={bossColumns}>
        {#each HOME_SHOWCASE.worldBosses as boss (boss.id)}
          <li>
            <a href={boss.href} class="boss-card">
              <span class="boss-stage dark" style:--glow={boss.glow}>
                <img
                  src={boss.sprite.src}
                  width={boss.sprite.width}
                  height={boss.sprite.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span class="boss-level">
                  <span class="sr-only">Level</span><span aria-hidden="true"
                    >Lv</span
                  >
                  {boss.level}
                </span>
              </span>
              <span class="boss-text">
                <span class="entry-name">{boss.name}</span>
                <span class="entry-meta">{boss.zone}</span>
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </section>

    <a href="/map" class="map-card dark">
      <img
        class="map-art"
        src={HOME_SHOWCASE.worldMap.src}
        width={HOME_SHOWCASE.worldMap.width}
        height={HOME_SHOWCASE.worldMap.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span class="map-copy">
        <span class="map-title">Interactive World Map</span>
        <span class="map-cta"
          >Open the Map <span aria-hidden="true">→</span></span
        >
      </span>
    </a>

    <section aria-labelledby="home-classes">
      {@render heading(
        "home-classes",
        "Classes",
        "/classes",
        `All ${HOME_COUNTS.classes} Classes`,
      )}
      <ul class="entries sm:grid-cols-2 lg:grid-cols-4">
        {#each HOME_SHOWCASE.classes as gameClass (gameClass.id)}
          <li>
            {@render entry(
              gameClass.href,
              gameClass.icon.src,
              { width: gameClass.icon.width, height: gameClass.icon.height },
              gameClass.name,
              gameClass.role,
            )}
          </li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="home-recipes">
      {@render heading(
        "home-recipes",
        "Recipes",
        "/recipes",
        `All ${formatNumber(HOME_COUNTS.recipes)} Recipes`,
      )}
      <ul class="entries sm:grid-cols-2 lg:grid-cols-4">
        {#each HOME_SHOWCASE.crafting as recipeType (recipeType.type)}
          {@const size = pixelSize(recipeType.icon, 52)}
          <li>
            {@render entry(
              recipeType.href,
              recipeType.icon.src,
              size,
              recipeType.type,
              `${formatNumber(recipeType.count)} Recipes`,
            )}
          </li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="home-professions">
      {@render heading(
        "home-professions",
        "Professions",
        "/professions",
        `All ${HOME_COUNTS.professions} Professions`,
      )}
      <div class="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {#each HOME_SHOWCASE.professionGroups as group (group.label)}
          <div>
            <h3 class="group-title">{group.label}</h3>
            <ul>
              {#each group.professions as profession (profession.id)}
                {@const size = pixelSize(profession.icon, 40)}
                <li>
                  <a href={profession.href} class="profession-link">
                    <span class="profession-icon">
                      <img
                        src={profession.icon.src}
                        width={size.width}
                        height={size.height}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span class="min-w-0">
                      <span class="entry-name">{profession.name}</span>
                      <span class="entry-meta">{profession.description}</span>
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>

    <section aria-labelledby="home-zones">
      {@render heading(
        "home-zones",
        "Zones",
        "/zones",
        `All ${HOME_COUNTS.zones} Zones`,
      )}
      <!-- One grid of every zone. Until it is opened, CSS shows the first two
           rows at the current column count; the button names how many more
           there are at each count. Without script every zone shows. -->
      <ul id="home-zone-grid" class="zones" class:open={zonesOpen}>
        {#each HOME_SHOWCASE.zones as zone (zone.id)}
          <li>{@render zoneCard(zone)}</li>
        {/each}
      </ul>
      <button
        type="button"
        class="more-zones js-only"
        aria-expanded={zonesOpen}
        aria-controls="home-zone-grid"
        onclick={() => (zonesOpen = !zonesOpen)}
      >
        {#if zonesOpen}
          Show Fewer Zones
        {:else}
          Show
          {#each ZONE_COLUMNS as columns (columns)}
            <span class="more-count" data-columns={columns}
              >{formatNumber(zoneCount - 2 * columns)}</span
            >
          {/each}
          More Zones
        {/if}
      </button>
    </section>

    <section aria-labelledby="home-more">
      <h2 id="home-more" class="section-title mb-4">More to Explore</h2>
      <ul class="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
        {#each directory as item (item.id)}
          {@const def = entityRegistry[item.id]}
          <li>
            <a href={def.overviewHref} class="directory-link">
              <span class="glyph"
                ><EntityGlyph icon={def.icon} size={18} /></span
              >
              <span class="flex-1 font-medium">{def.pluralLabel}</span>
              <span class="text-sm text-muted-foreground tabular-nums"
                >{formatNumber(item.count)}</span
              >
            </a>
          </li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="home-mechanics">
      {@render heading(
        "home-mechanics",
        "Mechanics",
        "/mechanics",
        "All Mechanics",
      )}
      <div class="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {#each MECHANICS_GROUPS as group (group.title)}
          <div>
            <h3 class="group-title">{group.title}</h3>
            <ul>
              {#each group.pages as page (page.href)}
                <li>
                  <a href={page.href} class="mechanics-link">
                    <span class="font-semibold">{page.title}</span>
                    <span class="text-sm text-muted-foreground"
                      >{page.summary}</span
                    >
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

{#snippet heading(id: string, title: string, href: string, label: string)}
  <div
    class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
  >
    <h2 {id} class="section-title">{title}</h2>
    <a
      {href}
      class="text-[0.9375rem] font-medium text-brand-gold hover:underline"
      >{label} <span aria-hidden="true">→</span></a
    >
  </div>
{/snippet}

{#snippet entry(
  href: string,
  src: string,
  size: { width: number; height: number },
  name: string,
  meta: string,
)}
  <a {href} class="entry">
    <span class="art">
      <img
        {src}
        width={size.width}
        height={size.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </span>
    <span class="min-w-0">
      <span class="entry-name">{name}</span>
      <span class="entry-meta">{meta}</span>
    </span>
  </a>
{/snippet}

{#snippet zoneCard(zone: (typeof HOME_SHOWCASE.zones)[number])}
  <a href={zone.href} class="zone-card">
    <img
      src={zone.shot.src}
      width={zone.shot.width}
      height={zone.shot.height}
      alt=""
      loading="lazy"
      decoding="async"
    />
    <span class="zone-copy">
      <span class="entry-name">{zone.name}</span>
      <span class="entry-meta"
        >{zone.isDungeon ? "Dungeon" : "Overworld"}{zone.levelMedian === null
          ? ""
          : ` · Median Level ${zone.levelMedian}`}</span
      >
    </span>
  </a>
{/snippet}

<style>
  .classic-layout,
  :global(html.home-classic) .title-layout {
    display: none;
  }
  :global(html.home-classic) .classic-layout {
    display: block;
  }
  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: 1.2;
  }

  .map-card {
    position: relative;
    display: block;
    overflow: hidden;
    min-height: 7rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--title-night);
    color: var(--foreground);
    text-decoration: none;
  }
  .map-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 60% 45%;
  }
  .map-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgb(7 5 29 / 0.92) 0%,
      rgb(7 5 29 / 0.75) 32%,
      rgb(7 5 29 / 0.1) 68%,
      transparent
    );
  }
  /* The title opens the band at the left; the action closes it at the right,
     on its own dark plate so the painted map stays legible behind it. */
  .map-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    min-height: 7rem;
    padding: 1.25rem 2rem;
  }
  .map-title {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.015em;
  }
  .map-cta {
    padding: 0.55rem 1rem;
    border: 1px solid color-mix(in oklab, var(--brand-gold) 65%, transparent);
    border-radius: calc(var(--radius) - 2px);
    background: rgb(7 5 29 / 0.82);
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.4);
    color: var(--brand-gold);
    font-size: 0.9375rem;
    font-weight: 600;
  }
  .map-card:hover .map-cta {
    border-color: var(--brand-gold);
  }

  .entries {
    display: grid;
    gap: 0.75rem;
  }
  /* Every entry is the same two-line card. Hover changes only the frame
     colour, so nothing on the page moves under the pointer. */
  .entry,
  .zone-card,
  .boss-card {
    display: flex;
    height: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    color: var(--card-foreground);
    text-decoration: none;
    transition: border-color 0.15s;
  }
  .entry {
    align-items: center;
    gap: 0.875rem;
    padding: 0.625rem;
  }
  .entry:hover,
  .zone-card:hover,
  .boss-card:hover {
    border-color: color-mix(in oklab, var(--brand-gold) 65%, transparent);
  }
  .entry:hover .entry-name,
  .zone-card:hover .entry-name,
  .boss-card:hover .entry-name {
    color: var(--brand-gold);
  }
  .entry:focus-visible,
  .zone-card:focus-visible,
  .boss-card:focus-visible,
  .map-card:focus-visible,
  .directory-link:focus-visible,
  .mechanics-link:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }
  .art {
    display: grid;
    flex: none;
    width: 4rem;
    height: 4rem;
    overflow: hidden;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--muted);
  }
  .art img {
    image-rendering: pixelated;
  }

  /* Each boss stands on a dark stage at the same height, scaled to fit, as
     the sprites range from 90 to 333 pixels tall. */
  .bosses {
    display: grid;
    grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
    gap: 0.75rem;
  }
  /* N columns of at least 10rem with 0.75rem gaps need N × 10.75rem − 0.75rem. */
  section:has(> .bosses) {
    container-type: inline-size;
  }
  @container (min-width: 20.75rem) {
    .bosses {
      --columns: var(--fit-2);
    }
  }
  @container (min-width: 31.5rem) {
    .bosses {
      --columns: var(--fit-3);
    }
  }
  @container (min-width: 42.25rem) {
    .bosses {
      --columns: var(--fit-4);
    }
  }
  @container (min-width: 53rem) {
    .bosses {
      --columns: var(--fit-5);
    }
  }
  @container (min-width: 63.75rem) {
    .bosses {
      --columns: var(--fit-6);
    }
  }
  @container (min-width: 74.5rem) {
    .bosses {
      --columns: var(--fit-7);
    }
  }
  @container (min-width: 85.25rem) {
    .bosses {
      --columns: var(--fit-8);
    }
  }
  .boss-card {
    flex-direction: column;
    overflow: hidden;
  }
  /* The glow takes the boss's own dominant colour and sits behind its body,
     so it reads as light from the sprite rather than a floor lamp. */
  .boss-stage {
    display: flex;
    height: 11rem;
    align-items: center;
    justify-content: center;
    /* The top strip holds the level badge clear of the sprite. */
    padding: 2.5rem 0.75rem 0.75rem;
    background:
      radial-gradient(
        circle closest-side at 50% 50%,
        color-mix(in oklab, var(--glow) 24%, transparent),
        transparent
      ),
      var(--title-night);
  }
  .boss-stage img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 100%;
    image-rendering: pixelated;
  }
  .boss-text {
    padding: 0.625rem 0.75rem 0.75rem;
  }
  /* The level sits on the stage, so the text below is two equal lines. */
  .boss-stage {
    position: relative;
  }
  .boss-level {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.1rem 0.5rem;
    border: 1px solid rgb(255 255 255 / 0.18);
    border-radius: 999px;
    background: rgb(7 5 29 / 0.75);
    color: rgb(255 255 255 / 0.88);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .entry-name {
    display: block;
    overflow: hidden;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry-meta {
    display: block;
    margin-top: 0.15rem;
    overflow: hidden;
    color: var(--muted-foreground);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The zone grid steps through 1 to 5 columns at the container's widths
     (each card at least about 15rem wide). Until it is opened it shows two
     full rows: 2 cards per column, so cards 2c+1 onwards hide and the button
     counts the hidden ones for the same column count. */
  .zones {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .zones:not(.open) > li:nth-child(n + 3),
  .more-count:not([data-columns="1"]) {
    display: none;
  }
  @media (min-width: 40rem) {
    .zones {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .zones:not(.open) > li:nth-child(n + 3) {
      display: list-item;
    }
    .zones:not(.open) > li:nth-child(n + 5) {
      display: none;
    }
    .more-count[data-columns="1"] {
      display: none;
    }
    .more-count[data-columns="2"] {
      display: inline;
    }
  }
  @media (min-width: 64rem) {
    .zones {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .zones:not(.open) > li:nth-child(n + 5) {
      display: list-item;
    }
    .zones:not(.open) > li:nth-child(n + 7) {
      display: none;
    }
    .more-count[data-columns="2"] {
      display: none;
    }
    .more-count[data-columns="3"] {
      display: inline;
    }
  }
  @media (min-width: 80rem) {
    .zones {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .zones:not(.open) > li:nth-child(n + 7) {
      display: list-item;
    }
    .zones:not(.open) > li:nth-child(n + 9) {
      display: none;
    }
    .more-count[data-columns="3"] {
      display: none;
    }
    .more-count[data-columns="4"] {
      display: inline;
    }
  }
  @media (min-width: 96rem) {
    .zones {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
    .zones:not(.open) > li:nth-child(n + 9) {
      display: list-item;
    }
    .zones:not(.open) > li:nth-child(n + 11) {
      display: none;
    }
    .more-count[data-columns="4"] {
      display: none;
    }
    .more-count[data-columns="5"] {
      display: inline;
    }
  }
  .zone-card {
    flex-direction: column;
    overflow: hidden;
  }
  .zone-card img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    background: var(--title-night);
  }
  .zone-copy {
    padding: 0.625rem 0.75rem 0.7rem;
  }
  .more-zones {
    margin-top: 0.75rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
  }
  .more-zones:hover {
    background: var(--muted);
  }
  .more-zones:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }

  .directory-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    color: var(--foreground);
    text-decoration: none;
  }
  .directory-link:hover {
    background: var(--muted);
  }
  .glyph {
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    flex: none;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--muted);
    color: var(--muted-foreground);
  }

  .group-title {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
    color: var(--brand-gold);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .mechanics-link {
    display: grid;
    gap: 0.1rem;
    padding: 0.4rem 0;
    text-decoration: none;
  }
  .mechanics-link:hover span:first-child {
    color: var(--brand-gold);
  }
  /* Professions list like mechanics, with each slot's icon from the game's
     professions window. Descriptions wrap rather than truncate. */
  .profession-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0;
    text-decoration: none;
  }
  .profession-link .entry-meta {
    white-space: normal;
  }
  .profession-link:hover .entry-name {
    color: var(--brand-gold);
  }
  .profession-icon {
    display: grid;
    flex: none;
    width: 3rem;
    height: 3rem;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--muted);
  }
  .profession-icon img {
    image-rendering: pixelated;
  }
</style>
