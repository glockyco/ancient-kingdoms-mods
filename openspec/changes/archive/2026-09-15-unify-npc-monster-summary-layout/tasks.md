## 1. Shared Summary Component

- [x] 1.1 Add the shared combat-summary component with the existing monster grid, icons, compact health formatting, accessible labels, and an entity-owned metadata snippet; verify its prerendered markup at desktop and narrow widths.
- [x] 1.2 Migrate the monster detail page to the shared component without changing its resolved spawn or level values; verify a variable-level monster before and after the extraction.

## 2. NPC Summary Integration

- [x] 2.1 Replace the NPC image-only card with the shared combat summary, pass the existing level-resolved combat values, and retain the detailed combat section; verify Archmage Illidan's displayed values against the database.
- [x] 2.2 Move NPC race and linked faction into the summary metadata and show level in the header; verify a normal NPC and Naia Leolynn without fallback metadata.
- [x] 2.3 Verify the NPC and monster summaries in the built site at desktop and narrow widths, including complete prerendered content without client JavaScript.

## 3. Validation

- [x] 3.1 Run the relevant website tests, `pnpm check`, `pnpm lint`, and `pnpm build`; validate the OpenSpec change strictly.
