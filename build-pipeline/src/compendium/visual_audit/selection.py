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
    static_assets: Iterable[StaticAsset],
) -> list[VisualSelection]:
    """Select visual assets for expected entity visual slots.

    Runtime references are authoritative. Static assets are selected only when their
    names match a runtime-referenced Unity object, sprite, texture, prefab, or path.
    Entity-name-only matches are intentionally ignored.
    """

    refs_by_slot: dict[tuple[str, str, str], list[RuntimeReference]] = defaultdict(list)
    for ref in runtime_refs:
        refs_by_slot[(ref.domain, ref.entity_id, ref.visual_kind)].append(ref)

    assets_by_name = _index_assets_by_runtime_name(static_assets)

    selections: list[VisualSelection] = []
    for slot in expected:
        key = (slot.domain, slot.entity_id, slot.visual_kind)
        refs = refs_by_slot.get(key, [])
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
            continue

        candidate_keys: list[str] = []
        for ref in refs:
            for name in _runtime_names(ref):
                candidate_keys.extend(
                    asset.asset_key for asset in assets_by_name.get(name, [])
                )

        candidate_keys = sorted(set(candidate_keys))
        source_fields = sorted(set(ref.source_field for ref in refs))

        if len(candidate_keys) == 1:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="selected",
                    confidence="runtime_static_match",
                    static_asset_key=candidate_keys[0],
                    candidate_asset_keys=candidate_keys,
                    runtime_source_fields=source_fields,
                    reason="Static asset matched authoritative runtime object names",
                )
            )
        elif len(candidate_keys) > 1:
            selections.append(
                VisualSelection(
                    domain=slot.domain,
                    entity_id=slot.entity_id,
                    entity_name=slot.entity_name,
                    visual_kind=slot.visual_kind,
                    status="ambiguous",
                    confidence="ambiguous",
                    candidate_asset_keys=candidate_keys,
                    runtime_source_fields=source_fields,
                    reason="Multiple static assets matched authoritative runtime object names",
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
                    reason="No static asset matched runtime object names",
                )
            )

    return selections


def _index_assets_by_runtime_name(
    static_assets: Iterable[StaticAsset],
) -> dict[str, list[StaticAsset]]:
    assets_by_name: dict[str, list[StaticAsset]] = defaultdict(list)
    for asset in static_assets:
        for name in (asset.name, asset.texture_name):
            if name:
                assets_by_name[name].append(asset)
    return assets_by_name


def _runtime_names(ref: RuntimeReference) -> set[str]:
    names = {
        ref.unity_object_name,
        ref.sprite_name,
        ref.texture_name,
        ref.game_object_name,
        ref.prefab_name,
        ref.path,
    }
    return {name for name in names if name}
