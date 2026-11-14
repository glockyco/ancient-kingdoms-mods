import json

import pytest
from acquisition_fixtures import database, item, normalizer

from compendium.denormalizers.acquisition import derive
from compendium.loaders.core import load_items


def chain():
    return [
        item("catalyst", item_type="augment_upgrade"),
        item(
            "epic",
            item_type="augment",
            quality=3,
            augment_is_defensive=True,
            augment_next_quality_id="legendary",
        ),
        item("legendary", item_type="augment", quality=4, augment_is_defensive=True),
    ]


def test_item_loader_preserves_upgrade_type_and_nullable_link(tmp_path):
    conn = database(tmp_path)
    (tmp_path / "items.json").write_text(json.dumps(chain()))
    load_items(conn, tmp_path)
    assert conn.execute(
        "SELECT id,item_type,augment_next_quality_id FROM items ORDER BY id"
    ).fetchall() == [
        ("catalyst", "augment_upgrade", None),
        ("epic", "augment", "legendary"),
        ("legendary", "augment", None),
    ]


def test_upgrade_has_one_group_two_consumed_inputs_and_one_inventory_result(tmp_path):
    conn = database(tmp_path)
    normalizer(conn, items=chain()).item_definitions()
    method = conn.execute(
        "SELECT id FROM acquisition_methods WHERE kind='augment_upgrade'"
    ).fetchone()[0]
    assert conn.execute(
        "SELECT catalyst_item_id,predecessor_item_id FROM acquisition_augment_upgrade_details WHERE id=?",
        (method,),
    ).fetchone() == ("catalyst", "epic")
    assert conn.execute(
        "SELECT i.item_id,i.amount,i.role,g.phase,g.consumption_rule FROM acquisition_inputs i "
        "JOIN acquisition_cost_groups g ON g.id=i.cost_group_id WHERE g.method_id=? ORDER BY i.ordinal",
        (method,),
    ).fetchall() == [
        ("catalyst", 1, "catalyst", "use", "on_success"),
        ("epic", 1, "target", "use", "on_success"),
    ]
    assert conn.execute(
        "SELECT item_id,amount_min,amount_max,delivery FROM acquisition_outputs WHERE method_id=?",
        (method,),
    ).fetchall() == [("legendary", 1, 1, "inventory")]
    derive(conn)
    assert conn.execute(
        "SELECT rooted FROM acquisition_methods WHERE id=?", (method,)
    ).fetchone() == (0,)


@pytest.mark.parametrize(
    "changes",
    [
        {"quality": 4},
        {"item_type": "equipment"},
        {"augment_is_defensive": False},
    ],
)
def test_invalid_exported_upgrade_link_fails(tmp_path, changes):
    definitions = chain()
    definitions[1].update(changes)
    conn = database(tmp_path)
    with pytest.raises(ValueError, match="Invalid augment upgrade link"):
        normalizer(conn, items=definitions).item_definitions()


def test_catalyst_root_does_not_root_upgrade_without_predecessor(tmp_path):
    conn = database(tmp_path)
    n = normalizer(conn, items=chain())
    n.item_definitions()
    conn.executescript("""
        INSERT INTO npcs(id,name) VALUES ('merchant','Merchant');
        INSERT INTO npc_spawns(id,npc_id,zone_id) VALUES ('merchant-spawn','merchant','zone');
        INSERT INTO acquisition_methods(id,kind,rule_id) VALUES ('root','vendor','vendor');
        INSERT INTO acquisition_vendor_details(id,npc_id,offered_item_id) VALUES ('root','merchant','catalyst');
        INSERT INTO acquisition_providers_npcs(id,method_id,npc_id) VALUES ('root-provider','root','merchant');
        INSERT INTO acquisition_outputs(id,method_id,ordinal,resource_kind,item_id,amount_min,amount_max,yield_rule,delivery)
        VALUES ('root-output','root',0,'item','catalyst',1,1,'fixed','inventory');
    """)
    derive(conn)
    assert conn.execute(
        "SELECT rooted FROM acquisition_methods WHERE kind='augment_upgrade'"
    ).fetchone() == (0,)
