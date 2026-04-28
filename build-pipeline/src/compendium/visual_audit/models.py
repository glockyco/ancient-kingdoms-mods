"""Data contracts for the visual asset audit pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

VisualStatus = Literal["selected", "missing", "ambiguous", "runtime_only"]
RuntimeConfidence = Literal["authoritative"]
SelectionConfidence = Literal[
    "runtime_image",
    "authoritative_runtime_reference",
    "missing",
    "ambiguous",
]


class ExpectedVisual(BaseModel):
    """One visual slot expected for a compendium entity."""

    model_config = ConfigDict(extra="forbid")

    domain: str
    entity_id: str
    entity_name: str
    visual_kind: str


class RuntimeReference(BaseModel):
    """A visual reference observed from a running game object through HotRepl."""

    model_config = ConfigDict(extra="forbid")

    domain: str
    entity_id: str
    entity_name: str
    visual_kind: str
    source_field: str
    unity_object_type: str
    unity_object_name: str | None = None
    sprite_name: str | None = None
    texture_name: str | None = None
    runtime_image_path: str | None = None
    instance_id: int | None = None
    game_object_name: str | None = None
    prefab_name: str | None = None
    path: str | None = None
    confidence: RuntimeConfidence
    notes: list[str] = Field(default_factory=list)


class StaticAsset(BaseModel):
    """A sprite/texture-like object found in the static Unity asset corpus."""

    model_config = ConfigDict(extra="forbid")

    asset_key: str
    asset_type: str
    name: str
    container_path: str
    path_id: int
    texture_name: str | None = None
    width: int | None = None
    height: int | None = None
    extracted_path: str | None = None


class VisualSelection(BaseModel):
    """The reconciled audit result for one expected visual slot."""

    model_config = ConfigDict(extra="forbid")

    domain: str
    entity_id: str
    entity_name: str
    visual_kind: str
    status: VisualStatus
    confidence: SelectionConfidence
    runtime_image_path: str | None = None
    candidate_runtime_image_paths: list[str] = Field(default_factory=list)
    runtime_source_fields: list[str] = Field(default_factory=list)
    reason: str
