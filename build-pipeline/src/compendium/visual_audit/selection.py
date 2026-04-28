"""Runtime-first visual asset reconciliation."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

from compendium.visual_audit.models import (
    ExpectedVisual,
    RuntimeReference,
    StaticAsset,
    VisualSelection,
)


def select_visuals(
    expected: Iterable[ExpectedVisual],
    runtime_refs: Iterable[RuntimeReference],
    static_assets: Iterable[StaticAsset] | None = None,
) -> list[VisualSelection]:
    """Select visual assets for expected entity visual slots.

    Runtime references are authoritative. A selected visual must have an image
    extracted from the running game. Static assets are intentionally ignored here;
    they are only an optional corpus inventory, not a mapping fallback.
    """

    del static_assets

    refs_by_slot: dict[tuple[str, str, str], list[RuntimeReference]] = defaultdict(list)
    for ref in runtime_refs:
        refs_by_slot[(ref.domain, ref.entity_id, ref.visual_kind)].append(ref)

    selections: list[VisualSelection] = []
    for slot in expected:
        key = (slot.domain, slot.entity_id, slot.visual_kind)
        refs = refs_by_slot.get(key, [])
        source_fields = sorted(set(ref.source_field for ref in refs))
        runtime_image_paths = sorted(
            {ref.runtime_image_path for ref in refs if ref.runtime_image_path}
        )

        if not refs:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="missing",
                    confidence="missing",
                    reason="No authoritative runtime reference found",
                )
            )
        elif len(runtime_image_paths) == 1:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="selected",
                    confidence="runtime_image",
                    runtime_image_path=runtime_image_paths[0],
                    runtime_source_fields=source_fields,
                    reason="Runtime image extracted from authoritative runtime reference",
                )
            )
        elif len(runtime_image_paths) > 1:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="ambiguous",
                    confidence="ambiguous",
                    candidate_runtime_image_paths=runtime_image_paths,
                    runtime_source_fields=source_fields,
                    reason="Multiple runtime images were extracted for this visual slot",
                )
            )
        else:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="runtime_only",
                    confidence="authoritative_runtime_reference",
                    runtime_source_fields=source_fields,
                    reason="Runtime reference found, but no runtime image was extracted",
                )
            )

    return selections
