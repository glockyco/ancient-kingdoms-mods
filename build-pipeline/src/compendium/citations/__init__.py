"""Provenance checking for `Source: server-scripts/...` citations.

The repository hand-writes game-mechanics values that cannot be derived from the
game's JSON exports, annotating each with a comment pointing into
`server-scripts/` - a local, gitignored ILSpy decompilation of the game's
`Assembly-CSharp.dll`. Those comments carry line numbers that silently rot every
time the game patches.

This package parses the citations, resolves them against the local snapshot, and
compares the cited regions against content hashes recorded in the tracked
`citations.lock.json`. Only hashes are stored, never decompiled text.
"""

from compendium.citations.claims import claim_supported, claim_tokens
from compendium.citations.lockfile import LockEntry, Lockfile
from compendium.citations.parser import (
    CITATION_EXTENSIONS,
    Reference,
    iter_citation_files,
    parse_block,
    parse_file,
)
from compendium.citations.snapshot import (
    AmbiguousCitationError,
    Snapshot,
    SnapshotIdentity,
    UnresolvedCitationError,
    digest,
    is_substantive,
)

__all__ = [
    "CITATION_EXTENSIONS",
    "AmbiguousCitationError",
    "LockEntry",
    "Lockfile",
    "Reference",
    "Snapshot",
    "SnapshotIdentity",
    "UnresolvedCitationError",
    "claim_supported",
    "claim_tokens",
    "digest",
    "is_substantive",
    "iter_citation_files",
    "parse_block",
    "parse_file",
]
