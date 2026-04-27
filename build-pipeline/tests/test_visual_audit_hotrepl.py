import json
import tempfile
import unittest
from pathlib import Path

from compendium.visual_audit.hotrepl import (
    HotReplCommand,
    parse_eval_json_value,
    probe_command,
)


class VisualAuditHotReplTests(unittest.TestCase):
    def test_parse_eval_json_value_reads_nested_json_string(self):
        response = {
            "type": "eval_result",
            "id": "py-1",
            "hasValue": True,
            "value": json.dumps([{"domain": "monster", "entity_id": "sabretooth"}]),
        }

        self.assertEqual(
            parse_eval_json_value(json.dumps(response)),
            [{"domain": "monster", "entity_id": "sabretooth"}],
        )

    def test_probe_command_uses_uv_project_and_eval_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            hotrepl_client = Path(tmp) / "HotRepl" / "client"
            script = Path(tmp) / "monsters.csx"
            command = probe_command(
                HotReplCommand(
                    hotrepl_client=hotrepl_client,
                    url="ws://localhost:18590",
                    script_path=script,
                    timeout_ms=10000,
                )
            )

        self.assertEqual(
            command,
            [
                "uv",
                "run",
                "--project",
                str(hotrepl_client),
                "hotrepl",
                "--url",
                "ws://localhost:18590",
                "eval",
                "--file",
                str(script),
                "--timeout",
                "10000",
                "--json",
            ],
        )


if __name__ == "__main__":
    unittest.main()
