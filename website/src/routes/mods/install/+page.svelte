<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import installText from "../../../../../mods/INSTALL.md?raw";
  import { parseInstallGuide } from "$lib/mods/install-steps";
  import InstallSteps from "$lib/mods/InstallSteps.svelte";
  import InstallClosing from "$lib/mods/InstallClosing.svelte";
  import SystemSwitch from "$lib/mods/SystemSwitch.svelte";
  import { detectSystem, type SystemId } from "$lib/mods/install-systems";

  // Too large for the site's own files, so the download comes straight from the GitHub release.
  const MELONLOADER_ZIP =
    "https://github.com/glockyco/ancient-kingdoms-mods/releases/download/melonloader-0.7.3-unity6000.6/AncientKingdoms-MelonLoader-Unity6000.6.zip";

  // mods/INSTALL.md holds the steps, so this page and the MelonLoader zip's README.txt agree.
  const guide = parseInstallGuide(installText);
  // The page is prerendered for Windows and switches to the reader's system once it runs.
  let system = $state<SystemId>("windows");
  onMount(() => (system = detectSystem(page.url)));
</script>

<Seo
  title="How to Install Pocket Compendium - Ancient Kingdoms Mod"
  description="How to install MelonLoader and Pocket Compendium for Ancient Kingdoms on Windows, on a Mac with CrossOver, and on Steam Deck or Linux."
  path="/mods/install"
/>

<div class="container mx-auto max-w-2xl px-6 py-8 sm:px-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mods", href: "/mods" },
      { label: "Install" },
    ]}
  />

  <header class="mt-6 space-y-3">
    <h1 class="text-3xl font-bold sm:text-4xl">How to install</h1>
    <p class="text-lg text-pretty text-muted-foreground">
      Choose your system to see its steps.
    </p>
  </header>

  <div class="mt-8 space-y-10">
    <SystemSwitch bind:value={system} />
    <InstallSteps {guide} {system} melonLoaderZip={MELONLOADER_ZIP}>
      {#snippet after(i)}
        {#if i === guide.steps.length - 1}
          <img
            src="/mod-pictures/settings-window.webp"
            alt="Pocket Compendium's settings window on its Boss list page, with the list's style, direction, tiers and levels."
            width="786"
            height="565"
            loading="lazy"
            class="mt-4 w-full rounded-lg ring-1 ring-border"
          />
        {/if}
      {/snippet}
    </InstallSteps>
    <!-- Indented by the step number's column, so it lines up with the step text. -->
    <div class="pl-12">
      <InstallClosing closing={guide.closing} />
    </div>
  </div>
</div>
