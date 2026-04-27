"""Coverage reporting for visual asset audit results."""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Iterable

from compendium.visual_audit.models import VisualSelection


def build_coverage_markdown(selections: Iterable[VisualSelection]) -> str:
    selections = list(selections)
    by_domain: dict[str, Counter[str]] = defaultdict(Counter)
    for selection in selections:
        by_domain[selection.domain][selection.status] += 1

    lines = [
        "# Visual Asset Audit Coverage",
        "",
        "This report is generated from runtime-authoritative visual references and the static Unity asset index.",
        "Entity-name-only static matches are not selected.",
        "",
        "| Domain | Selected | Runtime only | Ambiguous | Missing | Static only | Total |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for domain in sorted(by_domain):
        counts = by_domain[domain]
        total = sum(counts.values())
        lines.append(
            "| {domain} | {selected} | {runtime_only} | {ambiguous} | {missing} | {static_only} | {total} |".format(
                domain=domain,
                selected=counts["selected"],
                runtime_only=counts["runtime_only"],
                ambiguous=counts["ambiguous"],
                missing=counts["missing"],
                static_only=counts["static_only"],
                total=total,
            )
        )

    lines.extend(["", "## Non-selected Visuals", ""])
    for selection in selections:
        if selection.status == "selected":
            continue
        lines.append(
            f"- `{selection.domain}/{selection.entity_id}/{selection.visual_kind}`: "
            f"{selection.status} — {selection.reason}"
        )

    return "\n".join(lines) + "\n"
