<!--
  Switches to another game compendium. The logo stays the link home, so
  switching has a control of its own. The panel is placed against the bar, like
  Browse, so it stays on the screen at every width. Escape, an outside click,
  or a navigation closes it.
-->
<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import {
    COMPENDIUMS,
    THIS_COMPENDIUM,
    compendiumIconUrl,
  } from "$lib/constants/compendiums";

  let open = $state(false);
  let root = $state<HTMLElement>();
  let toggle = $state<HTMLButtonElement>();

  afterNavigate(() => {
    open = false;
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && event.target instanceof Node && !root?.contains(event.target))
      open = false;
  }}
  onkeydown={(event) => {
    if (event.key !== "Escape" || !open) return;
    open = false;
    toggle?.focus();
  }}
/>

<div class="switcher" bind:this={root}>
  <button
    bind:this={toggle}
    type="button"
    class="toggle"
    aria-label="Switch compendium"
    title="Switch compendium"
    aria-expanded={open}
    aria-controls="compendium-switcher"
    onclick={() => (open = !open)}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  </button>
  <div id="compendium-switcher" class="panel" hidden={!open}>
    <p class="title">Game Compendiums</p>
    <ul>
      {#each COMPENDIUMS as compendium (compendium.icon)}
        <li>
          {#if compendium.icon === THIS_COMPENDIUM}
            <a href="/" aria-current="true">
              <img
                src={compendiumIconUrl(compendium)}
                alt=""
                width="128"
                height="128"
              />
              <span>{compendium.name}</span>
              <svg class="check" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </a>
          {:else}
            <a href={compendium.url}>
              <img
                src={compendiumIconUrl(compendium)}
                alt=""
                width="128"
                height="128"
              />
              <span>{compendium.name}</span>
            </a>
          {/if}
        </li>
      {/each}
    </ul>
    <a class="foot" href="/about">About this Compendium</a>
  </div>
</div>

<style>
  .switcher {
    display: flex;
  }
  .toggle {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: calc(var(--radius) - 2px);
    color: var(--muted-foreground);
  }
  .toggle:hover,
  .toggle[aria-expanded="true"] {
    background: var(--muted);
    color: var(--foreground);
  }
  .toggle svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentcolor;
    stroke-width: 1.7;
  }
  .panel {
    position: absolute;
    z-index: 1;
    top: calc(100% + 0.35rem);
    right: 2rem;
    width: min(19rem, calc(100% - 4rem));
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--popover);
    color: var(--popover-foreground);
    box-shadow: 0 16px 40px rgb(0 0 0 / 0.2);
  }
  .panel[hidden] {
    display: none;
  }
  .title {
    margin: 0;
    padding: 1rem 1.625rem 0.5rem;
    color: var(--brand-gold);
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  ul {
    display: grid;
    gap: 0.125rem;
    margin: 0;
    padding: 0 1rem 0.75rem;
    list-style: none;
  }
  ul a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.75rem;
    padding: 0 0.625rem;
    border-radius: calc(var(--radius) - 2px);
    color: var(--popover-foreground);
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }
  ul a:hover {
    background: var(--muted);
    color: var(--brand-gold);
  }
  ul a[aria-current="true"] {
    background: var(--muted);
  }
  img {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    object-fit: contain;
  }
  .check {
    width: 1rem;
    height: 1rem;
    margin-left: auto;
    fill: none;
    stroke: var(--brand-gold);
    stroke-width: 2.5;
  }
  /* The panel ends with one quiet line, as Browse does. */
  .foot {
    display: block;
    padding: 0.625rem 1.625rem;
    border-top: 1px solid var(--border);
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: 0.875rem;
    text-decoration: none;
  }
  .foot:hover {
    color: var(--foreground);
  }
  @media (max-width: 640px) {
    .panel {
      right: 0.5rem;
      width: min(19rem, calc(100% - 1rem));
    }
  }
</style>
