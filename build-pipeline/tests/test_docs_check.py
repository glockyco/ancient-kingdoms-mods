"""Documentation checks use only a checkout, including in the CLI."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest
import typer
from typer.testing import CliRunner

from compendium.cli import app
from compendium.commands import docs
from compendium.docs import Finding, check
from compendium.docs.markdown import heading_slugs, visible_word_count


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    subprocess.run(["git", "init", "--quiet", str(tmp_path)], check=True)
    files = {
        "README.md": "# Project\n[Contributor](CONTRIBUTING.md) [Architecture](ARCHITECTURE.md)\n[Download](https://example.org/mods/Example.dll)\n",
        "CONTRIBUTING.md": "# Contributor\n",
        "ARCHITECTURE.md": "# Architecture\n",
        "mods/README.md": "[Example](Example/README.md)\n",
        "mods/Example/README.md": "# Example\n",
        "mods/Example/Example.csproj": "<Project />\n",
        "build-tool/Commands/CommandCatalog.cs": 'new("build", "Build", Command<Build>()),\nnew("deploy", "Deploy", Command<Deploy>()),\n',
        "package.json": json.dumps(
            {"scripts": {"check": "echo check", "build": "echo build"}}
        ),
        "website/package.json": json.dumps(
            {"scripts": {"build": "echo build", "site-only": "echo site"}}
        ),
        "website/mod-downloads.json": json.dumps({"mods": [{"project": "Example"}]}),
        "website/src/example.ts": "export {};\n",
        ".gitignore": "Local.props\nwebsite/data/\n",
        "Local.props.example": "example\n",
        "docs/target.md": "# Hello, **World**!\n# Hello, **World**!\n# Hello, **World**!\n# Under_score\n# [Linked](../README.md) `code`\nTitle\n=====\n```md\n# Fake heading\n```\n",
    }
    for relative, text in files.items():
        write_file(tmp_path, relative, text)
    track(tmp_path)
    return tmp_path


def write_file(root: Path, relative: str, text: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def track(root: Path) -> None:
    subprocess.run(["git", "add", "."], cwd=root, check=True)


def add_document(root: Path, text: str) -> list[Finding]:
    write_file(root, "docs/check.md", text)
    track(root)
    return check(root)


def test_valid_repository(repo: Path) -> None:
    assert check(repo) == []


@pytest.mark.parametrize(
    "text",
    [
        "[Target](target.md)\n",
        "![Target](target.md)\n",
        "[Target][reference]\n[reference]: target.md 'Title'\n",
        "![Target][reference]\n[reference]: <target.md>\n",
        "[reference][]\n[reference]: target.md\n",
        "[reference]\n[reference]: target.md\n",
        '<a href="target.md">Target</a>\n',
        "<img src='target.md'>\n",
        "<img src=target.md>\n",
        "[Directory](../mods/)\n",
        "[Target](target.md#hello-world)\n",
        "[Target](target.md#hello-world-1)\n",
        "[Target](target.md#hello-world-2)\n",
        "[Target](target.md#under_score)\n",
        "[Target](target.md#linked-code)\n",
        "[Target](target.md#title)\n",
        "# Local\n[Here](#local)\n",
        "[Target](./target.md?raw=true#hello-world)\n",
        "[Remote](https://example.invalid/missing#missing)\n",
        "[Remote](//example.invalid/missing#missing)\n",
        "[Mail](mailto:missing@example.invalid)\n",
        "[Custom](custom:missing)\n",
        "```md\n[Missing](missing.md)\n```\n",
        "<!-- [Missing](missing.md) -->\n",
        "`[Missing](missing.md)`\n",
    ],
)
def test_links_and_exemptions_pass(repo: Path, text: str) -> None:
    assert add_document(repo, text) == []


@pytest.mark.parametrize(
    ("text", "problem"),
    [
        ("[Missing](missing.md)\n", "unresolved link: missing.md"),
        ("![Missing](missing.png)\n", "unresolved link: missing.png"),
        ("[Missing][ref]\n[ref]: missing.md\n", "unresolved link: missing.md"),
        ("![Missing][ref]\n[ref]: missing.png\n", "unresolved link: missing.png"),
        ("[Missing][ref]\n", "undefined reference: ref"),
        ('<a href="missing.md">Missing</a>\n', "unresolved link: missing.md"),
        ("<img src='missing.png'>\n", "unresolved link: missing.png"),
        ("[Missing](target.md#removed)\n", "unresolved anchor: target.md#removed"),
        (
            "[Fake](target.md#fake-heading)\n",
            "unresolved anchor: target.md#fake-heading",
        ),
        (
            "[Fourth](target.md#hello-world-3)\n",
            "unresolved anchor: target.md#hello-world-3",
        ),
        ("# Local\n[Missing](#removed)\n", "unresolved anchor: #removed"),
    ],
)
def test_broken_links_fail(repo: Path, text: str, problem: str) -> None:
    assert any(finding.problem == problem for finding in add_document(repo, text))


@pytest.mark.parametrize(
    "text",
    [
        "`website/src/example.ts`\n",
        "`website/src/`\n",
        "`package.json`\n",
        "`./website/src/example.ts`\n",
        "`website/src/example.ts:12`\n",
        "`website/src/example.ts:Member`\n",
        "`website/data/compendium.db`\n",
        "`website/<Project>/missing.ts`\n",
        "`website/src/*.ts`\n",
        "`website/src/missing*.ts`\n",
        "`https://example.invalid/website/missing.ts`\n",
        "`untracked-top-level/missing.ts`\n",
        "```sh\ncat website/src/example.ts\n```\n",
        "```bash\ncat website/data/generated.db\n```\n",
        "```shell\ncat website/src/*.ts\n```\n",
        "```python\nwebsite/missing.ts\n```\n",
        "<!-- `website/missing.ts` -->\n",
    ],
)
def test_repository_paths_and_exemptions_pass(repo: Path, text: str) -> None:
    assert add_document(repo, text) == []


@pytest.mark.parametrize(
    "text",
    [
        "`website/missing.ts`\n",
        "```sh\ncat website/missing.ts\n```\n",
        "```bash\ncat website/missing.ts:Member\n```\n",
        "```shell\ncat website/missing.ts\n```\n",
    ],
)
def test_repository_paths_fail(repo: Path, text: str) -> None:
    assert any(
        "unresolved repository path:" in finding.problem
        for finding in add_document(repo, text)
    )


def test_untracked_existing_path_does_not_resolve(repo: Path) -> None:
    write_file(repo, "docs/check.md", "`website/untracked.ts`\n")
    track(repo)
    write_file(repo, "website/untracked.ts", "exists but not tracked\n")
    assert check(repo) == [
        Finding("docs/check.md", 1, "unresolved repository path: website/untracked.ts")
    ]


def test_untracked_root_file_is_not_a_path_candidate(repo: Path) -> None:
    assert add_document(repo, "`Local.props`\n") == []


def test_missing_directory_matched_by_directory_ignore_rule_resolves(
    repo: Path,
) -> None:
    assert not (repo / "website/data").exists()
    assert add_document(repo, "`website/data/`\n") == []


def test_path_after_cd_resolves_relative_to_that_directory(repo: Path) -> None:
    write_file(repo, "website/mods/tool.mjs", "export {};\n")
    assert add_document(repo, "```sh\n(cd website && node mods/tool.mjs)\n```\n") == []


def test_path_after_cd_still_fails_when_missing_everywhere(repo: Path) -> None:
    findings = add_document(repo, "```sh\n(cd website && node mods/missing.mjs)\n```\n")
    assert [finding.problem for finding in findings] == [
        "unresolved repository path: mods/missing.mjs)"
    ]


@pytest.mark.parametrize(
    "command",
    [
        "build-tool build",
        "build-tool deploy --flag",
        "dotnet run --project build-tool build",
        "pnpm check",
        "pnpm --filter website site-only",
        "pnpm -C website site-only",
        "pnpm install",
        "pnpm i",
        "pnpm exec missing-executable",
        "pnpm add missing-package",
        "pnpm dlx missing-package",
        "pnpm test --run",
        "pnpm run check",
        "pnpm run",
        "compendium build",
        "uv run compendium docs check",
        "compendium citations sync --game-version <version>",
        "compendium classes check-races",
        "compendium redactions explain entity",
        "compendium --help",
        "build-tool <verb>",
        "pnpm <script>",
        "compendium <command>",
    ],
)
def test_commands_pass(repo: Path, command: str) -> None:
    assert add_document(repo, f"`{command}`\n```sh\n{command}\n```\n") == []


@pytest.mark.parametrize(
    ("command", "problem"),
    [
        ("build-tool retired", "unknown build-tool verb: retired"),
        ("pnpm retired", "unknown pnpm script: retired"),
        ("pnpm --filter website retired", "unknown pnpm script: retired"),
        ("pnpm -C website retired", "unknown pnpm script: retired"),
        ("pnpm --filter website check", "unknown pnpm script: check"),
        ("pnpm -C website check", "unknown pnpm script: check"),
        ("pnpm run retired", "unknown pnpm script: retired"),
        ("compendium retired", "unknown compendium command: retired"),
        (
            "compendium citations retired",
            "unknown compendium command: citations retired",
        ),
        ("compendium docs retired", "unknown compendium command: docs retired"),
    ],
)
def test_commands_fail(repo: Path, command: str, problem: str) -> None:
    assert Finding("docs/check.md", 1, problem) in add_document(repo, f"`{command}`\n")


def test_compendium_commands_are_introspected(
    repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    temporary = typer.Typer()

    @temporary.callback()
    def callback() -> None:
        pass

    @temporary.command("registered")
    def registered() -> None:
        pass

    monkeypatch.setattr("compendium.cli.app", temporary)
    assert add_document(repo, "`compendium registered`\n") == []
    assert Finding(
        "docs/check.md", 1, "unknown compendium command: build"
    ) in add_document(repo, "`compendium build`\n")


def test_openspec_is_excluded(repo: Path) -> None:
    write_file(
        repo,
        "openspec/changes/example/design.md",
        "[Missing](missing.md) `website/missing.ts` `build-tool retired`\n",
    )
    track(repo)
    assert check(repo) == []


def test_untracked_markdown_is_excluded(repo: Path) -> None:
    write_file(repo, "untracked.md", "[Missing](missing.md)\n")
    assert check(repo) == []


def test_mod_project_requires_readme(repo: Path) -> None:
    (repo / "mods/Example/README.md").unlink()
    assert Finding(
        "mods/Example/README.md", 1, "mod project is missing README.md"
    ) in check(repo)


def test_mod_catalogue_requires_link(repo: Path) -> None:
    write_file(repo, "mods/README.md", "# Mods\n")
    assert check(repo) == [
        Finding("mods/README.md", 1, "missing mod README link: mods/Example/README.md")
    ]


def test_non_project_mod_directory_needs_no_readme(repo: Path) -> None:
    write_file(repo, "mods/NotProject/example.cs", "example\n")
    track(repo)
    assert check(repo) == []


@pytest.mark.parametrize("guide", ["CONTRIBUTING.md", "ARCHITECTURE.md"])
def test_front_page_requires_guide_link(repo: Path, guide: str) -> None:
    text = (repo / "README.md").read_text(encoding="utf-8")
    text = text.replace(f"({guide})", "(mods/README.md)")
    write_file(repo, "README.md", text)
    assert check(repo) == [Finding("README.md", 1, f"missing guide link: {guide}")]


@pytest.mark.parametrize(("words", "fails"), [(999, False), (1000, True)])
def test_visible_word_budget(repo: Path, words: int, fails: bool) -> None:
    text = (repo / "README.md").read_text(encoding="utf-8")
    text += " word" * (words - visible_word_count(text))
    write_file(repo, "README.md", text)
    findings = check(repo)
    assert bool(findings) is fails
    if fails:
        assert findings == [
            Finding(
                "README.md",
                1,
                "front page has 1000 visible words; budget is under 1000",
            )
        ]


def test_visible_words_exclude_hidden_markup() -> None:
    text = """# Visible title
[Link words](https://example.invalid/many-hidden-words)
[Reference words][ref]
[ref]: https://example.invalid/hidden
![Invisible image words](hidden.png)
![Invisible reference words][ref]
<!-- invisible comment words -->
```sh
invisible code words
```
~~~bash
invisible code words
~~~
<table><tr><td>HTML words</td></tr></table>
| Left | Right |
| :--- | ---: |
| value | 123 |
--- *** !!!
"""
    assert visible_word_count(text) == 12


def test_missing_download_fails(repo: Path) -> None:
    text = (repo / "README.md").read_text(encoding="utf-8")
    write_file(
        repo, "README.md", text.replace("/mods/Example.dll", "/other/Example.dll")
    )
    assert check(repo) == [
        Finding("README.md", 1, "missing published mod download: Example")
    ]


def test_unpublished_download_fails(repo: Path) -> None:
    with (repo / "README.md").open("a", encoding="utf-8") as output:
        output.write("[Other](https://example.org/mods/Other.dll)\n")
    assert check(repo) == [
        Finding(
            "README.md",
            4,
            "unpublished mod download: https://example.org/mods/Other.dll",
        )
    ]


def test_download_selection_is_read_from_manifest(repo: Path) -> None:
    write_file(repo, "website/mod-downloads.json", '{"mods": [{"project": "Other"}]}')
    problems = {finding.problem for finding in check(repo)}
    assert problems == {
        "missing published mod download: Other",
        "unpublished mod download: https://example.org/mods/Example.dll",
    }


def test_slug_collision_and_inline_markup() -> None:
    assert heading_slugs("# A\n# A\n# A-1\n# A\n# **Bold** _em_ `code`\n") == {
        "a",
        "a-1",
        "a-1-1",
        "a-2",
        "bold-em-code",
    }


@pytest.mark.parametrize("fails", [False, True])
def test_cli_without_config_and_output(
    repo: Path, monkeypatch: pytest.MonkeyPatch, fails: bool
) -> None:
    monkeypatch.setattr(docs, "get_repo_root", lambda: repo)
    assert not (repo / "config.toml").exists()
    if fails:
        write_file(repo, "z.md", "[Bad](gone.md)\n")
        write_file(repo, "a.md", "# A\n[Bad](gone.md)\n")
        track(repo)
    result = CliRunner().invoke(app, ["docs", "check"])
    assert result.exit_code == int(fails), result.output
    expected = (
        "a.md:2: unresolved link: gone.md\nz.md:1: unresolved link: gone.md\n"
        if fails
        else ""
    )
    expected += f"{2 if fails else 0} documentation problem(s).\nSee .agent/skills/project-documentation/SKILL.md for where each fact belongs.\n"
    assert result.output == expected


def test_escaped_and_nested_link_destinations(repo: Path) -> None:
    write_file(repo, "docs/with (space).md", "# Heading\n")
    track(repo)
    assert add_document(repo, "[File](<with (space).md#heading>)\n") == []
    assert add_document(repo, r"[File](with%20\(space\).md#heading)" + "\n") == []


def test_nested_targets_do_not_count_as_visible_words() -> None:
    assert (
        visible_word_count("[Visible words](https://example.invalid/(hidden words))")
        == 2
    )
    assert (
        visible_word_count("![Hidden image](https://example.invalid/(hidden words))")
        == 0
    )


def test_heading_code_preserves_underscores() -> None:
    assert heading_slugs("# `_code_` and _emphasis_\n") == {"_code_-and-emphasis"}


def test_root_file_member_suffix_resolves(repo: Path) -> None:
    assert add_document(repo, "`package.json:Member` `package.json:12`\n") == []
