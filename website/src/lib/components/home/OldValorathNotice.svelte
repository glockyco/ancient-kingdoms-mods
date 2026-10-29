<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import entrance from "$lib/assets/home/old-valorath-entrance.webp";
</script>

<!-- Remove together with old_valorath in redactions.toml [zones.exclude_unreleased]
     once the developers allow the zone to be published. -->
<Dialog.Root>
  <DialogPrimitive.Trigger
    class="cursor-pointer text-sm text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 transition-colors hover:text-foreground hover:decoration-foreground"
  >
    Why Old Valorath is missing from the Compendium
  </DialogPrimitive.Trigger>

  <Dialog.Content
    class="bg-card gap-4 p-5 sm:max-w-xl sm:p-6"
    onOpenAutoFocus={(event) => {
      event.preventDefault();
      (event.currentTarget as HTMLElement | null)?.focus();
    }}
  >
    <Dialog.Header>
      <Dialog.Title class="text-xl font-semibold tracking-tight">
        Why Old Valorath is missing
      </Dialog.Title>
    </Dialog.Header>
    <img
      src={entrance}
      width="800"
      height="450"
      alt="A scribe sits on the steps with an empty book while other adventurers walk into Old Valorath."
      class="aspect-video w-full rounded-md border object-cover"
      style="image-rendering: pixelated"
    />
    <div class="space-y-3 text-muted-foreground">
      <p>
        <a
          href="https://store.steampowered.com/news/app/2241380/view/1847920302235005"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Old Valorath</a
        >
        is out, but the developers asked to keep it off the Compendium for the next
        few weeks so players can explore it on their own first.
      </p>
      <p>
        Sorry if you came here looking for it. It's a bummer to leave a gap in
        the site, and the new pages will go up as soon as the devs are ready for
        them to be shared.
      </p>
    </div>
  </Dialog.Content>
</Dialog.Root>
