<script lang="ts">
  import entrance from "$lib/assets/home/old-valorath-entrance.webp";
</script>

<!-- Remove together with old_valorath in redactions.toml [zones.exclude_unreleased]
     once the developers allow the zone to be published. -->
<aside
  aria-labelledby="old-valorath-notice"
  class="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-card shadow-sm md:flex-row"
>
  <img
    src={entrance}
    width="800"
    height="450"
    alt="A scribe sits on the steps with an empty book while other adventurers walk into Old Valorath."
    class="aspect-video w-full shrink-0 object-cover md:aspect-auto md:w-96"
    loading="lazy"
  />
  <div class="flex flex-col justify-center gap-2 p-5 sm:p-6">
    <h2 id="old-valorath-notice" class="text-lg font-semibold tracking-tight">
      Why Old Valorath is missing
    </h2>
    <p class="text-muted-foreground">
      <a
        href="https://store.steampowered.com/news/app/2241380/view/1847920302235005"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 dark:text-blue-400 hover:underline">Old Valorath</a
      >
      is out, but the developers asked to keep it off the compendium for the next
      few weeks so players can explore it on their own first.
    </p>
    <p class="text-muted-foreground">
      Sorry if you came here looking for it. It's a bummer to leave a gap in the
      site, and the new pages will go up as soon as the devs are ready for them
      to be shared.
    </p>
  </div>
</aside>
