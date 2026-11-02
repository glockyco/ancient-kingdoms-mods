<script lang="ts">
  import type { Snippet } from "svelte";
  import Download from "@lucide/svelte/icons/download";
  import type { InstallGuide } from "./install-steps";
  import Cta from "./Cta.svelte";
  import InstallText from "./InstallText.svelte";
  import { noteSystems, type SystemId } from "./install-systems";

  let {
    guide,
    system,
    melonLoaderZip,
    after,
  }: {
    guide: InstallGuide;
    system: SystemId;
    melonLoaderZip: string;
    /** Content under a step, by its index. */
    after?: Snippet<[number]>;
  } = $props();
</script>

<ol class="space-y-8">
  {#each guide.steps as step, i (step.title)}
    <li class="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4">
      <span
        class="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
        >{i + 1}</span
      >
      <div class="space-y-2">
        <h2 class="pt-1 text-lg leading-6 font-semibold">{step.title}</h2>
        {#each step.blocks as block, b (b)}
          {#if block.kind === "text"}
            <p class="text-pretty text-muted-foreground">
              <InstallText text={block.text} />
            </p>
          {:else}
            {#each block.notes as note (note.label)}
              {@const systems = noteSystems(note.label)}
              <!-- The chosen system's notes read as plain text and other systems' are left out. A note for a situation, such as an older install, keeps its label. -->
              {#if systems.length === 0}
                <p class="text-pretty text-muted-foreground">
                  <span class="font-medium text-foreground">{note.label}:</span>
                  <InstallText text={note.text} />
                </p>
              {:else if systems.includes(system)}
                <p class="text-pretty text-muted-foreground">
                  <InstallText
                    text={note.text.charAt(0).toUpperCase() +
                      note.text.slice(1)}
                  />
                </p>
              {/if}
            {/each}
          {/if}
        {/each}
        {#if i === 0}
          <!-- Both outlined, because the step needs both, and the mods page's gold button is the mod's own download. -->
          <div class="flex flex-wrap gap-3 pt-2">
            <Cta
              href={melonLoaderZip}
              variant="secondary"
              class="w-full sm:w-auto"
            >
              <Download class="size-5" aria-hidden="true" />MelonLoader
              (40&nbsp;MB)
            </Cta>
            <Cta
              href="/mods/PocketCompendium.dll"
              variant="secondary"
              download
              class="w-full sm:w-auto"
            >
              <Download class="size-5" aria-hidden="true" />Pocket Compendium
            </Cta>
          </div>
        {/if}
        {@render after?.(i)}
      </div>
    </li>
  {/each}
</ol>
