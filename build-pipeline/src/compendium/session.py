"""The session state an export was taken under.

An export writes values that describe the game. One dependency cannot be
removed: a localized string is in some language, and the game resolves an item
tooltip through the locale its client has selected. The 0.9.31.0 patch added
that dependency, and nothing reported an export taken in another language.

The export therefore declares its locale, and the build refuses any other. A
declaration cannot half-succeed, which is why the build reads one rather than
setting the locale itself.
"""

import json
from pathlib import Path

MANIFEST_NAME = "game_config.json"

# The language the compendium publishes.
PUBLISHED_LOCALE = "en"


class WrongExportSession(Exception):
    """The export was taken under a state the published data does not assume."""


def verify_export_locale(export_dir: Path) -> None:
    """Fail unless the export declares the locale the published data assumes."""
    manifest = export_dir / MANIFEST_NAME
    if not manifest.exists():
        raise WrongExportSession(
            f"{MANIFEST_NAME} is missing, so the export declares no locale. "
            "Export again with a build that records one."
        )

    declared = json.loads(manifest.read_text(encoding="utf-8")).get("export_locale")
    if not declared:
        raise WrongExportSession(
            f"{MANIFEST_NAME} declares no locale. The published data assumes "
            f"{PUBLISHED_LOCALE!r}, and an export that does not say cannot be "
            "checked. Export again with a build that records one."
        )

    if declared != PUBLISHED_LOCALE:
        raise WrongExportSession(
            f"The export was taken under locale {declared!r} and the published "
            f"data assumes {PUBLISHED_LOCALE!r}. Select that language in the "
            "game and export again."
        )
