import sqlite3
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.acquisition import STAGING_FAMILIES
from compendium.redactions import closure, geometry, rekey, validate_semantics
from compendium.redactions.config import RedactionConfig
from compendium.redactions.references import resolve
from compendium.redactions.semantics import (
    InvalidPublication,
    apply_semantic_withholding,
)

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class AcquisitionRedactionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        for family in STAGING_FAMILIES:
            self.conn.execute(f'DROP TABLE "_acquisition_input_{family}"')
        self.conn.executemany(
            "INSERT INTO zones(id,zone_id,name) VALUES (?,?,?)",
            [("public", 1, "Public"), ("private", 2, "Private")],
        )
        self.conn.executemany(
            "INSERT INTO items(id,name,travel_zone_id) VALUES (?,?,NULL)",
            [(name, name) for name in ("visible", "hidden", "result", "second")],
        )
        self.conn.execute(
            "INSERT INTO quests(id,name,quest_type) VALUES ('quest','Quest','gather')"
        )

    def method(self, identity="method", kind="pack_use", rule=None):
        self.conn.execute(
            "INSERT INTO acquisition_methods(id,kind,rule_id) VALUES (?,?,?)",
            (identity, kind, rule or kind),
        )

    def output(self, method="method", item="result"):
        self.conn.execute(
            "INSERT INTO acquisition_outputs(id,method_id,ordinal,resource_kind,item_id,amount_min,amount_max,yield_rule,delivery) VALUES (?,?,0,'item',?,1,1,'fixed','inventory')",
            (f"{method}_output", method, item),
        )

    def cost(self, method="method", item="hidden", amount=7):
        self.conn.execute(
            "INSERT INTO acquisition_cost_groups(id,method_id,phase,quantity_rule,consumption_rule) VALUES (?,?,'use','fixed','on_success')",
            (f"{method}_group", method),
        )
        self.conn.execute(
            "INSERT INTO acquisition_inputs(id,cost_group_id,ordinal,resource_kind,item_id,amount,role) VALUES (?,?,3,'item',?,?,'component')",
            (f"{method}_input", f"{method}_group", item, amount),
        )

    def pool(self, identity="private_definition_hash", kind="portable_chest"):
        self.conn.execute(
            "INSERT INTO loot_pools(id,kind) VALUES (?,?)", (identity, kind)
        )
        return identity

    def entry(self, pool, ordinal, item, group, **values):
        fields = {
            "id": f"{pool}_private_{ordinal}_{item}",
            "pool_id": pool,
            "ordinal": ordinal,
            "item_id": item,
            "child_pool_id": None,
            "resolution": "direct",
            "probability": 0.25,
            "duplicate_group": group,
            "cap": 2,
            "counts_equipment": 1,
            "guaranteed_equipment_candidate": 1,
            "quest_gate": "none",
            "scales_with_treasure_hunter": 1,
            "quality": 3,
        }
        fields.update(values)
        names = ",".join(fields)
        marks = ",".join("?" for _ in fields)
        self.conn.execute(
            f"INSERT INTO loot_pool_entries({names}) VALUES ({marks})",
            tuple(fields.values()),
        )
        return fields["id"]

    def test_required_component_removal_keeps_price_position_and_phase(self):
        self.method()
        self.cost()
        self.output()
        removed = {("items", "hidden")}
        apply_semantic_withholding(self.conn, removed)
        self.conn.execute("DELETE FROM items WHERE id='hidden'")
        row = self.conn.execute(
            "SELECT i.item_id,i.withheld,i.amount,i.ordinal,g.phase,g.consumption_rule FROM acquisition_inputs i JOIN acquisition_cost_groups g ON g.id=i.cost_group_id"
        ).fetchone()
        self.assertEqual(tuple(row), (None, 1, 7, 3, "use", "on_success"))
        rekey(self.conn)
        validate_semantics(self.conn)

    def test_ordered_quest_and_skill_conjuncts_survive_withholding(self):
        self.conn.execute(
            "INSERT INTO quests(id,name,quest_type) VALUES ('predecessor','Prior','kill')"
        )
        self.conn.execute(
            "INSERT INTO quest_predecessors(id,quest_id,ordinal,predecessor_quest_id) VALUES ('private_prior','quest',2,'predecessor')"
        )
        self.conn.execute(
            "INSERT INTO quest_objectives(id,quest_id,ordinal,kind,role,amount) VALUES ('private_counter','quest',4,'item','inventory_secondary',5)"
        )
        self.conn.execute(
            "INSERT INTO quest_objective_items(id,item_id) VALUES ('private_counter','hidden')"
        )
        self.conn.executemany(
            "INSERT INTO skills(id,name,skill_type) VALUES (?,?, 'attack')",
            [("skill", "Skill"), ("prior", "Prior")],
        )
        self.conn.execute(
            "INSERT INTO skill_predecessors(id,skill_id,ordinal,predecessor_skill_id,rank) VALUES ('private_skill','skill',1,'prior',4)"
        )
        apply_semantic_withholding(
            self.conn,
            {("items", "hidden"), ("quests", "predecessor"), ("skills", "prior")},
        )
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT predecessor_quest_id,withheld,ordinal FROM quest_predecessors"
                ).fetchone()
            ),
            (None, 1, 2),
        )
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT i.item_id,o.withheld,o.amount,o.ordinal,o.role FROM quest_objective_items i JOIN quest_objectives o ON o.id=i.id"
                ).fetchone()
            ),
            (None, 1, 5, 4, "inventory_secondary"),
        )
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT predecessor_skill_id,withheld,rank,ordinal FROM skill_predecessors"
                ).fetchone()
            ),
            (None, 1, 4, 1),
        )
        rekey(self.conn)
        validate_semantics(self.conn)
        self.assertEqual(
            self.conn.execute("SELECT id FROM quest_objectives").fetchone()[0],
            self.conn.execute("SELECT id FROM quest_objective_items").fetchone()[0],
        )

    def test_class_withholding_keeps_selected_slot_and_item_restriction(self):
        self.conn.execute(
            "INSERT INTO classes(id,name,description,primary_role,difficulty,resource_type,compatible_races) VALUES ('hidden_class','Class','','damage',1,'mana','[]')"
        )
        self.conn.execute(
            "INSERT INTO quest_reward_slots(id,quest_id,ordinal,slot_kind,class_id,item_id,amount) VALUES ('private_slot','quest',2,'class','hidden_class','visible',3)"
        )
        self.conn.execute(
            "INSERT INTO item_class_requirements(id,item_id,ordinal,class_id) VALUES ('private_restriction','visible',4,'hidden_class')"
        )
        apply_semantic_withholding(self.conn, {("classes", "hidden_class")})
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT slot_kind,class_id,class_withheld,item_id,amount,ordinal FROM quest_reward_slots"
                ).fetchone()
            ),
            ("class", None, 1, "visible", 3, 2),
        )
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT class_id,withheld,ordinal FROM item_class_requirements"
                ).fetchone()
            ),
            (None, 1, 4),
        )
        rekey(self.conn)
        validate_semantics(self.conn)

    def test_missing_setup_removes_only_dependent_branch_not_provider_entity(self):
        self.conn.execute(
            "INSERT INTO chests(id,name,zone_id) VALUES ('chest','Chest','public')"
        )
        self.method("hidden_setup", "altar_activate")
        self.method("dependent", "world_chest")
        self.method("alternative", "world_chest")
        self.conn.execute(
            "UPDATE acquisition_methods SET setup_method_id='hidden_setup' WHERE id='dependent'"
        )
        for method in ("dependent", "alternative"):
            self.output(method)
            self.conn.execute(
                "INSERT INTO acquisition_providers_chests(id,method_id,chest_id) VALUES (?,?,'chest')",
                (f"{method}_branch", method),
            )
        removal = closure.Removal(
            "acquisition_methods", "hidden_setup", "manual", "withheld setup"
        )
        closure.apply(self.conn, [removal], resolve(self.conn))
        self.assertEqual(
            list(self.conn.execute("SELECT id FROM acquisition_methods")),
            [("alternative",)],
        )
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM chests").fetchone()[0], 1
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM items WHERE id='result'"
            ).fetchone()[0],
            1,
        )
        self.assertEqual(list(self.conn.execute("PRAGMA foreign_key_check")), [])

    def test_anonymous_competitors_retain_every_process_operand(self):
        pool = self.pool()
        self.entry(pool, 0, "hidden", 91, quest_gate="public_need")
        self.entry(
            pool,
            1,
            "visible",
            72,
            counts_equipment=0,
            guaranteed_equipment_candidate=0,
            scales_with_treasure_hunter=0,
            quality=1,
        )
        self.entry(pool, 2, "hidden", 91, probability=0.7)
        apply_semantic_withholding(self.conn, {("items", "hidden")})
        rows = [
            tuple(row)
            for row in self.conn.execute(
                "SELECT item_id,ordinal,probability,duplicate_group,cap,counts_equipment,guaranteed_equipment_candidate,quest_gate,scales_with_treasure_hunter,quality,withheld FROM loot_pool_entries ORDER BY ordinal"
            )
        ]
        self.assertEqual(
            rows,
            [
                (None, 0, 0.25, 0, 2, 1, 1, "withheld_need", 1, 3, 1),
                ("visible", 1, 0.25, 1, 2, 0, 0, "none", 0, 1, 0),
                (None, 2, 0.7, 0, 2, 1, 1, "none", 1, 3, 1),
            ],
        )
        # Uniform selection retains all three slots, not one surviving identity.
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM loot_pool_entries WHERE pool_id=?", (pool,)
            ).fetchone()[0],
            3,
        )
        rekey(self.conn)
        validate_semantics(self.conn)

    def test_hidden_wrapper_retains_child_process_and_wrapper_cap(self):
        parent = self.pool("private_wrapper", "monster")
        child = self.pool("private_children", "random")
        self.entry(child, 0, "visible", 13, counts_equipment=1)
        self.entry(
            parent,
            0,
            "hidden",
            45,
            child_pool_id=child,
            resolution="uniform_child",
            cap=1,
            counts_equipment=0,
        )
        apply_semantic_withholding(self.conn, {("items", "hidden")})
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT item_id,child_pool_id,cap,resolution,withheld FROM loot_pool_entries WHERE pool_id=?",
                    (parent,),
                ).fetchone()
            ),
            (None, child, 1, "uniform_child", 1),
        )
        rekey(self.conn)
        validate_semantics(self.conn)

    def test_removed_child_process_fails_instead_of_emitting_changed_odds(self):
        parent = self.pool("parent", "monster")
        child = self.pool("child", "random")
        self.entry(
            parent, 0, "visible", 1, child_pool_id=child, resolution="uniform_child"
        )
        with self.assertRaisesRegex(InvalidPublication, "removed child process"):
            apply_semantic_withholding(self.conn, {("loot_pools", child)})

    def test_provider_membership_is_the_only_reachability_bridge_to_method(self):
        self.conn.execute(
            "INSERT INTO chests(id,name,zone_id) VALUES ('chest','Chest','public')"
        )
        self.method("world", "world_chest")
        self.cost("world")
        self.output("world")
        self.conn.execute(
            "INSERT INTO acquisition_providers_chests(id,method_id,chest_id) VALUES ('branch','world','chest')"
        )
        graph = closure.build_graph(self.conn, resolve(self.conn))
        reached = graph.reach({("zones", "public")}, set())
        self.assertIn(("acquisition_providers_chests", "branch"), reached)
        self.assertIn(("acquisition_methods", "world"), reached)
        self.assertIn(("items", "result"), reached)
        self.assertNotIn(("items", "hidden"), reached)

    def test_sourceless_inventory_cycle_does_not_become_a_root(self):
        for method, source, result in (
            ("first", "visible", "second"),
            ("second", "second", "visible"),
        ):
            self.method(method)
            self.conn.execute(
                "INSERT INTO acquisition_item_details(id,item_id) VALUES (?,?)",
                (method, source),
            )
            self.conn.execute(
                "INSERT INTO acquisition_providers_items(id,method_id,item_id) VALUES (?,?,?)",
                (f"{method}_provider", method, source),
            )
            self.output(method, result)
        graph = closure.build_graph(self.conn, resolve(self.conn))
        reached = graph.reach({("zones", "public")}, set())
        self.assertNotIn(("acquisition_methods", "first"), reached)
        self.assertNotIn(("acquisition_methods", "second"), reached)
        removals, _ = closure.decide(
            self.conn, RedactionConfig(exclude_zone_ids={"private"})
        )
        self.assertNotIn("visible", {row.entity_id for row in removals})

    def test_monotonic_removal_does_not_resurrect_item_after_input_anonymization(self):
        self.conn.execute(
            "INSERT INTO monsters(id,name) VALUES ('private_monster','Private')"
        )
        self.conn.execute(
            "INSERT INTO monster_spawns(id,monster_id,zone_id) VALUES ('private_spawn','private_monster','private')"
        )
        pool = self.pool("private_loot", "monster")
        self.conn.execute(
            "UPDATE monsters SET loot_pool_id=? WHERE id='private_monster'", (pool,)
        )
        self.entry(pool, 0, "hidden", 0)
        self.conn.execute(
            "INSERT INTO chests(id,name,zone_id) VALUES ('public_chest','Public','public')"
        )
        self.method("public_method", "world_chest")
        self.cost("public_method")
        self.output("public_method")
        self.conn.execute(
            "INSERT INTO acquisition_providers_chests(id,method_id,chest_id) VALUES ('public_branch','public_method','public_chest')"
        )
        config = RedactionConfig(exclude_zone_ids={"private"})
        decided, _ = closure.decide(self.conn, config)
        removals = closure.run(self.conn, config)
        self.assertEqual(
            {(r.table, r.entity_id) for r in decided},
            {(r.table, r.entity_id) for r in removals},
        )
        self.assertIn(("items", "hidden"), {(r.table, r.entity_id) for r in removals})
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM items WHERE id='hidden'"
            ).fetchone()[0],
            0,
        )
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT item_id,withheld,amount FROM acquisition_inputs"
                ).fetchone()
            ),
            (None, 1, 7),
        )
        rekey(self.conn)
        validate_semantics(self.conn, config)

    def test_lookup_zone_is_nonproviding_and_withheld_is_not_native_zero(self):
        self.conn.execute("INSERT INTO monsters(id,name) VALUES ('monster','Monster')")
        pool = self.pool("loot", "monster")
        self.method("kill", "kill", "monster_loot")
        self.conn.execute(
            "INSERT INTO acquisition_kill_details(id,monster_id,loot_pool_id,loot_zone_number,loot_zone_id,respawn,exp_multiplier,is_boss,is_elite,is_hunt,is_summoned_pet,event_kind,gold_min,gold_max,gold_probability) VALUES ('kill','monster',?,2,'private',1,1,0,0,0,0,'authored',0,0,0)",
            (pool,),
        )
        refs = {(r.table, r.column): r for r in resolve(self.conn)}
        self.assertFalse(refs[("acquisition_kill_details", "loot_zone_id")].reaches)
        apply_semantic_withholding(self.conn, {("zones", "private")})
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT loot_zone_number,loot_zone_id,loot_zone_withheld FROM acquisition_kill_details"
                ).fetchone()
            ),
            (None, None, 1),
        )

    def test_geometry_policy_covers_normalized_location_objectives(self):
        self.conn.execute(
            "INSERT INTO quest_objectives(id,quest_id,ordinal,kind,role,amount) VALUES ('location','quest',0,'location','location_visit',NULL)"
        )
        self.conn.execute(
            "INSERT INTO quest_objective_locations(id,zone_id,position_x,position_y,min_x,max_y) VALUES ('location','private',12,34,10,40)"
        )
        config = RedactionConfig(suppress_position_zone_ids={"private"})
        geometry.run(self.conn, config)
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT position_x,position_y,min_x,max_y FROM quest_objective_locations"
                ).fetchone()
            ),
            (None, None, None, None),
        )
        rekey(self.conn)
        validate_semantics(self.conn, config)

    def test_rekey_keeps_method_detail_and_fishing_binding_identity_equal(self):
        self.method("private_method_hash", "gather", "fishing")
        pools = [
            self.pool(f"private_{role}", f"fishing_{role}")
            for role in ("primary", "trash", "fallback")
        ]
        self.conn.execute(
            "INSERT INTO loot_fishing_rules(id,primary_pool_id,trash_pool_id,fallback_pool_id,spot_tier) VALUES ('private_fishing',?,?,?,2)",
            pools,
        )
        self.conn.execute(
            "INSERT INTO acquisition_method_fishing_rules(id,method_id,fishing_rule_id) VALUES ('private_method_hash','private_method_hash','private_fishing')"
        )
        mapping = rekey(self.conn)
        method = mapping[("acquisition_methods", "private_method_hash")]
        self.assertEqual(
            tuple(
                self.conn.execute(
                    "SELECT id,method_id FROM acquisition_method_fishing_rules"
                ).fetchone()
            ),
            (method, method),
        )
        self.assertTrue(method.startswith("acquisition_methods:"))
        self.assertNotIn("private", method)
        validate_semantics(self.conn)

    def test_private_identifier_changes_cannot_change_published_internal_keys(self):
        snapshots = []
        for suffix in ("secret_one", "entirely_different_secret"):
            conn = sqlite3.connect(":memory:")
            self.addCleanup(conn.close)
            conn.executescript(
                "CREATE TABLE items(id TEXT PRIMARY KEY,name TEXT); CREATE TABLE loot_pools(id TEXT PRIMARY KEY,kind TEXT); CREATE TABLE loot_pool_entries(id TEXT PRIMARY KEY,pool_id TEXT REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,ordinal INTEGER,item_id TEXT REFERENCES items(id),child_pool_id TEXT REFERENCES loot_pools(id) DEFERRABLE INITIALLY DEFERRED,resolution TEXT,probability REAL,duplicate_group INTEGER,cap INTEGER,counts_equipment INTEGER,guaranteed_equipment_candidate INTEGER,quest_gate TEXT,scales_with_treasure_hunter INTEGER,quality INTEGER,withheld INTEGER);"
            )
            conn.execute("INSERT INTO items VALUES ('visible','Visible')")
            conn.execute(
                "INSERT INTO loot_pools VALUES (?,'portable_chest')", (suffix,)
            )
            conn.execute(
                "INSERT INTO loot_pool_entries VALUES (?,?,0,NULL,NULL,'direct',0.3,0,1,1,1,'none',1,3,1)",
                (f"{suffix}_hidden", suffix),
            )
            conn.execute(
                "INSERT INTO loot_pool_entries VALUES (?,?,1,'visible',NULL,'direct',0.4,1,2,0,0,'none',0,1,0)",
                (f"{suffix}_visible", suffix),
            )
            rekey(conn)
            snapshots.append(
                (
                    list(conn.execute("SELECT * FROM loot_pools ORDER BY id")),
                    list(
                        conn.execute("SELECT * FROM loot_pool_entries ORDER BY ordinal")
                    ),
                )
            )
        self.assertEqual(snapshots[0], snapshots[1])

    def test_publication_rejects_staging_private_keys_and_empty_requirements(self):
        self.conn.execute(
            "CREATE TABLE _acquisition_input_test(id TEXT PRIMARY KEY,payload TEXT)"
        )
        with self.assertRaisesRegex(InvalidPublication, "staging"):
            validate_semantics(self.conn)
        self.conn.execute("DROP TABLE _acquisition_input_test")
        self.method("private_hash")
        with self.assertRaisesRegex(InvalidPublication, "noncanonical identity"):
            validate_semantics(self.conn)
        self.conn.execute(
            "INSERT INTO acquisition_cost_groups(id,method_id,phase,quantity_rule,consumption_rule) VALUES ('empty','private_hash','use','fixed','on_success')"
        )
        rekey(self.conn)
        with self.assertRaisesRegex(InvalidPublication, "empty accidental requirement"):
            validate_semantics(self.conn)


if __name__ == "__main__":
    unittest.main()
