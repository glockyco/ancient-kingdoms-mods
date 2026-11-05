<!--
  The footer of every page but the map. Each group of links is a band with its
  label beside it, and the other compendiums are equal cards with their logos,
  the structure every compendium's footer shares in its own style.
-->
<script lang="ts">
  import {
    OTHER_COMPENDIUMS,
    compendiumIconUrl,
  } from "$lib/constants/compendiums";
  import {
    AK_MONITOR_DISCORD_URL,
    DISCORD_URL,
    GITHUB_URL,
    KOFI_URL,
    STEAM_GUIDE_URL,
    STEAM_STORE_URL,
  } from "$lib/constants/links";
  import { COMPENDIUM_VERSION } from "$lib/constants/version";

  const siteLinks = [
    { label: "Map", href: "/map" },
    { label: "Items", href: "/items" },
    { label: "Monsters", href: "/monsters" },
    { label: "Crafting Recipes", href: "/recipes" },
    { label: "Classes", href: "/classes" },
    { label: "Zones", href: "/zones" },
    { label: "Professions", href: "/professions" },
    { label: "About", href: "/about" },
  ];
  const projectLinks = [
    { label: "Code on GitHub", href: GITHUB_URL },
    { label: "Support on Ko-fi", href: KOFI_URL },
  ];
  // Every compendium's footer starts this band with its game on Steam and the
  // game's official Discord.
  const communityLinks = [
    { label: "Ancient Kingdoms on Steam", href: STEAM_STORE_URL },
    { label: "Ancient Kingdoms Discord", href: DISCORD_URL },
    { label: "Steam Guide", href: STEAM_GUIDE_URL },
    { label: "Server Monitor by Thero", href: AK_MONITOR_DISCORD_URL },
  ];
</script>

<footer class="site-footer">
  <div class="footer-inner container mx-auto px-8">
    <h2>Ancient Kingdoms Compendium</h2>
    <section aria-labelledby="footer-site">
      <h3 id="footer-site">This Site</h3>
      <ul>
        {#each siteLinks as link (link.href)}
          <li><a href={link.href}>{link.label}</a></li>
        {/each}
      </ul>
    </section>
    <section aria-labelledby="footer-project">
      <h3 id="footer-project">Project</h3>
      <ul>
        {#each projectLinks as link (link.href)}
          <li><a href={link.href}>{link.label}</a></li>
        {/each}
      </ul>
    </section>
    <section aria-labelledby="footer-community">
      <h3 id="footer-community">Game &amp; Community</h3>
      <ul>
        {#each communityLinks as link (link.href)}
          <li><a href={link.href}>{link.label}</a></li>
        {/each}
      </ul>
    </section>
    <section class="others-band" aria-labelledby="footer-others">
      <h3 id="footer-others">Other Compendiums</h3>
      <ul class="others">
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
              <span>{compendium.name}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
    <div class="notes">
      <p>Updated for v{COMPENDIUM_VERSION}</p>
      <p>Unofficial fan project, not affiliated with Ancient Pixels.</p>
      <p>Ancient Kingdoms artwork © Ancient Pixels, used with permission.</p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    margin-top: 3rem;
    border-top: 1px solid var(--border);
    background: color-mix(in oklch, var(--background), var(--muted) 25%);
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }
  .footer-inner {
    padding-top: 2rem;
    padding-bottom: 2.25rem;
  }
  h2 {
    margin: 0 0 0.5rem;
    color: var(--foreground);
    font-size: 1.125rem;
    font-weight: 600;
  }
  section {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    align-items: baseline;
    gap: 0.5rem 1.25rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--border);
  }
  /* The label sits at the middle of the cards rather than on the baseline of
     their names. */
  .others-band {
    align-items: center;
  }
  h3 {
    margin: 0;
    color: var(--foreground);
    font-size: 0.9375rem;
    font-weight: 600;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem 1.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  ul a {
    display: inline-flex;
    align-items: center;
    min-height: 1.75rem;
    color: var(--foreground);
    text-decoration: none;
  }
  ul a:hover {
    color: var(--brand-gold);
    text-decoration: underline;
  }
  .others {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .others a {
    gap: 0.625rem;
    width: 100%;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    font-weight: 600;
    white-space: nowrap;
  }
  .others a:hover {
    border-color: color-mix(in oklab, var(--brand-gold) 60%, transparent);
    text-decoration: none;
  }
  .others img {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    object-fit: contain;
  }
  .notes {
    display: grid;
    gap: 0.25rem;
    padding-top: 1rem;
  }
  .notes p {
    margin: 0;
    text-wrap: pretty;
  }
  /* The container narrows in steps. Below 64rem the labels move above their
     links, and on a phone the cards become rows. */
  @media (max-width: 64rem) {
    section {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 640px) {
    .footer-inner {
      padding-inline: 1rem;
    }
    .others {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
