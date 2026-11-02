<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import {
    OTHER_COMPENDIUMS,
    compendiumIconUrl,
  } from "$lib/constants/compendiums";
  import {
    DISCORD_URL,
    GITHUB_URL,
    KOFI_URL,
    STEAM_GUIDE_URL,
    STEAM_STORE_URL,
  } from "$lib/constants/links";
</script>

<Seo
  title="About - Ancient Kingdoms"
  description="What the Ancient Kingdoms Compendium is and how it is made from the game's files."
  path="/about"
/>

<div class="container mx-auto max-w-5xl p-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

  <header class="page-heading">
    <h1 class="text-3xl font-bold">About Ancient Kingdoms Compendium</h1>
    <p class="lead">
      The Ancient Kingdoms Compendium is a fan-made wiki, world map and game
      database, generated from the game's files.
    </p>
  </header>

  <div class="about-layout">
    <div class="sections">
      <section aria-labelledby="about-game">
        <h2 id="about-game">About Ancient Kingdoms</h2>
        <p>
          Ancient Kingdoms is a pixel-art RPG inspired by classic MMORPGs. You
          explore dungeons, fight bosses and complete quests, alone or in online
          co-op. Ancient Pixels develops and publishes the game. It has been in
          Steam Early Access since January 15, 2025.
        </p>
        <p><a href={STEAM_STORE_URL}>Play Ancient Kingdoms on Steam</a></p>
      </section>
      <section aria-labelledby="how-made">
        <h2 id="how-made">How the Compendium Is Made</h2>
        <p>
          The reference pages and map are built from data read from the game.
          The mechanics pages also use the game's server scripts.
        </p>
        <p><a href={GITHUB_URL}>Code on GitHub</a></p>
      </section>
      <section aria-labelledby="fan-project">
        <h2 id="fan-project">Unofficial Fan Project</h2>
        <p>
          This compendium is an unofficial fan project. It is not affiliated
          with Ancient Pixels. Ancient Kingdoms and its names, artwork and
          assets belong to their owners.
        </p>
        <p>Ancient Kingdoms artwork © Ancient Pixels, used with permission.</p>
      </section>
      <section aria-labelledby="more-compendiums">
        <h2 id="more-compendiums">More Compendiums</h2>
        <ul class="compendiums">
          {#each OTHER_COMPENDIUMS as compendium (compendium.icon)}
            <li>
              <a href={compendium.url}>
                <img
                  src={compendiumIconUrl(compendium)}
                  alt=""
                  width="128"
                  height="128"
                  loading="lazy"
                />
                {compendium.name}
              </a>
            </li>
          {/each}
        </ul>
      </section>
    </div>
    <aside class="panel" aria-labelledby="more-links">
      <h2 id="more-links">More Links</h2>
      <ul>
        <li><a href={STEAM_STORE_URL}>Ancient Kingdoms on Steam</a></li>
        <li><a href={STEAM_GUIDE_URL}>Compendium Guide on Steam</a></li>
        <li><a href={DISCORD_URL}>Ancient Kingdoms Discord</a></li>
        <li><a href={KOFI_URL}>Support on Ko-fi</a></li>
      </ul>
    </aside>
  </div>
</div>

<style>
  .page-heading {
    display: grid;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .lead {
    max-width: 52ch;
    color: var(--muted-foreground);
    font-size: 1.25rem;
    line-height: 1.6;
    text-wrap: pretty;
  }
  /* The text at a reading measure with the links beside it, as on the other
     compendiums' About pages. */
  .about-layout {
    display: grid;
    grid-template-columns: minmax(0, 46rem) 18.5rem;
    justify-content: space-between;
    align-items: start;
    gap: 3rem;
    margin-top: 3rem;
  }
  .sections {
    display: grid;
    gap: 2.5rem;
  }
  section {
    display: grid;
    gap: 1rem;
  }
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }
  p {
    line-height: 1.75;
    text-wrap: pretty;
  }
  a {
    color: var(--brand-gold);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* Each other compendium as an equal card, three in a row with the logo
     above the name, and full-width rows on phones. */
  .compendiums {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .compendiums a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    color: var(--foreground);
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    transition: border-color 0.15s;
  }
  .compendiums a:hover {
    border-color: color-mix(in oklab, var(--brand-gold) 60%, transparent);
  }
  .compendiums img {
    width: 3.5rem;
    height: 3.5rem;
    object-fit: contain;
  }
  .panel {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
  }
  .panel ul {
    display: grid;
    gap: 0.75rem;
  }
  @media (max-width: 1023px) {
    .about-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 639px) {
    .compendiums {
      grid-template-columns: minmax(0, 1fr);
    }
    .compendiums a {
      flex-direction: row;
      gap: 1rem;
      padding: 1rem;
      text-align: start;
    }
  }
</style>
