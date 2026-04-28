import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from compendium.db import create_database
from compendium.loaders import load_visual_assets


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class VisualAssetLoaderTests(unittest.TestCase):
    def test_load_visual_assets_copies_files_and_records_public_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            export_dir.mkdir(parents=True)
            static_dir.mkdir(parents=True)

            source_path = (
                export_dir
                / "images"
                / "monster"
                / "ancient_cyclops"
                / "primary"
                / "Monster.gameObject.SpriteRenderer_Cyclops_1_0_0_96_98.png"
            )
            source_path.parent.mkdir(parents=True)
            source_path.write_bytes(b"runtime-png")

            manifest = [
                {
                    "domain": "monster",
                    "entity_id": "ancient_cyclops",
                    "kind": "primary",
                    "export_path": "images/monster/ancient_cyclops/primary/Monster.gameObject.SpriteRenderer_Cyclops_1_0_0_96_98.png",
                    "source_field": "Monster.gameObject.SpriteRenderer",
                    "source_type": "UnityEngine.SpriteRenderer",
                    "source_name": "Ancient Cyclops",
                    "sprite_name": "Cyclops_1",
                    "texture_name": "Cyclops",
                    "width": 96,
                    "height": 98,
                }
            ]
            (export_dir / "visual_assets.json").write_text(
                json.dumps(manifest), encoding="utf-8"
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_visual_assets(conn, export_dir, static_dir)

                row = conn.execute(
                    """
                    SELECT domain, entity_id, kind, export_path, public_path, width, height
                    FROM visual_assets
                    WHERE domain = 'monster' AND entity_id = 'ancient_cyclops' AND kind = 'primary'
                    """
                ).fetchone()
            finally:
                conn.close()

            self.assertIsNotNone(row)
            self.assertEqual(row[0], "monster")
            self.assertEqual(row[3], manifest[0]["export_path"])
            self.assertEqual(
                row[4],
                "images/monsters/ancient_cyclops/primary.png",
            )
            self.assertEqual(row[5], 96)
            self.assertEqual(row[6], 98)
            self.assertEqual((static_dir / row[4]).read_bytes(), b"runtime-png")

    def test_load_visual_assets_preserves_entity_id_underscores_in_public_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            export_dir.mkdir(parents=True)
            static_dir.mkdir(parents=True)

            manifest = []
            for entity_id in ["skeleton_archer", "skeleton_archer_"]:
                source_path = (
                    export_dir
                    / "images"
                    / "monster"
                    / entity_id
                    / "primary"
                    / "Monster.gameObject.SpriteRenderer_skeleton_archer.png"
                )
                source_path.parent.mkdir(parents=True)
                source_path.write_bytes(entity_id.encode())
                manifest.append(
                    {
                        "domain": "monster",
                        "entity_id": entity_id,
                        "kind": "primary",
                        "export_path": f"images/monster/{entity_id}/primary/Monster.gameObject.SpriteRenderer_skeleton_archer.png",
                        "source_field": "Monster.gameObject.SpriteRenderer",
                        "source_type": "UnityEngine.SpriteRenderer",
                        "source_name": entity_id,
                        "sprite_name": "skeleton_archer",
                        "texture_name": "skeleton_archer",
                        "width": 279,
                        "height": 306,
                    }
                )

            (export_dir / "visual_assets.json").write_text(
                json.dumps(manifest), encoding="utf-8"
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_visual_assets(conn, export_dir, static_dir)
                public_paths = {
                    row[0]
                    for row in conn.execute(
                        "SELECT public_path FROM visual_assets ORDER BY entity_id"
                    ).fetchall()
                }
            finally:
                conn.close()

            self.assertEqual(
                public_paths,
                {
                    "images/monsters/skeleton_archer/primary.png",
                    "images/monsters/skeleton_archer_/primary.png",
                },
            )

    def test_load_visual_assets_trims_transparent_padding_in_public_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            export_dir.mkdir(parents=True)
            static_dir.mkdir(parents=True)

            source_path = (
                export_dir
                / "images"
                / "monster"
                / "thalrakar"
                / "primary"
                / "Monster.gameObject.SpriteRenderer_thalrakar_0_0_900_900.png"
            )
            source_path.parent.mkdir(parents=True)
            image = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
            for x in range(3, 7):
                for y in range(2, 8):
                    image.putpixel((x, y), (255, 255, 255, 255))
            image.save(source_path)

            (export_dir / "visual_assets.json").write_text(
                json.dumps(
                    [
                        {
                            "domain": "monster",
                            "entity_id": "thalrakar",
                            "kind": "primary",
                            "export_path": "images/monster/thalrakar/primary/Monster.gameObject.SpriteRenderer_thalrakar_0_0_900_900.png",
                            "source_field": "Monster.gameObject.SpriteRenderer",
                            "source_type": "UnityEngine.SpriteRenderer",
                            "source_name": "Thalrakar",
                            "sprite_name": "thalrakar",
                            "texture_name": "thalrakar",
                            "width": 900,
                            "height": 900,
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_visual_assets(conn, export_dir, static_dir)
                public_path, width, height = conn.execute(
                    "SELECT public_path, width, height FROM visual_assets WHERE entity_id = 'thalrakar'"
                ).fetchone()
            finally:
                conn.close()

            with Image.open(static_dir / public_path) as output:
                self.assertEqual(output.size, (4, 6))
            self.assertEqual((width, height), (4, 6))

    def test_load_visual_assets_clears_stale_generated_assets_when_manifest_missing(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            export_dir.mkdir(parents=True)
            stale_path = static_dir / "images" / "stale.png"
            stale_path.parent.mkdir(parents=True)
            stale_path.write_bytes(b"stale")

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_visual_assets(conn, export_dir, static_dir)
                count = conn.execute("SELECT COUNT(*) FROM visual_assets").fetchone()[0]
            finally:
                conn.close()

            self.assertFalse(stale_path.exists())
            self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
