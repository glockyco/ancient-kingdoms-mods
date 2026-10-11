"""Run documentation checks without game or pipeline configuration."""

import typer

from compendium.docs import check
from compendium.utils.paths import get_repo_root


def run() -> int:
    findings = check(get_repo_root())
    for finding in findings:
        typer.echo(f"{finding.path}:{finding.line}: {finding.problem}")
    typer.echo(f"{len(findings)} documentation problem(s).")
    typer.echo(
        "See .agent/skills/project-documentation/SKILL.md for where each fact belongs."
    )
    return int(bool(findings))
