---
name: Ancient Kingdoms Compendium
description: A dense, neutral reference system for factual game data and mechanics.
colors:
  primary: "oklch(0.208 0.042 265.755)"
  primary-foreground: "oklch(0.984 0.003 247.858)"
  canvas: "oklch(1 0 0)"
  ink: "oklch(0.129 0.042 264.695)"
  muted-surface: "oklch(0.968 0.007 247.896)"
  muted-ink: "oklch(0.46 0.046 257.417)"
  rule: "oklch(0.929 0.013 255.508)"
  focus: "oklch(0.704 0.04 256.788)"
  destructive: "oklch(0.577 0.245 27.325)"
  achievement-amber: "#f59e0b"
  reference-link: "#2563eb"
  legendary: "oklch(0.58 0.15 55)"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
    typography: "{typography.body}"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.label}"
---

# Design System: Ancient Kingdoms Compendium

## Overview

**Creative North Star: "The Field Guide Index"**

The compendium is a neutral, compact reference surface. It keeps the interface quiet so exact game facts, relationships, and exported art remain easy to scan. Dense typography, fine rules, restrained color, and small controls make the site feel like a maintained field guide rather than a promotional game site.

The achievements atlas is one expression of this system: a plain canvas, square Steam art, category rules, a narrow index, and sparse amber markers organize 38 unlock conditions without turning them into a generic card wall. Its split hero and category composition are page-specific evidence, not templates for every route.

**Key Characteristics:**

- Neutral light and dark canvases with semantic foreground, surface, rule, and focus roles.
- Dense system-sans reference typography with clear weight and size changes.
- Fine borders and tonal surfaces provide most structure.
- Exported game art stays square, legible, and subordinate to factual text.
- Accent color is sparse and functional; links remain conventionally blue.

## Colors

Near-white and deep blue-black neutrals carry the interface. Saturated colors identify state, category, quality, or action rather than decorating empty space. Dark mode replaces the semantic canvas, ink, surface, border, and focus values at the source-token level; components keep their role assignments.

### Primary

- **Deep Slate:** The default filled-control and strong-emphasis role. Its pale inverse is reserved for content placed on that fill.
- **Reference Blue:** Related entities and compendium-guide actions use the established blue link color, with underlines on hover rather than persistent decoration.

### Secondary

- **Achievement Amber:** Small atlas markers and restrained category feedback use amber. It is evidence from the achievements surface, not the default accent for unrelated pages.

### Tertiary

- **Legendary Ochre:** Item-quality semantics and the achievements item category may use the existing legendary hue. Do not detach it from those meanings.
- **Destructive Red:** Errors, destructive controls, and combat-category semantics use the destructive role.

### Neutral

- **Paper Canvas:** The default page, field, card, and sticky-toolbar ground.
- **Blue-Black Ink:** Primary text and high-emphasis icon color.
- **Cool Muted Surface:** Quiet grouping, hover feedback, and secondary controls.
- **Muted Ink:** Supporting copy, metadata, placeholders, breadcrumbs, and counts.
- **Fine Rule:** Borders and dividers separate dense content without producing heavy boxes.
- **Focus Gray:** Keyboard focus rings and focus-border changes.

### Named Rules

**The Semantic Color Rule.** Use saturated color only when it communicates a link, state, category, item quality, or interaction.

**The Theme Role Rule.** Components refer to semantic roles, never to a light-mode literal that would fail on the dark canvas.

## Typography

**Body Font:** the Tailwind system sans stack, with the browser and platform UI fonts as fallbacks.

**Character:** Typography is compact, factual, and unembellished. Hierarchy comes from weight, scale, line height, and limited negative tracking rather than a decorative face.

### Hierarchy

- **Page heading** (700, `2.25rem` to `3.75rem`, line-height approximately 1): Used selectively for route-level introductions. The achievements heading tightens tracking to keep a long factual title cohesive; this responsive scale is page evidence, not a universal display token.
- **Headline** (600, `1.5rem`, line-height 1.25): Section titles and major content divisions.
- **Title** (600, `1rem`, line-height 1.5): Entry names, compact card titles, and local headings.
- **Body** (400, `0.875rem`, line-height 1.5): Dense descriptions, table content, navigation, and controls. Introductory copy may rise to `1rem` or `1.125rem` with a `1.75rem` line height.
- **Label** (500, `0.75rem`, line-height 1.333): Counts, statuses, compact metadata, and tabular-number readouts.

### Named Rules

**The Scan Before Flourish Rule.** Use weight and spacing to expose the information hierarchy. Do not introduce decorative typography that slows lookup.

**The Numeric Alignment Rule.** Counts and comparable values use tabular figures.

## Layout

Pages use a centered content container and responsive horizontal padding. The achievements atlas demonstrates the broad reference-page rhythm: `20px` page gutters expand to `32px`, the content stops at `72rem`, and large sections use `40px` to `80px` of vertical separation. Repeated internal gaps come from the `4px` base rhythm recorded in the spacing scale.

Dense content changes structure rather than merely shrinking. The achievements route stacks its header and category navigation on narrow screens, changes the catalog to two columns at `48rem`, and introduces a `12rem` sticky category rail with a `48px` gutter at `64rem`. Sticky search controls keep their opaque semantic background and fine lower rule. Main content columns always use `min-width: 0` so long names and descriptions wrap instead of expanding the grid.

**The Fact Density Rule.** Keep related labels, values, and actions close; use larger gaps only between semantic groups.

**The Static-First Rule.** Responsive and content layouts remain complete in static HTML. JavaScript-only search and loading affordances are additive.

## Elevation & Depth

The website is flat by default. Borders, muted fills, opacity, and sticky-layer backdrop blur establish separation. Shared cards use only a small ambient shadow; achievement artwork uses a soft low shadow so game art remains distinct from the canvas. Large decorative drop shadows are not part of the system.

### Shadow Vocabulary

- **Control hairline** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Low contrast depth on buttons and fields.
- **Card ambient** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Shared cards only.
- **Artwork lift** (`0 0.35rem 1rem color-mix(in oklab, var(--foreground) 10%, transparent)`): Small square game-art frames.

### Named Rules

**The Flat Reference Rule.** Use rules and tonal contrast first. Add a shadow only when a control, card, or image needs separation from its immediate ground.

## Shapes

Controls use gently rounded corners built from the shared `10px` base radius: compact controls resolve to `8px`, cards to `14px`, and badges to pills. Game artwork remains square in proportion with lightly softened corners and clipped edges. Category markers may use true circles, but content surfaces do not become pill-shaped containers.

**The Square Artifact Rule.** Preserve exported game and Steam art at a square aspect ratio without stretching or ornamental masks.

## Components

### Buttons

- **Shape:** Compact rounded rectangle (`8px`) with medium-weight `14px` text and a `36px` default height.
- **Primary:** Deep slate fill with pale inverse text and `16px` horizontal padding.
- **Hover / Focus:** Hover changes the current semantic fill by a small amount. Keyboard focus uses a visible three-pixel translucent ring plus the semantic focus border.
- **Outline / Ghost:** Outline controls use the canvas and fine rule; ghost controls add a muted tonal fill only on interaction.
- **Icon controls:** Use a square hit area from `32px` to `40px`; the icon is normally `16px`.

### Chips

- **Style:** Badges use pill geometry, `12px` medium text, compact padding, and either semantic fill or a fine outline.
- **State:** Saturated variants carry a real semantic state. Neutral grouping and filters use muted or outlined variants.

### Cards / Containers

- **Corner Style:** Gently rounded (`14px`) for the shared card primitive.
- **Background:** Semantic card canvas and card foreground.
- **Shadow Strategy:** Card ambient only; dense indexes may omit cards entirely and use rules.
- **Border:** A one-pixel fine rule.
- **Internal Padding:** `16px` around compact card content, with `16px` internal gaps.

### Inputs / Fields

- **Style:** Semantic canvas, one-pixel input rule, `8px` corners, and compact horizontal padding.
- **Focus:** The rule shifts to the focus role and gains a three-pixel translucent ring.
- **Error / Disabled:** Invalid fields use destructive border and ring roles. Disabled fields reduce opacity and keep a non-interactive cursor.

### Navigation

Breadcrumbs use muted `14px` text, slash separators at reduced opacity, and a medium-weight current location. Local section navigation stays compact and text-led. Hover uses either foreground contrast or a faint semantic surface; keyboard focus always remains visible. Sticky rails appear only when the viewport can preserve readable main content.

### Achievement Atlas Entry

The signature entry is a two-column unit with a fixed `64px` square artwork frame and flexible text. Name and hidden status share the first line; a compact description follows; related guides use blue text with an external-direction arrow. Entries sit on fine lower rules rather than individual cards. A fragment target receives a faint category-tinted background and a stronger rule, so deep links remain easy to locate.

## Do's and Don'ts

### Do:

- **Do** use semantic colors so light and dark themes preserve the same hierarchy.
- **Do** keep exported artwork square, uncropped beyond `object-fit: cover`, and paired with factual text.
- **Do** use fine rules, muted text, tabular counts, and compact gaps to make long reference lists scannable.
- **Do** preserve conventional blue links for related compendium destinations.
- **Do** let dense indexes use rows and dividers instead of forcing every entity into a card.

### Don't:

- **Don't** use amber, quality colors, or chart colors as general decoration outside their evidenced meanings.
- **Don't** add heavy shadows, glass panels, gradients, or ornamental frames to ordinary reference content.
- **Don't** stretch square game art or use it as low-contrast background decoration.
- **Don't** promote the achievements split hero, trophy field, or oversized system-sans heading into a mandatory site-wide template.
- **Don't** hide core facts behind JavaScript-only controls or interactions.
