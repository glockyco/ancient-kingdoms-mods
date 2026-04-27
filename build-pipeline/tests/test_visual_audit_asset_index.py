import json
import tempfile
import unittest
from pathlib import Path

from compendium.visual_audit.asset_index import asset_key, write_static_index
from compendium.visual_audit.models import StaticAsset


class VisualAssetIndexTests(unittest.TestCase):
    def test_asset_key_uses_container_path_and_path_id(self):
        self.assertEqual(
            asset_key("sharedassets1.assets", 12345), "sharedassets1.assets:12345"
        )

    def test_write_static_index_sorts_assets_and_writes_json(self):
        assets = [
            StaticAsset(
                asset_key="b.assets:2",
                asset_type="Texture2D",
                name="B",
                container_path="b.assets",
                path_id=2,
            ),
            StaticAsset(
                asset_key="a.assets:1",
                asset_type="Sprite",
                name="A",
                container_path="a.assets",
                path_id=1,
            ),
        ]

        with tempfile.TemporaryDirectory() as tmp:
            output_path = Path(tmp) / "index.json"
            write_static_index(assets, output_path)
            payload = json.loads(output_path.read_text())

        self.assertEqual(
            [entry["asset_key"] for entry in payload["assets"]],
            ["a.assets:1", "b.assets:2"],
        )
        self.assertEqual(payload["asset_count"], 2)


if __name__ == "__main__":
    unittest.main()
