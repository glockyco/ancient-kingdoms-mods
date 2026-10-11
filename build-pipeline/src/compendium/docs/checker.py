"""Check tracked documentation against repository references and structure."""

from __future__ import annotations

import itertools
import json
import posixpath
import re
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit

from typer.core import TyperGroup
from typer.main import get_command

from compendium.docs.markdown import (
    Link,
    code_examples,
    heading_slugs,
    links,
    visible_word_count,
)


@dataclass(frozen=True, order=True)
class Finding:
    path: str
    line: int
    problem: str


_PNPM_BUILTINS = frozenset(
    [
        "add",
        "approve-builds",
        "audit",
        "bin",
        "config",
        "create",
        "dedupe",
        "deploy",
        "dlx",
        "env",
        "exec",
        "fetch",
        "help",
        "i",
        "import",
        "init",
        "install",
        "link",
        "list",
        "ll",
        "ln",
        "ls",
        "outdated",
        "pack",
        "patch",
        "patch-commit",
        "patch-remove",
        "prune",
        "publish",
        "rebuild",
        "remove",
        "rm",
        "root",
        "run",
        "server",
        "setup",
        "store",
        "test",
        "unlink",
        "uninstall",
        "up",
        "update",
        "why",
        "completion",
        "self-update",
        "doctor",
        "licenses",
        "view",
    ]
)


def _git(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=root, check=True, capture_output=True, text=True
    ).stdout


def _command_tree(command: object) -> dict[str, dict]:
    if isinstance(command, TyperGroup):
        return {name: _command_tree(child) for name, child in command.commands.items()}
    return {}


def _scripts(root: Path, relative: str) -> set[str]:
    return set(
        json.loads((root / relative).read_text(encoding="utf-8")).get("scripts", {})
    )


def _tokens(text: str) -> list[str]:
    try:
        return shlex.split(text, comments=True)
    except ValueError:
        return text.split()


def _path_token(token: str) -> str | None:
    token = token.strip("`'\"(),;[]{}")
    if (
        not token
        or any(char in token for char in "<>*")
        or re.match(r"[A-Za-z][\w+.-]*://", token)
        or token.startswith("//")
    ):
        return None
    token = re.sub(r":[A-Za-z_0-9][\w.\-]*$", "", token)
    path = posixpath.normpath(token.removeprefix("./"))
    # Git matches a directory-only ignore rule such as `/data/` against a path
    # that does not exist only when the path keeps its trailing slash.
    return path + "/" if token.endswith("/") and path != "." else path


class Checker:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.tracked = set(_git(root, "ls-files", "-z").rstrip("\0").split("\0")) - {""}
        self.top_level = {path.split("/", 1)[0] for path in self.tracked}
        self.documents = sorted(
            path
            for path in _git(root, "ls-files", "-z", "*.md").rstrip("\0").split("\0")
            if path and not path.startswith("openspec/")
        )
        self.verbs = set(
            re.findall(
                r'\bnew\s*\(\s*"([^"]+)"',
                (root / "build-tool/Commands/CommandCatalog.cs").read_text(
                    encoding="utf-8"
                ),
            )
        )
        self.root_scripts = _scripts(root, "package.json")
        self.website_scripts = _scripts(root, "website/package.json")
        from compendium.cli import app

        self.commands = _command_tree(get_command(app))
        self.findings: set[Finding] = set()
        self.anchors: dict[Path, set[str]] = {}
        self.resolved_paths: dict[str, bool] = {}

    def _report(self, path: str, line: int, problem: str) -> None:
        self.findings.add(Finding(path, line, problem))

    def _link_path(self, document: str, target: str) -> Path | None:
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc:
            return None
        return (
            (self.root / document).parent / unquote(parsed.path)
            if parsed.path
            else self.root / document
        )

    def _check_link(self, document: str, link: Link) -> None:
        if link.target.startswith("[undefined reference:"):
            self._report(document, link.line, link.target.strip("[]"))
            return
        target = self._link_path(document, link.target)
        if target is None:
            return
        if not target.exists():
            self._report(document, link.line, f"unresolved link: {link.target}")
            return
        anchor = unquote(urlsplit(link.target).fragment)
        if anchor and target.suffix.lower() == ".md":
            if target not in self.anchors:
                self.anchors[target] = heading_slugs(target.read_text(encoding="utf-8"))
            if anchor not in self.anchors[target]:
                self._report(document, link.line, f"unresolved anchor: {link.target}")

    def _path_resolves(self, token: str) -> bool:
        if token not in self.resolved_paths:
            tracked = token in self.tracked or any(
                path.startswith(token.rstrip("/") + "/") for path in self.tracked
            )
            ignored = False
            if not tracked:
                result = subprocess.run(
                    ["git", "check-ignore", "--quiet", "--", token],
                    cwd=self.root,
                    check=False,
                )
                if result.returncode not in (0, 1):
                    raise RuntimeError(f"git check-ignore failed for {token}")
                ignored = result.returncode == 0
            self.resolved_paths[token] = tracked or ignored
        return self.resolved_paths[token]

    def _check_paths(self, document: str, line: int, tokens: list[str]) -> None:
        # A command such as `(cd website && node scripts/x.mjs)` names paths relative
        # to the directory it changes into, so those directories also resolve a path.
        bases = [
            base
            for previous, token in itertools.pairwise(tokens)
            if previous.lstrip("(") == "cd" and (base := _path_token(token)) is not None
        ]
        for token in tokens:
            path = _path_token(token)
            if (
                path is not None
                and path.split("/", 1)[0] in self.top_level
                and not self._path_resolves(path)
                and not any(
                    self._path_resolves(posixpath.join(base, path)) for base in bases
                )
            ):
                self._report(document, line, f"unresolved repository path: {token}")

    def _check_commands(self, document: str, line: int, tokens: list[str]) -> None:
        for index, token in enumerate(tokens):
            if token not in {"build-tool", "pnpm", "compendium"}:
                continue
            args = tokens[index + 1 :]
            if not args or not re.fullmatch(r"[\w:-]+", args[0]):
                continue
            if token != "pnpm" and args[0].startswith("-"):
                continue
            if token == "build-tool":
                if args[0] not in self.verbs:
                    self._report(document, line, f"unknown build-tool verb: {args[0]}")
            elif token == "pnpm":
                self._check_pnpm(document, line, args)
            elif args[0] not in self.commands:
                self._report(document, line, f"unknown compendium command: {args[0]}")
            elif (
                self.commands[args[0]]
                and len(args) > 1
                and re.fullmatch(r"[\w-]+", args[1])
                and args[1] not in self.commands[args[0]]
            ):
                self._report(
                    document, line, f"unknown compendium command: {args[0]} {args[1]}"
                )

    def _check_pnpm(self, document: str, line: int, args: list[str]) -> None:
        scripts = self.root_scripts | self.website_scripts
        if args[0] in {"--filter", "-C"}:
            if len(args) < 3 or args[1] != "website":
                return
            scripts = self.website_scripts
            args = args[2:]
        command = args[0]
        if command == "run" and len(args) > 1 and not args[1].startswith("-"):
            if args[1] not in scripts:
                self._report(document, line, f"unknown pnpm script: {args[1]}")
        elif (
            command not in scripts
            and command not in _PNPM_BUILTINS
            and not command.startswith("-")
        ):
            self._report(document, line, f"unknown pnpm script: {command}")

    def _check_structure(self) -> None:
        catalogue = self.root / "mods/README.md"
        catalogue_links = (
            links(catalogue.read_text(encoding="utf-8")) if catalogue.exists() else []
        )
        catalogue_paths = {
            path.resolve()
            for link in catalogue_links
            if (path := self._link_path("mods/README.md", link.target)) is not None
        }
        projects = {
            posixpath.dirname(path)
            for path in self.tracked
            if path.startswith("mods/") and path.endswith(".csproj")
        }
        for project in sorted(projects):
            readme = self.root / project / "README.md"
            if not readme.is_file():
                self._report(
                    f"{project}/README.md", 1, "mod project is missing README.md"
                )
            if readme.resolve() not in catalogue_paths:
                self._report(
                    "mods/README.md", 1, f"missing mod README link: {project}/README.md"
                )
        front_page = self.root / "README.md"
        if not front_page.is_file():
            self._report("README.md", 1, "missing front page")
            return
        text = front_page.read_text(encoding="utf-8")
        count = visible_word_count(text)
        if count >= 1000:
            self._report(
                "README.md",
                1,
                f"front page has {count} visible words; budget is under 1000",
            )
        front_links = links(text)
        front_paths = {
            path.resolve()
            for link in front_links
            if (path := self._link_path("README.md", link.target)) is not None
        }
        for guide in ("CONTRIBUTING.md", "ARCHITECTURE.md"):
            if (self.root / guide).resolve() not in front_paths:
                self._report("README.md", 1, f"missing guide link: {guide}")
        downloads = {
            mod["project"]
            for mod in json.loads(
                (self.root / "website/mod-downloads.json").read_text(encoding="utf-8")
            )["mods"]
        }
        found: set[str] = set()
        for link in front_links:
            match = re.fullmatch(
                r"/mods/([^/]+)\.dll", unquote(urlsplit(link.target).path)
            )
            if match:
                found.add(match[1])
                if match[1] not in downloads:
                    self._report(
                        "README.md",
                        link.line,
                        f"unpublished mod download: {link.target}",
                    )
        for project in sorted(downloads - found):
            self._report("README.md", 1, f"missing published mod download: {project}")

    def check(self) -> list[Finding]:
        for document in self.documents:
            if not (self.root / document).is_file():
                self._report(document, 1, "tracked Markdown file is missing")
                continue
            text = (self.root / document).read_text(encoding="utf-8")
            for link in links(text):
                self._check_link(document, link)
            for example in code_examples(text):
                tokens = _tokens(example.text)
                self._check_paths(document, example.line, tokens)
                self._check_commands(document, example.line, tokens)
        self._check_structure()
        return sorted(self.findings)


def check(root: Path) -> list[Finding]:
    return Checker(root).check()
