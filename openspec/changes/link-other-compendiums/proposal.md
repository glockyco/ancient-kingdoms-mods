## Why

The four game compendiums, Afallon, Ancient Kingdoms, Erenshor and The Bloodline, link each other only from their About pages, and Ancient Kingdoms has no About page. Its footer exists only on the home page, so its other pages give no way to the project, its support, the game's community or the other compendiums.

## What Changes

- A grid button directly left of the Ko-fi mug opens a panel that lists the four compendiums, marks this one and links About this Compendium. The logo stays the link home.
- Every page but the map ends with one footer. Its bands are This Site, Project, Game & Community and Other Compendiums, followed by the game version and the notices. Game & Community starts with Ancient Kingdoms on Steam and its Discord.
- A new `/about` page says what the compendium is, describes the game, says how the compendium is made and that it is unofficial, and links the other compendiums and the game's pages.
- The two home layouts lose their own footers, whose links move to the shared footer. Their introduction of the game and the compendium stays at the end of the home page.

## Capabilities

### New Capabilities

- `compendium-links`: the switcher, the shared footer and the About page.

### Modified Capabilities

None.

## Impact

`website/src/lib/components/site-header/`, a new `site-footer` component, `website/src/routes/+layout.svelte`, the two home layouts, a new `website/src/routes/about/` route, `website/src/lib/constants/` and the sitemap manifest script.
