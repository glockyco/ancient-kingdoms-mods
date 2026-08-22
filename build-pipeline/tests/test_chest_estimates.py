import unittest

from compendium.denormalizers.items.special_types import _estimate_chest_drop_chances


def _rewards(*pairs):
    return [{"item_id": item_id, "probability": p} for item_id, p in pairs]


class ChestEstimateTests(unittest.TestCase):
    """The estimate must depend on its arguments and on nothing else."""

    def test_the_same_chest_gives_the_same_numbers_twice(self):
        chest = _rewards(("a", 0.25), ("b", 0.5), ("c", 0.1))

        self.assertEqual(
            _estimate_chest_drop_chances(chest, 2),
            _estimate_chest_drop_chances(chest, 2),
        )

    def test_estimating_another_chest_does_not_move_the_first(self):
        # A generator shared between chests would carry the draws of the second
        # chest into the third call, and this is the case that would catch it.
        first = _rewards(("a", 0.25), ("b", 0.5))
        other = _rewards(("x", 0.9), ("y", 0.3), ("z", 0.05))

        before = _estimate_chest_drop_chances(first, 1)
        _estimate_chest_drop_chances(other, 2)
        after = _estimate_chest_drop_chances(first, 1)

        self.assertEqual(before, after)

    def test_changing_one_chest_leaves_the_other_unchanged(self):
        first = _rewards(("a", 0.25), ("b", 0.5))
        second = _rewards(
            ("x", 0.4),
        )
        before = _estimate_chest_drop_chances(first, 1)

        _estimate_chest_drop_chances(second + _rewards(("y", 0.7)), 1)

        self.assertEqual(_estimate_chest_drop_chances(first, 1), before)

    def test_a_certain_reward_is_always_given(self):
        chances = _estimate_chest_drop_chances(_rewards(("only", 1.0)), 1)

        self.assertEqual(chances["only"], 1.0)

    def test_a_chance_is_a_probability(self):
        chances = _estimate_chest_drop_chances(
            _rewards(("a", 0.25), ("b", 0.5), ("c", 0.9)), 2
        )

        for item_id, chance in chances.items():
            self.assertGreaterEqual(chance, 0.0, item_id)
            self.assertLessEqual(chance, 1.0, item_id)

    def test_a_likelier_reward_is_given_more_often(self):
        chances = _estimate_chest_drop_chances(
            _rewards(("rare", 0.05), ("common", 0.8)), 1
        )

        self.assertGreater(chances["common"], chances["rare"])


if __name__ == "__main__":
    unittest.main()
