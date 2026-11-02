## ADDED Requirements

### Requirement: The website offers only released mods

The website SHALL publish each downloadable mod as built from the newest git tag of its releases, `<id>-v<version>`, and SHALL NOT publish a build of uncommitted or untagged code. A publish SHALL fail, keeping the current downloads, when a mod has no release tag or when the DLL built from the tag names another version.

#### Scenario: A deploy while mod work is unreleased

- **WHEN** the working tree holds Pocket Compendium changes after the `pocket-compendium-v1.0.1` tag and the site is deployed
- **THEN** the site offers the DLL built from `pocket-compendium-v1.0.1`, which names version 1.0.1

#### Scenario: A mod without a release

- **WHEN** a mod in the download list has no release tag
- **THEN** the publish fails and the downloads published before stay in place

#### Scenario: A tag on the wrong commit

- **WHEN** the DLL built from `pocket-compendium-v1.0.2` names version 1.0.1
- **THEN** the publish fails and the downloads published before stay in place

### Requirement: A release publishes the same file on every deploy

Building a mod from the same release tag SHALL produce the same DLL wherever the build runs, and the DLL SHALL hold no path of the machine that built it.

#### Scenario: A deploy without a new release

- **WHEN** the site is deployed twice while `pocket-compendium-v1.0.1` is the newest release
- **THEN** both deploys publish the same DLL, so the mod's update notice stays quiet
