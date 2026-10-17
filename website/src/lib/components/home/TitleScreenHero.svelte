<!--
  The home page opens on the game's title screen: the main-menu artwork at its
  native pixel grid, the game title where the game places it, and the site's
  search resting on the altar below the adventurers. The band is dark in both
  themes because the artwork is; the `dark` class gives its controls the dark
  theme's tokens.
-->
<script lang="ts">
  import GameVersionBanner from "$lib/components/GameVersionBanner.svelte";
  import HomeSearch from "$lib/components/HomeSearch.svelte";
  import type { GameVersionResult } from "$lib/steam-news-parser";
  import MapIcon from "@lucide/svelte/icons/map";
  import Gem from "@lucide/svelte/icons/gem";
  import Pause from "@lucide/svelte/icons/pause";
  import Play from "@lucide/svelte/icons/play";
  import titleScreenAnimated from "$lib/assets/home/title-screen-animated.webp";
  import titleScreenStill from "$lib/assets/home/title-screen.webp";
  import gameTitle from "$lib/assets/home/title.png";

  let { live, checkedAt }: { live: GameVersionResult; checkedAt: string } =
    $props();

  const MOTION_KEY = "title-screen-motion";

  // The torches and the dragon's fire loop like the game's title screen. A
  // reader's reduced-motion setting picks the still frame until the reader
  // chooses otherwise with the button, which also pauses the loop for anyone.
  let choice = $state<"play" | "pause" | null>(null);
  let prefersReducedMotion = $state(false);

  const playing = $derived(
    choice === "play" || (choice === null && !prefersReducedMotion),
  );

  $effect(() => {
    const stored = localStorage.getItem(MOTION_KEY);
    if (stored === "play" || stored === "pause") choice = stored;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion = query.matches;
    const onChange = () => (prefersReducedMotion = query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  });

  function toggleMotion(): void {
    choice = playing ? "pause" : "play";
    localStorage.setItem(MOTION_KEY, choice);
  }
</script>

<section class="hero dark" aria-labelledby="home-title">
  <div class="frame">
    <div class="stage">
      <picture>
        {#if choice === null}
          <source
            srcset={titleScreenStill}
            media="(prefers-reduced-motion: reduce)"
          />
        {/if}
        <img
          class="art"
          src={choice === "pause" ? titleScreenStill : titleScreenAnimated}
          width="960"
          height="540"
          alt=""
          fetchpriority="high"
        />
      </picture>
      <h1 id="home-title" class="title">
        <img src={gameTitle} width="463" height="119" alt="Ancient Kingdoms" />
        <span class="sr-only">Compendium</span>
      </h1>
    </div>
  </div>

  <div class="shelf">
    <div class="search"><HomeSearch /></div>
    <div class="actions">
      <a class="action primary" href="/map">
        <MapIcon class="size-[1.15rem]" aria-hidden="true" />
        <span class="long">Open the map</span>
        <span class="short">Map</span>
      </a>
      <a class="action secondary" href="/items">
        <Gem class="size-[1.15rem]" aria-hidden="true" />
        <span class="long">Browse Items</span>
        <span class="short">Items</span>
      </a>
    </div>
    <GameVersionBanner {live} {checkedAt} />
    <button
      type="button"
      class="motion js-only"
      onclick={toggleMotion}
      aria-label={playing ? "Pause the animation" : "Play the animation"}
    >
      {#if playing}
        <Pause class="size-4" aria-hidden="true" />
        <span>Pause</span>
      {:else}
        <Play class="size-4" aria-hidden="true" />
        <span>Play</span>
      {/if}
    </button>
  </div>
</section>

<style>
  .hero {
    /* Scale of the 960×540 artwork. Steps of a quarter keep whole device
       pixels on 2× screens at 1.5 and 2; the height conditions keep the search
       above the fold. */
    --s: 1;
    position: relative;
    overflow-x: clip;
    background: var(--title-night);
    color: var(--foreground);
  }
  @media (min-width: 1200px) and (min-height: 920px) {
    .hero {
      --s: 1.25;
    }
  }
  @media (min-width: 1440px) and (min-height: 1060px) {
    .hero {
      --s: 1.5;
    }
  }
  @media (min-width: 1920px) and (min-height: 1330px) {
    .hero {
      --s: 2;
    }
  }

  .frame {
    position: relative;
    height: calc(540px * var(--s));
  }
  .stage {
    position: absolute;
    top: 0;
    left: 50%;
    width: calc(960px * var(--s));
    height: 100%;
    /* The painting is not symmetric: its arch and altar centre on artwork
       column 492, not 480. Shifting it left centres the scene under the
       title and the search field. */
    transform: translateX(calc(-50% - 12px * var(--s)));
  }
  .art {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .title {
    position: absolute;
    top: calc(8px * var(--s));
    left: calc(50% + 12px * var(--s));
    width: calc(463px * var(--s));
    margin: 0;
    transform: translateX(-50%);
  }
  .title img {
    display: block;
    width: 100%;
    height: auto;
    image-rendering: pixelated;
  }

  /* The search field rests on the altar block: centred on artwork row 508,
     between the adventurers' feet (row 455) and the block's front edge
     (row 528). The shelf paints above the artwork it overlaps. */
  .shelf {
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    gap: 1rem;
    margin-top: calc(-32px * var(--s) - 1.625rem);
    padding: 0 1rem 2rem;
  }
  .search {
    width: 100%;
  }
  .search :global(button) {
    max-width: none;
    height: 3.25rem;
    border-color: color-mix(in oklab, var(--brand-gold) 55%, transparent);
    background: color-mix(in oklab, var(--title-night) 88%, black);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
  }
  .search :global(button span) {
    font-size: 1rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
  .action {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 2.75rem;
    padding: 0 1.15rem;
    border-radius: calc(var(--radius) - 2px);
    font-size: 0.9375rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }
  .action .short {
    display: none;
  }
  .action.primary {
    background: var(--brand-gold-fill);
    color: var(--brand-gold-fill-foreground);
  }
  .action.primary:hover {
    background: color-mix(in oklab, var(--brand-gold-fill) 88%, white);
  }
  .action.secondary {
    border: 1px solid color-mix(in oklab, var(--brand-gold) 60%, transparent);
    background: color-mix(in oklab, var(--title-night) 70%, transparent);
    color: var(--brand-gold);
  }
  .action.secondary:hover {
    border-color: var(--brand-gold);
  }
  .action:focus-visible,
  .motion:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }

  /* The motion switch sits on the artwork, at its right edge just above the
     search field, where it costs the shelf no row of its own. */
  .motion {
    position: absolute;
    top: -3.25rem;
    right: 1rem;
    display: inline-flex;
    height: 2.5rem;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem;
    border: 1px solid rgb(255 255 255 / 0.3);
    border-radius: 999px;
    background: rgb(7 5 29 / 0.8);
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.45);
    color: rgb(255 255 255 / 0.92);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  .motion:hover {
    border-color: rgb(255 255 255 / 0.6);
    color: white;
  }

  /* From tablet width the motion switch moves to the artwork's lower right
     corner, where a reader looks for a media control. */
  @media (min-width: 640px) {
    /* The field matches the width of the actions below it, so the shelf reads
       as one column at every scale. Centred on the altar's top surface
       (artwork rows 488 to 524), it sits between the candle groups from a
       scale of 1.25 up. */
    .search {
      width: min(24rem, 100%);
    }
    .shelf {
      margin-top: calc(-52px * var(--s));
      gap: 1.25rem;
    }
    .search :global(button) {
      height: 3.25rem;
    }
    .motion {
      top: calc(18px * var(--s) - 1.25rem);
      right: max(1rem, calc(50% - 480px * var(--s) + 1.25rem));
    }
  }

  /* On a phone the title spans the screen, and the two destinations share
     one row under shorter names. */
  @media (max-width: 520px) {
    .title {
      top: 0.9rem;
      width: calc(100vw - 2rem);
    }
    .actions {
      display: grid;
      width: 100%;
      grid-template-columns: 1fr 1fr;
    }
    .action {
      justify-content: center;
      padding: 0 0.75rem;
    }
    .action .long {
      display: none;
    }
    .action .short {
      display: inline;
    }
  }
</style>
