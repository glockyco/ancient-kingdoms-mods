## Purpose

Protect compendium visitors from unintended code execution, framing, and unnecessary browser capabilities without disabling the site's published content.

## ADDED Requirements

### Requirement: Active content is limited to approved sources

Every HTML response SHALL enforce a Content-Security-Policy that permits necessary first-party resources and the Cloudflare analytics beacon. It SHALL prohibit unapproved script origins, inline event handlers, plugins, and cross-origin form targets. The policy SHALL work on prerendered pages, Worker-rendered pages, and error documents.

#### Scenario: Visitor opens a prerendered item page

- **WHEN** a visitor opens an item page with a tooltip and structured data
- **THEN** the item data, tooltip colors, structured data, theme, and search work without a policy violation
- **AND** a script from an unapproved origin or an injected inline event handler does not run

#### Scenario: Visitor opens the dynamic home page

- **WHEN** the Worker renders the home page with a fresh game-version result
- **THEN** the response enforces the same resource restrictions without blocking the home search or Cloudflare beacon

#### Scenario: Visitor opens the map

- **WHEN** the map loads its data, worker, images, and interactive layers
- **THEN** the map remains functional under the policy

### Requirement: Framing is restricted to verified embedders

HTML responses SHALL reject embedding by origins outside the verified embedder set. If that set is empty, HTML responses SHALL reject all framing. The `?theme=dark` and `?theme=light` parameters SHALL continue to work during ordinary visits, without authorizing a new embedding origin.

#### Scenario: Untrusted site tries to embed a compendium page

- **WHEN** an origin outside the verified embedder set frames a static page or Worker response
- **THEN** the browser refuses to display the page in the frame

#### Scenario: Visitor uses a theme parameter

- **WHEN** a visitor opens a page with `?theme=light` outside a frame
- **THEN** the page applies the light theme

### Requirement: Responses carry browser security headers

Static assets and Worker responses SHALL carry `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, and a `Permissions-Policy` that disables unused browser features. HTML responses SHALL also carry a framing policy consistent with the Content-Security-Policy.

#### Scenario: Browser requests both delivery paths

- **WHEN** the browser requests a prerendered detail page, a first-party asset, the dynamic home page, and a missing document
- **THEN** each response includes the applicable security headers, with consistent framing rules for HTML
