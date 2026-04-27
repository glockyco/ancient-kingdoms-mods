"""Runtime visual probes executed through the HotRepl CLI."""

from __future__ import annotations

import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from compendium.config import get_repo_root

OUTPUT_PATH_TOKEN = "__VISUAL_AUDIT_OUTPUT_PATH__"


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


def render_probe_script(source: str, output_path: Path) -> str:
    """Inject the JSON output path into a probe script as a C# string literal."""

    return source.replace(f'"{OUTPUT_PATH_TOKEN}"', json.dumps(str(output_path)))


def parse_eval_json_value(stdout: str) -> Any:
    """Parse `hotrepl eval --json` output where `value` contains JSON text.

    HotRepl serializes eval return values for transport. A returned C# string is
    therefore encoded once by the C# script and once by HotRepl's result
    serializer. Decode both layers when present.
    """

    response = json.loads(stdout)
    if response.get("type") != "eval_result" or not response.get("hasValue"):
        raise ValueError(f"HotRepl response did not contain a value: {response}")
    value = response.get("value")
    if not isinstance(value, str):
        raise ValueError(f"HotRepl response value was not a string: {response}")

    decoded = json.loads(value)
    if isinstance(decoded, str):
        return json.loads(decoded)
    return decoded


def run_probe(
    domain: str,
    *,
    hotrepl_client: Path | None = None,
    url: str = "ws://localhost:18590",
    timeout_ms: int = 10000,
    probe_dir: Path | None = None,
    output_path: Path | None = None,
) -> list[dict[str, Any]]:
    """Execute one probe script and return its runtime reference rows."""

    client_dir = hotrepl_client or default_hotrepl_client()
    scripts_dir = probe_dir or default_probe_dir()
    script_path = scripts_dir / f"{domain}.csx"
    if not script_path.exists():
        raise FileNotFoundError(
            f"No visual-audit probe script exists for domain: {domain}"
        )

    owns_output = output_path is None
    if output_path is None:
        with tempfile.NamedTemporaryFile(
            suffix=f".{domain}.json", delete=False
        ) as temp_output:
            output_file = Path(temp_output.name)
    else:
        output_file = output_path
        output_file.parent.mkdir(parents=True, exist_ok=True)

    rendered_script = render_probe_script(script_path.read_text(), output_file)
    with tempfile.NamedTemporaryFile(
        "w", suffix=f".{domain}.csx", delete=False
    ) as temp_script:
        temp_script.write(rendered_script)
        temp_script_path = Path(temp_script.name)

    try:
        completed = subprocess.run(
            probe_command(
                HotReplCommand(
                    hotrepl_client=client_dir,
                    url=url,
                    script_path=temp_script_path,
                    timeout_ms=timeout_ms,
                )
            ),
            check=True,
            text=True,
            capture_output=True,
        )
        summary = parse_eval_json_value(completed.stdout)
        if not output_file.exists():
            raise FileNotFoundError(
                f"Probe {domain} did not write expected output: {output_file}"
            )
        rows = json.loads(output_file.read_text())
        if not isinstance(rows, list):
            raise ValueError(
                f"Probe {domain} wrote {type(rows).__name__}, expected list"
            )
        if isinstance(summary, dict) and summary.get("row_count") != len(rows):
            raise ValueError(
                f"Probe {domain} reported {summary.get('row_count')} rows but wrote {len(rows)} rows"
            )
        return rows
    finally:
        temp_script_path.unlink(missing_ok=True)
        if owns_output:
            output_file.unlink(missing_ok=True)
