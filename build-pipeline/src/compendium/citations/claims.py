"""Check that a citation's prose is actually supported by the code it names.

The hash in the lockfile proves a cited region has not changed. It cannot prove
the region was ever the right one: a locator that drifted onto unrelated code
during some earlier patch gets its wrong content hashed and then verifies
forever. Three citations in the 0.9.27.0 audit had rotted exactly that way, one
of them naming a scribing branch while pointing at guild RPC plumbing.

The signal used here is deliberately narrow. When an author writes an
identifier or a specific number into the prose, they are asserting that this
code contains it, and that assertion can be tested. Prose written in plain
English asserts nothing checkable and is left alone, so the rule stays quiet
except where it has real evidence.
"""

from __future__ import annotations

import re
from collections.abc import Sequence

# An identifier is only worth checking when its shape marks it as code rather
# than an English word: an internal capital, or an underscore join.
_IDENTIFIER_RE = re.compile(
    r"\b(?:[a-z]+(?:[A-Z][A-Za-z0-9]*)+|[A-Z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+|[a-z]+(?:_[a-z0-9]+)+)\b"
)

# Three or more digits, allowing the thousands separators prose uses and code
# does not. Shorter numbers are unusable: prose writes a percentage as "10"
# where the code holds "0.1f", and a two-digit literal appears on so many lines
# that matching one proves nothing.
_NUMBER_RE = re.compile(r"\b\d{1,3}(?:[,\u202f\u00a0]\d{3})+\b|\b\d{3,}\b")

# Prose leans on all-caps shorthand - stat abbreviations such as INT and CHA,
# and terms like NPC or XP - which pass the identifier shape test but name the
# game's vocabulary, not its code. Decompiled identifiers are never all-caps.
_PROSE_IDENTIFIERS_RE = re.compile(r"^[A-Z0-9]+s?$")

# A cited file name, plus any locator list that trails it: "Combat.cs:120-130",
# "Npc.cs:1772-1779, 1801", or "GatherItem.cs:749 and 812".
_CROSS_REFERENCE_RE = re.compile(
    r"\b[A-Za-z0-9_]+\.cs\b(?:\s*:?\s*\d[\d,\-]*(?:\s*(?:and|,)\s*\d[\d,\-]*)*)?"
)

# Code writes a number as a maximal run of digits, optionally carrying a type
# suffix that a word boundary would trip over.
_CODE_NUMBER_RE = re.compile(r"\d+")


def _normalise_number(text: str) -> str:
    return re.sub(r"[,\u202f\u00a0]", "", text)


def claim_tokens(claim: str) -> tuple[frozenset[str], frozenset[str]]:
    """Split a claim into the identifiers and numbers it asserts.

    A cross-file pointer such as ``NetworkManagerMMO.cs:718 and 820`` is a
    reference, not an assertion about this region's contents, so the file name
    and the line numbers trailing it are dropped before anything is read as a
    claim. Leaving them in would test a region against another file's locators.
    """
    without_files = _CROSS_REFERENCE_RE.sub(" ", claim)
    identifiers = {
        match.group()
        for match in _IDENTIFIER_RE.finditer(without_files)
        if not _PROSE_IDENTIFIERS_RE.match(match.group())
    }
    numbers = {
        _normalise_number(match.group()) for match in _NUMBER_RE.finditer(without_files)
    }
    return frozenset(identifiers), frozenset(numbers)


def claim_supported(claim: str, region: Sequence[str]) -> bool:
    """Whether a cited region carries any token the claim names.

    One match is enough. A claim usually names several tokens and a region only
    has to be the right region, not to restate every word of the prose.
    """
    identifiers, numbers = claim_tokens(claim)
    if not identifiers and not numbers:
        return True

    text = "\n".join(region)
    for identifier in identifiers:
        # Two decompiler habits have to be tolerated or real matches are missed:
        # a command body becomes UserCode_<name>, and a SyncVar accessor becomes
        # Network<name>. Underscores are word characters, so a plain word
        # boundary would reject the first, and the second is a bare prefix.
        pattern = rf"(?<![A-Za-z0-9])(?:Network)?{re.escape(identifier)}(?![A-Za-z0-9])"
        if re.search(pattern, text):
            return True
    # Maximal digit runs, so a literal's type suffix does not hide it: 1279000f
    # has to read as 1279000.
    return bool(numbers and numbers & set(_CODE_NUMBER_RE.findall(text)))
