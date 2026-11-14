import gzip
import json
import sqlite3
import tomllib

import pytest
from acquisition_fixtures import database
from test_chambers import export as chambers_export

from compendium.redactions import challenge, closure
from compendium.redactions.challenge import (
    ChallengePolicyError,
    Scanner,
    WithheldContentSurvives,
    check_database,
    database_findings,
    parse_policy,
    require_policy,
    seeds,
    signatures,
    verify_surfaces,
)
from compendium.redactions.config import RedactionConfig, load_redactions
from compendium.utils.paths import get_repo_root

CLOSED: dict[str, frozenset[str]] = {
    "riddles": frozenset(),
    "rune_puzzles": frozenset(),
}
RAW = chambers_export()
QUESTION = RAW["riddles"][0]["question"]
CLUE = RAW["rune_puzzles"][0]["clue"]


def scanner(policy=CLOSED):
    return Scanner(signatures(RAW, policy))


def schema_conn(tmp_path):
    conn = database(tmp_path)
    conn.executescript(
        """
        INSERT INTO zones(id,zone_id,name) VALUES ('chambers_of_chaos',26,'Chambers of Chaos');
        INSERT INTO npcs(id,name) VALUES ('keeper','Keeper');
        INSERT INTO chambers_definitions VALUES
          ('chambers_of_chaos','chambers_of_chaos','keeper',3,1200,40,3,20,30,2,3,'Guardian');
        """
    )
    for riddle in RAW["riddles"]:
        conn.execute(
            "INSERT INTO chambers_riddles VALUES (?,?,?,?,?,?)",
            (
                "r0",
                "chambers_of_chaos",
                0,
                riddle["question"],
                json.dumps(riddle["choices"]),
                riddle["correct_answer_index"],
            ),
        )
    for puzzle in RAW["rune_puzzles"]:
        conn.execute(
            "INSERT INTO chambers_rune_puzzles VALUES (?,?,?,?,?,?,?)",
            (
                "p0",
                "chambers_of_chaos",
                0,
                puzzle["title"],
                puzzle["clue"],
                json.dumps(puzzle["rune_words"]),
                json.dumps(puzzle["solution_order"]),
            ),
        )
    return conn


# --- the policy ------------------------------------------------------------


def test_the_committed_policy_is_closed_for_both_families():
    path = get_repo_root() / "redactions.toml"
    policy = parse_policy(tomllib.loads(path.read_text()))
    assert policy == CLOSED
    assert load_redactions().challenge_policy == CLOSED


def test_a_missing_policy_publishes_nothing_and_fails_the_build():
    policy = parse_policy({})
    assert policy == {}
    assert challenge.permitted(policy, "riddles") == frozenset()
    with pytest.raises(ChallengePolicyError, match="needs a"):
        require_policy(policy)
    with pytest.raises(ChallengePolicyError):
        require_policy({"riddles": frozenset()})


@pytest.mark.parametrize(
    "section",
    [
        {"riddles": {"permitted_fields": ["question", "hint"]}},
        {"riddles": {}},
        {"riddles": {"permitted_fields": "question"}},
        {"puzzles": {"permitted_fields": []}},
        {"rune_puzzles": {"permitted_fields": ["solution"]}},
    ],
)
def test_an_invalid_or_unknown_entry_fails_instead_of_opening_a_field(section):
    with pytest.raises(ChallengePolicyError):
        parse_policy({"challenges": section})


def test_a_field_is_permitted_only_when_named():
    policy = parse_policy(
        {
            "challenges": {
                "riddles": {"permitted_fields": ["question"]},
                "rune_puzzles": {"permitted_fields": []},
            }
        }
    )
    assert policy["riddles"] == {"question"}
    assert challenge.permitted(policy, "rune_puzzles") == frozenset()


# --- shared removal accounting ---------------------------------------------


def test_a_closed_family_is_removed_through_the_closure_and_recorded(tmp_path):
    conn = schema_conn(tmp_path)
    config = RedactionConfig(challenge_policy=CLOSED)
    removals, _ = closure.decide(conn, config)
    assert {(r.table, r.entity_id, r.mechanism) for r in removals} >= {
        ("chambers_riddles", "r0", "challenge_gate"),
        ("chambers_rune_puzzles", "p0", "challenge_gate"),
    }
    # The zone and its definition stay public.
    assert not [r for r in removals if r.table in ("zones", "chambers_definitions")]
    closure.run(conn, config)
    assert conn.execute("SELECT count(*) FROM chambers_riddles").fetchone() == (0,)
    assert conn.execute("SELECT count(*) FROM chambers_rune_puzzles").fetchone() == (0,)
    assert conn.execute("SELECT count(*) FROM chambers_definitions").fetchone() == (1,)


def test_an_open_family_keeps_rows_and_clears_the_other_fields(tmp_path):
    conn = schema_conn(tmp_path)
    policy = {"riddles": frozenset({"question"}), "rune_puzzles": frozenset({"title"})}
    assert seeds(conn, policy) == []
    cleared = challenge.clear(conn, policy)
    assert cleared == {"riddles": 2, "rune_puzzles": 3}
    assert conn.execute(
        "SELECT question,choices,correct_answer_index FROM chambers_riddles"
    ).fetchone() == (QUESTION, None, None)
    assert conn.execute(
        "SELECT title,clue,rune_words,solution_order FROM chambers_rune_puzzles"
    ).fetchone() == ("Borrowed Dawn", None, None, None)


def test_every_row_of_a_closed_family_is_a_seed(tmp_path):
    conn = schema_conn(tmp_path)
    assert seeds(conn, CLOSED) == [
        ("chambers_riddles", "r0"),
        ("chambers_rune_puzzles", "p0"),
    ]


# --- the output gate -------------------------------------------------------


def test_the_database_scan_finds_rows_fields_and_text_anywhere(tmp_path):
    conn = schema_conn(tmp_path)
    found = {(f.table, f.column) for f in database_findings(conn, CLOSED, scanner())}
    assert ("chambers_riddles", "") in found
    # A copy in an unrelated description column is found as well.
    conn.execute("UPDATE zones SET name = ?", (f"Zone. {QUESTION}",))
    found = {(f.table, f.column) for f in database_findings(conn, CLOSED, scanner())}
    assert ("zones", "name") in found


def test_a_published_field_that_the_policy_withholds_is_a_finding(tmp_path):
    conn = schema_conn(tmp_path)
    policy = {"riddles": frozenset({"question"}), "rune_puzzles": frozenset()}
    findings = database_findings(conn, policy, scanner(policy))
    assert ("chambers_riddles", "choices") in {(f.table, f.column) for f in findings}
    assert ("chambers_riddles", "question") not in {
        (f.table, f.column) for f in findings
    }


def test_a_clean_database_passes_and_check_database_raises_otherwise(tmp_path):
    conn = schema_conn(tmp_path)
    session = tmp_path / "session"
    session.mkdir()
    (session / "chambers_of_chaos.json").write_text(json.dumps(RAW))
    with pytest.raises(WithheldContentSurvives, match="published values hold"):
        check_database(conn, CLOSED, session)
    closure.run(conn, RedactionConfig(challenge_policy=CLOSED))
    conn.execute("UPDATE zones SET name='Chambers of Chaos'")
    check_database(conn, CLOSED, session)


def test_generic_trial_text_is_not_a_finding():
    generic = (
        "Riddle: answer the keeper's question. A wrong answer summons guards. "
        "Runes: touch the runes in the right order. Manuscript: read the page once."
    )
    assert scanner().labels(generic) == []


def test_withheld_text_is_found_in_collapsed_markup_payloads_and_scripts():
    html = f"<details><summary>Hint</summary><p>{QUESTION}</p></details>"
    assert scanner().labels(html)
    payload = json.dumps({"data": {"clue": CLUE}})
    assert scanner().labels(payload)
    assert scanner().labels('const q="' + json.dumps(QUESTION)[1:-1] + '";')
    entity = QUESTION.replace("?", "&#63;").replace("What", "Wh&#97;t")
    assert scanner().labels(f"<p>{entity}</p>")
    assert scanner().labels(f"<p>{QUESTION.upper()}</p>")


def test_choices_and_rune_orders_match_as_ordered_lists_only():
    choices = RAW["riddles"][0]["choices"]
    assert scanner().labels(json.dumps(choices))
    assert scanner().labels("<li>Man</li><li>Wind</li><li>Stone</li><li>Fire</li>")
    assert not scanner().labels("<li>Wind</li><li>Man</li><li>Fire</li><li>Stone</li>")
    assert scanner().labels(json.dumps(["Flint", "Spark", "Smoke", "Dawn"]))
    # One word on its own proves nothing.
    assert not scanner().labels("Flint")


def test_a_title_is_found_standing_alone_and_not_inside_prose():
    assert scanner().labels("<h3>Borrowed Dawn</h3>")
    assert scanner().labels('{"title":"Borrowed Dawn"}')
    assert not scanner().labels("A knight sought the borrowed dawn of an old tale.")


def test_a_permitted_field_is_not_searched_for():
    policy = {"riddles": frozenset({"question"}), "rune_puzzles": frozenset({"title"})}
    assert not scanner(policy).labels(f"<p>{QUESTION}</p><h3>Borrowed Dawn</h3>")
    assert scanner(policy).labels(f"<p>{CLUE}</p>")


def test_surfaces_cover_the_database_compressed_copies_search_and_bundles(tmp_path):
    session = tmp_path / "session"
    session.mkdir()
    (session / "chambers_of_chaos.json").write_text(json.dumps(RAW))
    site = tmp_path / "website"
    (site / "data").mkdir(parents=True)
    (site / ".svelte-kit/output/client/_app/immutable").mkdir(parents=True)
    (site / ".svelte-kit/output/prerendered/pages").mkdir(parents=True)
    sqlite3.connect(site / "data/compendium.db").close()
    clean = verify_surfaces(site, session, CLOSED)
    assert clean[0] == []
    assert "build output" not in clean[1]

    leak = f"<p>{QUESTION}</p>"
    (site / "data/compendium.db.gz").write_bytes(gzip.compress(leak.encode()))
    (site / "data/search-index.json").write_text(json.dumps({"t": CLUE}))
    (site / ".svelte-kit/output/client/_app/immutable/bundle.js").write_text(
        f"export default {json.dumps(RAW['riddles'][0]['choices'])};"
    )
    (site / ".svelte-kit/output/client/_app/immutable/copy.gz").write_bytes(
        gzip.compress(json.dumps(CLUE).encode())
    )
    (site / ".svelte-kit/output/prerendered/pages/a.html").write_text(
        "<details><p>" + CLUE + "</p></details>"
    )
    surfaces = {f.table for f in verify_surfaces(site, session, CLOSED)[0]}
    assert surfaces == {
        "compressed browser database",
        "search index",
        "build output",
    }
    names = {
        f.row
        for f in verify_surfaces(site, session, CLOSED)[0]
        if f.table == "build output"
    }
    assert names == {
        "client/_app/immutable/bundle.js",
        "client/_app/immutable/copy.gz",
        "prerendered/pages/a.html",
    }
