<!--
  The site bar: the compendium mark, the most visited destinations, and one
  Browse panel that names every overview page. Browse is a native disclosure, so
  the menu works without JavaScript. With JavaScript, Escape, an outside click,
  focus leaving the menu, or a navigation closes it.
-->
<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import EntityGlyph from "$lib/components/EntityGlyph.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import SteamIcon from "$lib/components/SteamIcon.svelte";
  import DiscordIcon from "$lib/components/DiscordIcon.svelte";
  import KofiIcon from "$lib/components/KofiIcon.svelte";
  import SearchButton from "$lib/components/search/SearchButton.svelte";
  import { DISCORD_URL, KOFI_URL, STEAM_GUIDE_URL } from "$lib/constants/links";
  import {
    BROWSE_GROUPS,
    PRIMARY_LINKS,
  } from "$lib/navigation/site-navigation";

  /** False on a page that shows its own search field, so a page has one search. */
  let { search = true }: { search?: boolean } = $props();

  let browse = $state<HTMLDetailsElement>();
  // On a phone the panel stacks its columns, and each column opens on its own.
  // Collapsing needs JavaScript; without it every column stays open.
  let hydrated = $state(false);
  let expanded = $state<string | null>(null);

  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    return path === href || path.startsWith(`${href}/`);
  }

  function groupIsCurrent(group: (typeof BROWSE_GROUPS)[number]): boolean {
    return (
      group.links.some((link) => isCurrent(link.href)) ||
      (group.more !== undefined && isCurrent(group.more.href))
    );
  }

  const browseIsCurrent = $derived(
    BROWSE_GROUPS.some(groupIsCurrent) &&
      !PRIMARY_LINKS.some((link) => isCurrent(link.href)),
  );

  function closeBrowse(): void {
    if (browse) browse.open = false;
  }

  function onToggle(): void {
    if (browse?.open) {
      expanded = BROWSE_GROUPS.find(groupIsCurrent)?.id ?? null;
    }
  }

  $effect(() => {
    hydrated = true;
    const menu = browse;
    if (!menu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !menu.contains(event.target)) {
        closeBrowse();
      }
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menu.open) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };
    // Focus that moves to no element, as when Safari clicks a link without
    // focusing it, leaves the menu open for the click; the pointer handler
    // closes it.
    const onFocusout = (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        !menu.contains(event.relatedTarget)
      ) {
        menu.open = false;
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    menu.addEventListener("keydown", onKeydown);
    menu.addEventListener("focusout", onFocusout);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      menu.removeEventListener("keydown", onKeydown);
      menu.removeEventListener("focusout", onFocusout);
    };
  });

  // The first load counts as a navigation too. It keeps a menu that a reader
  // opened before the page became interactive.
  afterNavigate((navigation) => {
    if (navigation.type !== "enter") closeBrowse();
  });
</script>

<header class="bar">
  <!-- The bar shares the container of the overview pages, so the brand lines
       up with their headings. -->
  <div class="bar-inner container mx-auto px-8">
    <a class="brand" href="/">
      <img src="/logo.webp" width="36" height="36" alt="" />
      <span class="brand-copy">
        <strong>Ancient Kingdoms</strong>
        <span>Compendium</span>
      </span>
    </a>

    <nav class="site-nav" aria-label="Site">
      <ul class="primary">
        {#each PRIMARY_LINKS as link (link.href)}
          <li class:wide-only={link.wideOnly}>
            <a
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              >{link.label}</a
            >
          </li>
        {/each}
      </ul>
      <details class="browse" bind:this={browse} ontoggle={onToggle}>
        <summary class:current={browseIsCurrent}>Browse</summary>
        <div class="panel" class:accordion={hydrated}>
          <div class="columns">
            {#each BROWSE_GROUPS as group (group.id)}
              <section
                class="group"
                class:expanded={expanded === group.id}
                aria-labelledby={`nav-${group.id}`}
              >
                <h2 id={`nav-${group.id}`}>
                  <button
                    type="button"
                    aria-expanded={expanded === group.id}
                    onclick={() =>
                      (expanded = expanded === group.id ? null : group.id)}
                    >{group.label}</button
                  >
                </h2>
                <ul>
                  {#each group.links as link (link.href)}
                    <li>
                      <a
                        href={link.href}
                        aria-current={isCurrent(link.href) ? "page" : undefined}
                      >
                        {#if link.icon}
                          <span class="glyph">
                            <EntityGlyph icon={link.icon} size={18} />
                          </span>
                        {/if}
                        <span class="copy">
                          <span class="label">{link.label}</span>
                          {#if link.description}
                            <span class="description">{link.description}</span>
                          {/if}
                        </span>
                      </a>
                    </li>
                  {/each}
                </ul>
                {#if group.more}
                  <a class="more" href={group.more.href}
                    >{group.more.label}<span aria-hidden="true">→</span></a
                  >
                {/if}
              </section>
            {/each}
          </div>
          <a
            class="panel-foot"
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <KofiIcon class="size-5" />
            <span>Support the Compendium on Ko-fi</span>
          </a>
        </div>
      </details>
    </nav>

    <div class="tools">
      {#if search}<span class="search-slot"><SearchButton /></span>{/if}
      <ThemeToggle />
      <a
        class="tool"
        href={STEAM_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Steam Guide"
        title="Steam Guide"
      >
        <SteamIcon class="size-5" />
      </a>
      <a
        class="tool"
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join Discord"
        title="Join Discord"
      >
        <DiscordIcon class="size-5" />
      </a>
      <span class="divider" aria-hidden="true"></span>
      <a
        class="kofi"
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Support the Compendium on Ko-fi"
      >
        <KofiIcon class="size-6" />
        <span>Support</span>
      </a>
    </div>
  </div>
</header>

<style>
  .bar {
    position: relative;
    z-index: 30;
    border-bottom: 1px solid var(--border);
    background: var(--background);
  }
  /* A faint gold line closes the bar, echoing the title art. */
  .bar::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in oklab, var(--brand-gold) 55%, transparent) 50%,
      transparent
    );
    pointer-events: none;
  }
  .bar-inner {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 1.25rem;
    min-height: 4rem;
  }

  .brand {
    display: inline-flex;
    flex: none;
    align-self: center;
    align-items: center;
    gap: 0.6rem;
    color: var(--foreground);
    text-decoration: none;
  }
  .brand img {
    width: 36px;
    height: 36px;
    flex: none;
  }
  .brand-copy {
    display: grid;
    gap: 0.2rem;
    line-height: 1;
  }
  .brand-copy strong {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .brand-copy span {
    color: var(--brand-gold);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .site-nav {
    display: flex;
    align-items: stretch;
  }
  .primary {
    display: flex;
    align-items: stretch;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .primary li {
    display: flex;
  }
  .primary a,
  summary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 100%;
    padding: 0 0.7rem;
    border-top: 2px solid transparent;
    border-bottom: 2px solid transparent;
    color: var(--muted-foreground);
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.15s;
  }
  .primary a:hover,
  summary:hover {
    color: var(--foreground);
  }
  .primary a[aria-current="page"],
  summary.current,
  details[open] > summary {
    color: var(--foreground);
    border-bottom-color: var(--brand-gold);
  }
  .browse {
    display: flex;
  }
  summary {
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: "";
    width: 0.38rem;
    height: 0.38rem;
    margin-top: -0.2rem;
    border-right: 1.5px solid currentcolor;
    border-bottom: 1.5px solid currentcolor;
    transform: rotate(45deg);
    opacity: 0.7;
  }
  details[open] > summary::after {
    margin-top: 0.15rem;
    transform: rotate(225deg);
  }
  summary:focus-visible,
  .bar a:focus-visible,
  .group button:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }

  /* One panel names every destination in labelled columns. It spans the bar's
     content width, so it never runs past the screen edge. Every entry is two
     lines: a name and one short line about what is behind it. */
  .panel {
    --panel-pad: 1rem;
    --entry-pad: 0.625rem;
    position: absolute;
    z-index: 1;
    top: calc(100% + 0.35rem);
    right: 2rem;
    left: 2rem;
    max-height: calc(100vh - 5.5rem);
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--popover);
    color: var(--popover-foreground);
    box-shadow: 0 16px 40px rgb(0 0 0 / 0.2);
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.25rem;
    padding: 1.25rem var(--panel-pad) 1rem;
  }
  .group h2 {
    margin: 0 0 0.5rem;
    padding: 0 var(--entry-pad) 0.6rem;
    border-bottom: 1px solid var(--border);
    color: var(--brand-gold);
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .group h2 button {
    all: unset;
    display: block;
    width: 100%;
    cursor: default;
  }
  .group ul {
    display: grid;
    gap: 0.125rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .group a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem var(--entry-pad);
    border-radius: calc(var(--radius) - 2px);
    color: var(--popover-foreground);
    text-decoration: none;
  }
  .group a:hover {
    background: var(--muted);
  }
  .group a:hover .label,
  .group a[aria-current="page"] .label {
    color: var(--brand-gold);
  }
  .glyph {
    display: grid;
    flex: none;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--muted);
    color: var(--muted-foreground);
  }
  .group a:hover .glyph,
  .group a[aria-current="page"] .glyph {
    border-color: color-mix(in oklab, var(--brand-gold) 60%, transparent);
    color: var(--brand-gold);
  }
  .copy {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
  }
  .label,
  .description {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
  }
  .description {
    color: var(--muted-foreground);
    font-size: 0.875rem;
    line-height: 1.3;
  }
  .group a.more {
    display: inline-flex;
    gap: 0.4rem;
    margin-top: 0.25rem;
    color: var(--brand-gold);
    font-size: 0.875rem;
    font-weight: 600;
  }
  .group a.more:hover {
    background: none;
    text-decoration: underline;
  }
  /* The panel ends with one quiet line for Ko-fi, its icon aligned with the
     entry glyphs above it. */
  .panel-foot {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem calc(var(--panel-pad) + var(--entry-pad));
    border-top: 1px solid var(--border);
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: 0.875rem;
    text-decoration: none;
  }
  .panel-foot :global(svg) {
    width: 2.25rem;
  }
  .panel-foot:hover {
    color: var(--foreground);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }
  .search-slot {
    display: flex;
    margin-right: 0.5rem;
  }
  .tool {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: calc(var(--radius) - 2px);
    color: var(--muted-foreground);
  }
  .tool:hover {
    background: var(--muted);
    color: var(--foreground);
  }
  .divider {
    width: 1px;
    height: 1.5rem;
    margin: 0 0.35rem;
    background: var(--border);
  }
  .kofi {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.25rem;
    padding: 0.35rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    color: var(--muted-foreground);
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
  }
  .kofi:hover {
    color: var(--foreground);
  }

  /* The bar sits in the page container, which narrows in steps (80rem,
     64rem, 48rem). As it narrows the bar gives up what no longer fits: below
     90rem the labels of search and Ko-fi, which leaves room for wider system
     fonts, and below 64rem the direct links, which the Browse panel also
     lists. The steps are in rem, like the container, so a larger default
     font collapses the bar sooner instead of pushing its tools off screen. */
  @media (max-width: 90rem) {
    .search-slot :global(button > :not(svg)) {
      display: none;
    }
    .search-slot :global(button) {
      width: 2.25rem;
      height: 2.25rem;
      justify-content: center;
      padding: 0;
    }
    .kofi span {
      display: none;
    }
  }
  /* Below 80rem the container is 64rem wide, too narrow for the links that
     only a wide bar shows. */
  @media (max-width: 80rem) {
    .primary .wide-only {
      display: none;
    }
  }
  @media (max-width: 70rem) {
    .columns {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 64rem) {
    .primary {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .bar-inner {
      gap: 0.5rem;
      padding: 0 0.75rem;
    }
    /* A phone keeps search, the theme switch, and Ko-fi; Steam and Discord
       stay in the footer of the home page. */
    .tool,
    .divider {
      display: none;
    }
    /* The panel stacks its columns as sections that open one at a time. */
    .panel {
      right: 0.5rem;
      left: 0.5rem;
    }
    .columns {
      grid-template-columns: 1fr;
      gap: 0;
      padding: 0.25rem 0.5rem;
    }
    .group {
      border-bottom: 1px solid var(--border);
    }
    .group:last-child {
      border-bottom: 0;
    }
    .group h2 {
      margin: 0;
      padding: 0;
      border: 0;
    }
    .group h2 button {
      padding: 0.75rem var(--entry-pad) 0.4rem;
    }
    .accordion .group h2 button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      min-height: 3rem;
      padding: 0 var(--entry-pad);
      cursor: pointer;
    }
    .accordion .group h2 button::after {
      content: "";
      width: 0.45rem;
      height: 0.45rem;
      margin-top: -0.25rem;
      border-right: 1.5px solid currentcolor;
      border-bottom: 1.5px solid currentcolor;
      transform: rotate(45deg);
    }
    .accordion .group.expanded h2 button::after {
      margin-top: 0.2rem;
      transform: rotate(225deg);
    }
    .group ul {
      padding-bottom: 0.5rem;
    }
    .accordion .group:not(.expanded) ul,
    .accordion .group:not(.expanded) .more {
      display: none;
    }
    .panel-foot {
      padding-inline: calc(0.5rem + var(--entry-pad));
    }
  }
</style>
