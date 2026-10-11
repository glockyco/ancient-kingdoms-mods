"""Markdown references and visible text, with source line numbers preserved."""

from __future__ import annotations

import html
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Link:
    target: str
    line: int


@dataclass(frozen=True)
class Code:
    text: str
    line: int


_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_INLINE_CODE = re.compile(r"(`+)(.+?)\1", re.DOTALL)
_DEFINITION = re.compile(r"^ {0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)", re.MULTILINE)
_HTML_TARGET = re.compile(
    r"\b(?:href|src)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", re.IGNORECASE
)


def _blank(match: re.Match[str]) -> str:
    return re.sub(r"[^\n]", " ", match.group())


def without_comments(text: str) -> str:
    return _COMMENT.sub(_blank, text)


def prose_and_shell(text: str) -> tuple[str, list[Code]]:
    """Mask fences, retaining only shell blocks as executable examples."""
    lines = without_comments(text).splitlines(keepends=True)
    prose: list[str] = []
    code: list[Code] = []
    fence = ""
    shell = False
    for number, line in enumerate(lines, 1):
        match = _FENCE.match(line)
        if not fence and match:
            fence = match[1]
            shell = match[2].strip().split(maxsplit=1)[0:1] in (
                ["sh"],
                ["bash"],
                ["shell"],
            )
            prose.append(re.sub(r"[^\n]", " ", line))
        elif fence:
            if (
                match
                and match[1][0] == fence[0]
                and len(match[1]) >= len(fence)
                and not match[2].strip()
            ):
                fence = ""
            elif shell:
                code.append(Code(line.rstrip("\n"), number))
            prose.append(re.sub(r"[^\n]", " ", line))
        else:
            prose.append(line)
    return "".join(prose), code


def code_examples(text: str) -> list[Code]:
    prose, code = prose_and_shell(text)
    code.extend(
        Code(match[2], prose.count("\n", 0, match.start()) + 1)
        for match in _INLINE_CODE.finditer(prose)
    )
    return sorted(code, key=lambda item: item.line)


def _closing(text: str, start: int, opening: str, closing: str) -> int | None:
    depth = 1
    index = start + 1
    while index < len(text):
        if text[index] == "\\":
            index += 2
            continue
        if text[index] == opening:
            depth += 1
        elif text[index] == closing:
            depth -= 1
            if not depth:
                return index
        index += 1
    return None


def _destination(text: str) -> str:
    text = text.strip()
    target = (
        text[1 : text.find(">")]
        if text.startswith("<")
        else text.split(maxsplit=1)[0]
        if text
        else ""
    )
    return html.unescape(re.sub(r"\\([\\()<>])", r"\1", target))


def links(text: str) -> list[Link]:
    prose, _ = prose_and_shell(text)
    prose = _INLINE_CODE.sub(_blank, prose)
    result = [
        Link(_destination(match[2]), prose.count("\n", 0, match.start()) + 1)
        for match in _DEFINITION.finditer(prose)
    ]
    definitions = {
        " ".join(match[1].lower().split()) for match in _DEFINITION.finditer(prose)
    }
    prose = _DEFINITION.sub(_blank, prose)
    index = 0
    while index < len(prose):
        if prose[index] == "\\":
            index += 2
            continue
        if prose[index] != "[":
            index += 1
            continue
        end = _closing(prose, index, "[", "]")
        if end is None:
            index += 1
            continue
        following = end + 1
        if following < len(prose) and prose[following] == "(":
            close = _closing(prose, following, "(", ")")
            if close is not None:
                result.append(
                    Link(
                        _destination(prose[following + 1 : close]),
                        prose.count("\n", 0, index) + 1,
                    )
                )
                index = close + 1
                continue
        elif following < len(prose) and prose[following] == "[":
            close = _closing(prose, following, "[", "]")
            if close is not None:
                label = prose[following + 1 : close] or prose[index + 1 : end]
                if " ".join(label.lower().split()) not in definitions:
                    result.append(
                        Link(
                            f"[undefined reference: {label}]",
                            prose.count("\n", 0, index) + 1,
                        )
                    )
                index = close + 1
                continue
        index = end + 1
    result.extend(
        Link(
            html.unescape(next(value for value in match.groups() if value is not None)),
            prose.count("\n", 0, match.start()) + 1,
        )
        for match in _HTML_TARGET.finditer(prose)
    )
    return sorted(result, key=lambda link: (link.line, link.target))


def _inline_text(text: str) -> str:
    rendered: list[str] = []
    index = 0
    while index < len(text):
        image = text[index : index + 2] == "!["
        opening = index + 1 if image else index
        if text[opening : opening + 1] == "[":
            end = _closing(text, opening, "[", "]")
            if end is not None:
                following = end + 1
                if text[following : following + 1] in {"(", "["}:
                    delimiter = text[following]
                    close = _closing(
                        text, following, delimiter, ")" if delimiter == "(" else "]"
                    )
                    if close is not None:
                        rendered.append("" if image else text[opening + 1 : end])
                        index = close + 1
                        continue
                if image:
                    index = end + 1
                    continue
        rendered.append(text[index])
        index += 1
    text = "".join(rendered)
    literals: list[str] = []

    def protect_code(match: re.Match[str]) -> str:
        literals.append(match[2])
        return f"\x00{len(literals) - 1}\x00"

    text = _INLINE_CODE.sub(protect_code, text)
    text = re.sub(r"(?<!\w)(_+)(.+?)\1(?!\w)", r"\2", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\\([!\"#$%&'()*+,\-./:;<=>?@\[\]^_`{|}~])", r"\1", text)
    text = html.unescape(text.replace("*", "").replace("~", ""))
    return re.sub(r"\x00(\d+)\x00", lambda match: literals[int(match[1])], text)


def heading_slugs(text: str) -> set[str]:
    prose, _ = prose_and_shell(text)
    lines = prose.splitlines()
    slugs: set[str] = set()
    for index, line in enumerate(lines):
        match = re.match(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        heading = match[1] if match else None
        if (
            heading is None
            and index + 1 < len(lines)
            and line.strip()
            and re.fullmatch(r" {0,3}(?:=+|-+)\s*", lines[index + 1])
        ):
            heading = line.strip()
        if heading is None:
            continue
        visible = _inline_text(heading).lower()
        slug = "".join(
            char for char in visible if char.isalnum() or char in "-_ "
        ).replace(" ", "-")
        candidate = slug
        suffix = 0
        while candidate in slugs:
            suffix += 1
            candidate = f"{slug}-{suffix}"
        slugs.add(candidate)
    return slugs


def visible_word_count(text: str) -> int:
    prose, _ = prose_and_shell(text)
    prose = _DEFINITION.sub("", prose)
    prose = _inline_text(prose)
    prose = re.sub(
        r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$",
        "",
        prose,
        flags=re.MULTILINE,
    )
    return sum(any(char.isalnum() for char in word) for word in prose.split())
