<!--
  Switches the home page between the title-screen layout and the classic one.
  The choice lives in localStorage under HOME_LAYOUT_KEY; app.html reads it
  before the first paint and sets the `home-classic` class on <html>, which the
  home page's styles use to show one layout, so neither layout flashes.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import LayoutList from "@lucide/svelte/icons/layout-list";
  import Castle from "@lucide/svelte/icons/castle";

  const HOME_LAYOUT_KEY = "home-layout";
  const CLASSIC_CLASS = "home-classic";

  let classic = $state(false);

  // The server cannot know the stored choice; app.html has already applied it.
  onMount(() => {
    classic = document.documentElement.classList.contains(CLASSIC_CLASS);
  });

  function toggle(): void {
    classic = !classic;
    document.documentElement.classList.toggle(CLASSIC_CLASS, classic);
    localStorage.setItem(HOME_LAYOUT_KEY, classic ? "classic" : "title");
  }

  const label = $derived(
    classic
      ? "Switch to the title-screen layout"
      : "Switch to the classic layout",
  );
</script>

<Button
  variant="ghost"
  size="icon"
  onclick={toggle}
  class="js-only cursor-pointer"
  aria-label={label}
  title={label}
>
  {#if classic}
    <Castle class="size-5" />
  {:else}
    <LayoutList class="size-5" />
  {/if}
</Button>
