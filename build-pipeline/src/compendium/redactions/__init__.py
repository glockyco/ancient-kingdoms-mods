"""Redaction mechanisms for the published compendium.

Two zone mechanisms act independently. Position suppression keeps every entity
of a zone and removes its geometry. Unreleased-zone exclusion removes the zone
and everything related to it, then cascades to entities left with no source.
"""

from .semantics import apply_semantic_withholding, rekey, validate_semantics

__all__ = ["apply_semantic_withholding", "rekey", "validate_semantics"]
