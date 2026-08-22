import tempfile
import unittest
from pathlib import Path

from PIL import Image

from compendium.visual_assets import (
    PHOTO_ENCODE_METHOD,
    SPRITE_ENCODE_METHOD,
    Encoding,
    publish_image,
)


def _sprite(width=24, height=24):
    """An image with transparent padding and a coloured square inside it."""
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for x in range(4, width - 4):
        for y in range(4, height - 4):
            image.putpixel((x, y), (x * 7 % 256, y * 11 % 256, 90, 255))
    return image


class EncodingDeterminismTests(unittest.TestCase):
    """The same source and settings must give the same bytes.

    The encoder carries no randomness, so this holds for a fixed toolchain. The
    test states the guarantee, so that an upgrade of Pillow or libwebp that
    changes the output fails here instead of passing quietly.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.static = Path(self.tmp.name)

    def _publish(self, image, entity_id, encoding=Encoding.SPRITE):
        asset = publish_image(
            image,
            self.static,
            domain="item",
            entity_id=entity_id,
            kind="icon",
            encoding=encoding,
        )
        return (self.static / asset.public_path).read_bytes(), asset

    def test_encoding_one_source_twice_gives_the_same_bytes(self):
        image = _sprite()

        first, _ = self._publish(image, "first")
        second, _ = self._publish(image, "second")

        self.assertEqual(first, second)

    def test_a_photograph_encodes_the_same_way_twice(self):
        image = Image.new("RGB", (32, 32))
        for x in range(32):
            for y in range(32):
                image.putpixel((x, y), (x * 8 % 256, y * 8 % 256, 40))

        first, _ = self._publish(image, "photo_one", Encoding.PHOTO)
        second, _ = self._publish(image, "photo_two", Encoding.PHOTO)

        self.assertEqual(first, second)

    def test_transparent_padding_is_trimmed_from_a_sprite(self):
        _, asset = self._publish(_sprite(24, 24), "trimmed")

        self.assertEqual((asset.width, asset.height), (16, 16))

    def test_the_sprite_effort_is_lower_than_the_photograph_effort(self):
        # The sprite path encodes about 3100 images per build and the photograph
        # path about 70, so only the sprite path pays for a high setting.
        self.assertLess(SPRITE_ENCODE_METHOD, PHOTO_ENCODE_METHOD)


if __name__ == "__main__":
    unittest.main()
