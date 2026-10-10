import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from compendium.db import create_database
from compendium.loaders.core import load_visual_assets, record_visual_assets
from compendium.visual_assets import DOMAIN_TABLES, reconcile

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class RuntimeArtworkTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.exports = self.root / "exports"
        self.exports.mkdir()
        self.static = self.root / "static"
        self.conn = create_database(self.root / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        self.manifest = []

    def add_asset(self, domain, entity_id, kind, image):
        path = f"{domain}_{entity_id}_{kind}.png"
        image.save(self.exports / path)
        self.manifest.append(
            {
                "domain": domain,
                "entity_id": entity_id,
                "kind": kind,
                "export_path": path,
                "source_field": "runtime.sprite",
                "source_type": "UnityEngine.Sprite",
                "source_name": entity_id,
                "sprite_name": kind,
                "texture_name": entity_id,
                "width": image.width,
                "height": image.height,
            }
        )
        (self.exports / "visual_assets.json").write_text(
            json.dumps(self.manifest), encoding="utf-8"
        )

    def test_portrait_and_bestiary_preserve_native_canvas_and_pixels(self):
        source = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
        source.putpixel((20, 30), (41, 82, 123, 255))
        source.putpixel((21, 30), (30, 60, 90, 128))
        for kind in ("portrait", "bestiary"):
            self.add_asset("monster", "boss", kind, source)
        load_visual_assets(self.conn, self.exports, self.static)
        rows = self.conn.execute(
            "SELECT kind, public_path, width, height FROM visual_assets ORDER BY kind"
        ).fetchall()
        self.assertEqual(2, len(rows))
        for kind, path, width, height in rows:
            self.assertEqual(f"images/monsters/boss/{kind}.webp", path)
            self.assertEqual((64, 96), (width, height))
            with Image.open(self.static / path) as output:
                self.assertEqual(source.tobytes(), output.convert("RGBA").tobytes())

    def test_world_map_downscales_proportionally_and_has_no_entity_owner(self):
        self.assertIn("world", DOMAIN_TABLES)
        self.assertIsNone(DOMAIN_TABLES["world"])
        self.add_asset(
            "world", "eratiath", "map", Image.new("RGB", (3000, 1500), "blue")
        )
        load_visual_assets(self.conn, self.exports, self.static)
        self.assertEqual(0, reconcile(self.conn, self.static))
        row = self.conn.execute(
            "SELECT public_path, width, height FROM visual_assets"
        ).fetchone()
        self.assertEqual(("images/world/eratiath/map.webp", 2400, 1200), row)
        with Image.open(self.static / row[0]) as image:
            self.assertEqual((2400, 1200), image.size)

    def test_record_only_uses_same_world_map_dimensions_without_publishing(self):
        self.add_asset("world", "eratiath", "map", Image.new("RGB", (3000, 1500)))
        record_visual_assets(self.conn, self.exports)
        self.assertEqual(
            (2400, 1200),
            self.conn.execute("SELECT width, height FROM visual_assets").fetchone(),
        )
        self.assertFalse(self.static.exists())

    def test_small_world_map_is_not_enlarged(self):
        self.add_asset("world", "eratiath", "map", Image.new("RGB", (800, 400)))
        load_visual_assets(self.conn, self.exports, self.static)
        self.assertEqual(
            (800, 400),
            self.conn.execute("SELECT width, height FROM visual_assets").fetchone(),
        )
