"""Runtime visual probes executed through the HotRepl CLI."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from compendium.config import get_repo_root


@dataclass(frozen=True)
class HotReplCommand:
    hotrepl_client: Path
    url: str
    script_path: Path
    timeout_ms: int


def default_hotrepl_client() -> Path:
    """Return the sibling HotRepl client checkout path used by local tooling."""

    return get_repo_root().parent / "HotRepl" / "client"


def default_probe_dir() -> Path:
    return get_repo_root() / "tools" / "visual-audit" / "probes"


def probe_command(command: HotReplCommand) -> list[str]:
    return [
        "uv",
        "run",
        "--project",
        str(command.hotrepl_client),
        "hotrepl",
        "--url",
        command.url,
        "eval",
        "--file",
        str(command.script_path),
        "--timeout",
        str(command.timeout_ms),
        "--json",
    ]


def parse_eval_json_value(stdout: str) -> Any:
    """Parse `hotrepl eval --json` output where `value` contains JSON text."""

    response = json.loads(stdout)
    if response.get("type") != "eval_result" or not response.get("hasValue"):
        raise ValueError(f"HotRepl response did not contain a value: {response}")
    value = response.get("value")
    if not isinstance(value, str):
        raise ValueError(f"HotRepl response value was not a string: {response}")
    return json.loads(value)


def run_probe(
    domain: str,
    *,
    hotrepl_client: Path | None = None,
    url: str = "ws://localhost:18590",
    timeout_ms: int = 10000,
    probe_dir: Path | None = None,
) -> list[dict[str, Any]]:
    """Execute one probe script and return its runtime reference rows."""

    client_dir = hotrepl_client or default_hotrepl_client()
    scripts_dir = probe_dir or default_probe_dir()
    script_path = scripts_dir / f"{domain}.csx"
    if not script_path.exists():
        raise FileNotFoundError(
            f"No visual-audit probe script exists for domain: {domain}"
        )

    completed = subprocess.run(
        probe_command(
            HotReplCommand(
                hotrepl_client=client_dir,
                url=url,
                script_path=script_path,
                timeout_ms=timeout_ms,
            )
        ),
        check=True,
        text=True,
        capture_output=True,
    )
    rows = parse_eval_json_value(completed.stdout)
    if not isinstance(rows, list):
        raise ValueError(
            f"Probe {domain} returned {type(rows).__name__}, expected list"
        )
    return rows
