"""Small promoted sessions for reader tests."""

import hashlib
import json
from pathlib import Path

SESSION_ID = "20261016T231500Z-1a2b3c4d"


def write_session(export_root: Path, files: dict[str, bytes] | None = None) -> Path:
    session_dir = export_root / "sessions" / SESSION_ID
    session_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, content in (files or {}).items():
        path = session_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        data = json.loads(content) if name.endswith(".json") else None
        entries.append(
            {
                "path": name,
                "exporter": "test",
                "bytes": len(content),
                "count": len(data) if isinstance(data, list) else 1 if data else None,
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        )
    (session_dir / "manifest.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "session_id": SESSION_ID,
                "started_at": "2026-10-16T23:15:00Z",
                "completed_at": "2026-10-16T23:16:00Z",
                "game_version": "0.9.35.0",
                "locale": "en",
                "steam_build_id": "123456",
                "files": entries,
            }
        ),
        encoding="utf-8",
    )
    (export_root / "active-session.json").write_text(
        json.dumps({"session_id": SESSION_ID, "path": f"sessions/{SESSION_ID}"}),
        encoding="utf-8",
    )
    return session_dir
