import unittest

from compendium.models import NpcData, NpcItemSale


class NpcSalesTests(unittest.TestCase):
    def test_repeated_shop_slots_keep_authored_order_and_multiplicity(self) -> None:
        npc = NpcData(
            id="vendor",
            name="Vendor",
            quest_offers=[],
            items_sold=[
                NpcItemSale(item_id="beer", price=10),
                NpcItemSale(item_id="beer", price=10),
                NpcItemSale(item_id="beer", price=20),
                NpcItemSale(item_id="ale", price=10),
                NpcItemSale(item_id="beer", price=10, currency_item_id="token"),
            ],
        )

        self.assertEqual(
            [
                (sale.item_id, sale.price, sale.currency_item_id)
                for sale in npc.items_sold
            ],
            [
                ("beer", 10, None),
                ("beer", 10, None),
                ("beer", 20, None),
                ("ale", 10, None),
                ("beer", 10, "token"),
            ],
        )


if __name__ == "__main__":
    unittest.main()
